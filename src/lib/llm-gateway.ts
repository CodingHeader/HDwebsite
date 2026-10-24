/**
 * llm-gateway（SOL-003）：多供应商路由/降级/用量统计单点
 * 路由：[场景指定模型] → isDefault → 失败按 priority 升序遍历 active → 全败 → isFallback 必试
 * P06：按场景选模型——ChatScene.llmProviderId 作为 preferredProviderId 置顶（停用则忽略，仍按默认路由降级）
 * C-01：按 kind 的调用细节全部收敛到适配器注册表（./llm/registry）；本文件只保留路由/熔断/统计，
 *       供应商类型字面量比较归零（新增供应商类型只需实现 LLMProviderAdapter 并注册）。
 * 统计：LLMUsage(date+providerId 唯一) upsert；失败计数；余额人工填报（ADR-005）
 * V11-LLM-01：流式超时改「空闲超时」语义（相邻 chunk 间），总时长上限另设防挂死；
 * V11-LLM-02：流式 usage 从流尾帧取值，成功用量只在流读完时记一次（重试/失败不双计）
 */
import { prisma } from "@/lib/prisma";
import { getAllSettings } from "@/lib/settings"; // P06：须含非公开键（collect*/llm*/publish* 均 isPublic=false）；C-01：去 as 别名（B-01 语义单一化）
import { decryptField } from "@/lib/crypto";
import { isRateLimited, recordRateCall, usageDate } from "./llm/limits";
import type { LLMProvider } from ".prisma/client";
import type { ChatMessage } from "./llm/types";
import { getAdapter } from "./llm/registry";

export type { ChatMessage };
export { usageDate } from "./llm/limits";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type GatewayResult = {
  ok: boolean;
  reply: string;
  providerId?: number;
  providerName?: string;
  errMsg?: string;
  tokensUsed?: number;
  /** C-09：失败时区分 502（上游失败/未配置）与 503（全部超配额/限频） */
  status?: 502 | 503;
};

const FAILURE_CIRCUIT = 3;

/* ── V11-LLM-01：流式超时改为「空闲超时」语义 ─────────────────────────
 * 原缺陷：流式路径把 llmTimeoutMs（默认 30s）直接传给适配器的 httpFetch，
 * 其 AbortSignal 在整次请求（含响应体流）计时——长回复只要总时长 >30s 就被整流截断。
 * 修复：适配器侧只保留「总时长上限」作为硬截止（防挂死），相邻 chunk 间的空闲
 * 超时由网关包装层（withStreamTimeouts）判定——chunks 持续到达则不截断。
 * 估算口径（写入证据）：空闲下限取 30s（思考型模型 chunk 间隔可到分钟级，更激进
 * 的空闲阈值有误杀风险）；总上限 5 分钟为防挂死兜底，与空闲阈值独立。 */
/** 流式空闲超时下限：相邻 chunk 间隔超过 max(llmTimeoutMs, 30s) 即切断 */
export const STREAM_IDLE_TIMEOUT_MS = 30_000;
/** 流式总时长上限（自适配器建连起）：超过即硬性切断，防整流挂死 */
export const STREAM_TOTAL_TIMEOUT_MS = 300_000;

/** V11-LLM-02：流式 usage 尾帧收集器（适配器解析到 usage 帧时回填） */
export type StreamUsageCollector = { tokensIn: number; tokensOut: number; seen: boolean };

/**
 * V11-LLM-01：把上游文本增量流包装为「空闲超时 + 总时长上限」语义（ pull 驱动，保留背压）。
 * - 相邻 chunk 间隔 > idleMs → 取消上游并抛错（真挂死连接被空闲超时切断）
 * - 总时长（自包装起）> totalMs → 抛错（防挂死兜底）
 * - chunks 持续到达时无论多久都不截断（长回复完整送达）
 * V11-LLM-02：流自然读完（done）时 await onComplete——网关据此一次性记录成功 usage；
 * 中途出错/被取消不回调（失败由上层 recordGatewayFailure 记，不双计）。
 */
export function withStreamTimeouts(
  source: ReadableStream<Uint8Array>,
  opts: { idleMs: number; totalMs: number; onComplete?: () => void | Promise<void> }
): ReadableStream<Uint8Array> {
  const reader = source.getReader();
  const startedAt = Date.now();
  const idleMs = Math.max(1, opts.idleMs);
  const totalMs = Math.max(idleMs, opts.totalMs);
  let settled = false;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const remainingMs = totalMs - (Date.now() - startedAt);
      if (remainingMs <= 0) {
        settled = true;
        await reader.cancel("流式总时长超限").catch(() => undefined);
        controller.error(new Error(`流式总时长超过上限（${Math.round(totalMs / 1000)}s）`));
        return;
      }
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const chunk = await new Promise<ReadableStreamReadResult<Uint8Array>>((resolve, reject) => {
          // 空闲计时：只在等待下一 chunk 期间生效；chunk 到达即清零（last-chunk 空闲语义）。
          // 剩余总时长不足一个空闲周期时，定时到点报「总时长超限」而非「空闲超时」（语义归因正确）
          const waitMs = Math.min(idleMs, remainingMs);
          const isTotalDeadline = waitMs < idleMs;
          timer = setTimeout(
            () =>
              reject(
                new Error(
                  isTotalDeadline
                    ? `流式总时长超过上限（${Math.round(totalMs / 1000)}s）`
                    : `流式空闲超时：${idleMs}ms 内无新数据，连接已切断`
                )
              ),
            waitMs
          );
          reader.read().then(resolve, reject);
        });
        if (chunk.done) {
          settled = true;
          await opts.onComplete?.();
          controller.close();
          return;
        }
        controller.enqueue(chunk.value);
      } catch (err) {
        if (!settled) {
          settled = true;
          await reader.cancel(err instanceof Error ? err : new Error(String(err))).catch(() => undefined);
        }
        controller.error(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (timer) clearTimeout(timer);
      }
    },
    async cancel(reason) {
      // 消费方中途放弃（如客户端断开）：取消上游，不回调 onComplete
      if (!settled) {
        settled = true;
        await reader.cancel(reason).catch(() => undefined);
      }
    },
  });
}

async function resolveKey(provider: LLMProvider): Promise<string> {
  if (provider.isEncrypted && provider.apiKey.startsWith("v1:")) {
    return decryptField(provider.apiKey) ?? "";
  }
  return provider.apiKey;
}

/**
 * 活跃供应商：default 优先，其余按 priority 升序，fallback 殿后
 * C-07：preferredProviderIds（场景 providerIds，K12 语义 = 逐个尝试的优先级序列）
 * 与旧的 preferredProviderId（场景 llmProviderId）兼容——单元素等价。
 */
export type AdapterOverrides = { temperature?: number | null; maxTokens?: number | null; topP?: number | null };
export type RouteOptions = {
  preferredProviderId?: number | null;
  /** C-07：非空优先于 preferredProviderId；数组序 = 逐个尝试序（B 失败回落 A） */
  preferredProviderIds?: number[] | null;
  /** C-07：场景级参数覆盖（空字段回落到供应商默认值） */
  overrides?: AdapterOverrides;
};

export async function getRoutedProviders(opts: RouteOptions = {}): Promise<LLMProvider[]> {
  const rows = await prisma.lLMProvider.findMany({ where: { status: "active" }, orderBy: [{ priority: "asc" }, { id: "asc" }] });
  // 空数组视为未指定 → 回落旧字段 preferredProviderId
  const preferred = opts.preferredProviderIds?.length ? opts.preferredProviderIds : opts.preferredProviderId;
  return orderProviders(rows, preferred);
}

/** 纯函数（导出供单测）：[场景序] → default → priority 升序 → fallback 殿后
 * C-07：接受数组（providerIds）或单数（llmProviderId）；无效 id 忽略；重复 id 保序去重 */
export function orderProviders<T extends { id: number; isDefault: boolean; isFallback: boolean }>(
  rows: T[],
  preferred?: number | number[] | null
): T[] {
  const ids = Array.isArray(preferred) ? preferred : preferred ? [preferred] : [];
  const uniq = [...new Set(ids)];
  const byId = new Map(rows.map((r) => [r.id, r]));
  // 保持 ids 声明顺序（K12：逐个尝试的优先级序列）
  const pre = uniq.map((id) => byId.get(id)).filter((r): r is T => !!r);
  const preIds = new Set(pre.map((r) => r.id));
  const others = rows.filter((r) => !preIds.has(r.id));
  const byDefault = others.filter((r) => r.isDefault);
  const byFallback = others.filter((r) => r.isFallback && !r.isDefault);
  const rest = others.filter((r) => !r.isDefault && !r.isFallback);
  return [...pre, ...byDefault, ...rest, ...byFallback];
}

async function recordUsage(providerId: number, tokensIn: number, tokensOut: number, failure: boolean): Promise<void> {
  // C-09：日界统一为 Asia/Shanghai（原为 UTC，ADR-029 §2 D4）
  const date = usageDate();
  const data: any = { calls: { increment: 1 }, tokensIn: { increment: tokensIn }, tokensOut: { increment: tokensOut } };
  if (failure) data.failures = { increment: 1 };
  await prisma.lLMUsage.upsert({
    where: { date_providerId: { date, providerId } },
    update: data,
    create: { date, providerId, calls: 1, tokensIn, tokensOut, failures: failure ? 1 : 0 },
  }).catch(() => undefined);
}

/** 流式路径中途失败时的失败计数（供路由层调用） */
export async function recordGatewayFailure(providerId: number): Promise<void> {
  await recordUsage(providerId, 0, 0, true);
}

async function failureCount(providerId: number): Promise<number> {
  const date = usageDate();
  const row = await prisma.lLMUsage.findUnique({
    where: { date_providerId: { date, providerId } },
    select: { failures: true },
  }).catch(() => null);
  return row?.failures ?? 0;
}

/** C-09：当日调用量（calls）；查不到 → 0 */
async function dailyCalls(providerId: number): Promise<number> {
  const row = await prisma.lLMUsage.findUnique({
    where: { date_providerId: { date: usageDate(), providerId } },
    select: { calls: true },
  }).catch(() => null);
  return row?.calls ?? 0;
}

/**
 * C-09：配额/限频闸门。
 * 返回 reason 时该供应商本轮被跳过（不记失败、不计费）；null = 放行。
 * - dailyQuota：当日 calls ≥ dailyQuota（DB 口径，跨进程一致）
 * - rateLimit：进程内 60 秒滑动窗口 ≥ rateLimit
 */
async function quotaSkipReason(provider: LLMProvider): Promise<string | null> {
  const quota = provider.dailyQuota ?? 0;
  if (quota > 0 && (await dailyCalls(provider.id)) >= quota) {
    return `${provider.name}: 当日调用量已达上限（${quota} 次），今日跳过`;
  }
  const limit = provider.rateLimit ?? 0;
  if (limit > 0 && isRateLimited(provider.id, limit)) {
    return `${provider.name}: 调用频率超限（${limit} 次/分钟），请稍后再试`;
  }
  return null;
}

/**
 * 非流式对话（测试端点/内部调用）
 * C-09：配额/限频在调度前检查；全部超限 → status 503（由路由映射 HTTP 503）
 */
export async function gatewayChat(messages: ChatMessage[], opts: RouteOptions = {}): Promise<GatewayResult> {
  const providers = await getRoutedProviders(opts);
  if (providers.length === 0) {
    return { ok: false, reply: "", errMsg: "尚未配置可用的 AI 模型供应商", status: 502 };
  }
  const settings = await getAllSettings();
  const timeoutMs = Number(settings.llmTimeoutMs || 30000);
  const errors: string[] = [];
  // C-09：区分 503（全部超配额/限频，未真正尝试任何供应商）与 502（存在真实上游失败）
  let attemptedAny = false;

  for (const provider of providers) {
    // C-09：配额/限频闸门（跳过不记失败、不计费）
    const quotaReason = await quotaSkipReason(provider);
    if (quotaReason) {
      errors.push(quotaReason);
      continue;
    }
    // 熔断：当日连续失败 ≥3 次的供应商跳过（先判熔断，被熔断跳过的供应商不占滑窗名额）
    if ((await failureCount(provider.id)) >= FAILURE_CIRCUIT && !provider.isFallback) {
      errors.push(`${provider.name}: 今日失败次数达熔断阈值，已跳过`);
      continue;
    }
    // 放行才记入滑窗（真正要尝试的供应商）
    recordRateCall(provider.id);
    attemptedAny = true;
    try {
      const apiKey = await resolveKey(provider);
      if (!apiKey) throw new Error("API Key 解密失败");
      // C-01：按 kind 的调用细节收敛到适配器注册表（本文件无类型分支）
      const adapter = getAdapter(provider.kind);
      // C-07：场景级参数覆盖（temperature/maxTokens/topP）透传适配器
      const r = await adapter.chat(provider, apiKey, messages, timeoutMs, opts.overrides);
      await recordUsage(provider.id, r.tokensIn, r.tokensOut, false);
      return { ok: true, reply: r.reply, providerId: provider.id, providerName: provider.name };
    } catch (err) {
      await recordUsage(provider.id, 0, 0, true);
      errors.push(`${provider.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  // C-09：全部超配额/限频（未真正尝试任何供应商）→ 503；否则（有真实上游失败）→ 502
  const status: 502 | 503 = attemptedAny ? 502 : 503;
  return { ok: false, reply: "", errMsg: errors.join("；") || "全部供应商调用失败", status };
}

/**
 * 流式对话：按路由逐个尝试，返回首个成功供应商的文本增量流。
 * 上层（SSE 路由）负责把 Uint8Array 增量转为事件帧。
 * C-09：配额/限频在调度前检查；全部超限 → status 503
 * V11-LLM-01：流式超时改空闲语义——适配器 timeout 取「总时长上限」（原先整流 30s
 * AbortSignal 会把 >30s 的长回复截断）；相邻 chunk 间空闲超时由 withStreamTimeouts 判定。
 * V11-LLM-02：usage 从流尾帧取值（适配器 onUsage 回填）；成功用量延迟到流自然读完时
 * 一次性记录（原先流启动即记 calls，流中途失败会与 recordGatewayFailure 双计）。
 */
export async function gatewayChatStream(
  messages: ChatMessage[],
  opts: RouteOptions = {}
): Promise<
  | { ok: true; stream: ReadableStream<Uint8Array>; providerId: number; providerName: string }
  | { ok: false; errMsg: string; status?: 502 | 503 }
> {
  const providers = await getRoutedProviders(opts);
  if (providers.length === 0) {
    return { ok: false, errMsg: "尚未配置可用的 AI 模型供应商", status: 502 };
  }
  const settings = await getAllSettings();
  const timeoutMs = Number(settings.llmTimeoutMs || 30000);
  // V11-LLM-01：空闲超时 = max(llmTimeoutMs, 30s)——管理员配得更长则顺延，配得更短也不低于
  // 30s 安全下限（思考型模型 chunk 间隔长，过激空闲阈值会误杀）；总上限为固定防挂死兜底
  const idleMs = Math.max(Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 0, STREAM_IDLE_TIMEOUT_MS);
  const totalMs = STREAM_TOTAL_TIMEOUT_MS;
  const errors: string[] = [];
  // C-09：区分 503（全部超配额/限频）与 502（存在真实上游失败）
  let attemptedAny = false;

  for (const provider of providers) {
    // C-09：配额/限频闸门（跳过不记失败、不计费）
    const quotaReason = await quotaSkipReason(provider);
    if (quotaReason) {
      errors.push(quotaReason);
      continue;
    }
    // 熔断：当日连续失败 ≥3 次的供应商跳过（先判熔断，被熔断跳过的供应商不占滑窗名额）
    if ((await failureCount(provider.id)) >= FAILURE_CIRCUIT && !provider.isFallback) {
      errors.push(`${provider.name}: 今日失败次数达熔断阈值，已跳过`);
      continue;
    }
    // 放行才记入滑窗（真正要尝试的供应商）
    recordRateCall(provider.id);
    attemptedAny = true;
    try {
      const apiKey = await resolveKey(provider);
      if (!apiKey) throw new Error("API Key 解密失败");
      // C-01：按 kind 的调用细节收敛到适配器注册表（本文件无类型分支）
      // C-07：场景级参数覆盖透传；V11-LLM-02：usage 尾帧收集器（无 usage 帧则保持 0，不虚构估算）
      const usage: StreamUsageCollector = { tokensIn: 0, tokensOut: 0, seen: false };
      const stream = await getAdapter(provider.kind).stream(provider, apiKey, messages, totalMs, opts.overrides, (u) => {
        usage.seen = true;
        usage.tokensIn = u.tokensIn;
        usage.tokensOut = u.tokensOut;
      });
      // V11-LLM-02：成功用量只在流自然读完时记一次（重试/中途失败路径不记成功、不双计）
      return {
        ok: true,
        stream: withStreamTimeouts(stream, {
          idleMs,
          totalMs,
          onComplete: () => recordUsage(provider.id, usage.tokensIn, usage.tokensOut, false),
        }),
        providerId: provider.id,
        providerName: provider.name,
      };
    } catch (err) {
      await recordUsage(provider.id, 0, 0, true);
      errors.push(`${provider.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  const status: 502 | 503 = attemptedAny ? 502 : 503;
  return { ok: false, errMsg: errors.join("；") || "全部供应商调用失败", status };
}
