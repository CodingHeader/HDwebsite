/**
 * llm-gateway（SOL-003）：多供应商路由/降级/用量统计单点
 * 路由：[场景指定模型] → isDefault → 失败按 priority 升序遍历 active → 全败 → isFallback 必试
 * P06：按场景选模型——ChatScene.llmProviderId 作为 preferredProviderId 置顶（停用则忽略，仍按默认路由降级）
 * kind：openai（OpenAI 兼容 /chat/completions）| coze（v3/chat，ADR-023）
 * 统计：LLMUsage(date+providerId 唯一) upsert；失败计数；余额人工填报（ADR-005）
 */
import { prisma } from "@/lib/prisma";
import { getAllSettings as getSettings } from "@/lib/settings"; // P06：须含非公开键（collect*/llm*/publish* 均 isPublic=false）
import { decryptField } from "@/lib/crypto";
import { cozeChatStream, cozeChat } from "@/lib/coze";
import type { LLMProvider } from ".prisma/client";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type GatewayResult = {
  ok: boolean;
  reply: string;
  providerId?: number;
  providerName?: string;
  errMsg?: string;
  tokensUsed?: number;
};

const FAILURE_CIRCUIT = 3;

async function resolveKey(provider: LLMProvider): Promise<string> {
  if (provider.isEncrypted && provider.apiKey.startsWith("v1:")) {
    return decryptField(provider.apiKey) ?? "";
  }
  return provider.apiKey;
}

/** 活跃供应商：default 优先，其余按 priority 升序，fallback 殿后 */
export type RouteOptions = { preferredProviderId?: number | null };

export async function getRoutedProviders(opts: RouteOptions = {}): Promise<LLMProvider[]> {
  const rows = await prisma.lLMProvider.findMany({ where: { status: "active" }, orderBy: [{ priority: "asc" }, { id: "asc" }] });
  return orderProviders(rows, opts.preferredProviderId);
}

/** 纯函数（导出供单测）：场景指定 → default → priority 升序 → fallback 殿后 */
export function orderProviders<T extends { id: number; isDefault: boolean; isFallback: boolean }>(rows: T[], preferredId?: number | null): T[] {
  const preferred = preferredId ? rows.filter((r) => r.id === preferredId) : [];
  const others = rows.filter((r) => r.id !== preferredId);
  const byDefault = others.filter((r) => r.isDefault);
  const byFallback = others.filter((r) => r.isFallback && !r.isDefault);
  const rest = others.filter((r) => !r.isDefault && !r.isFallback);
  return [...preferred, ...byDefault, ...rest, ...byFallback];
}

async function recordUsage(providerId: number, tokensIn: number, tokensOut: number, failure: boolean): Promise<void> {
  const date = new Date().toISOString().slice(0, 10);
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
  const date = new Date().toISOString().slice(0, 10);
  const row = await prisma.lLMUsage.findUnique({
    where: { date_providerId: { date, providerId } },
    select: { failures: true },
  }).catch(() => null);
  return row?.failures ?? 0;
}

async function callOpenAI(provider: LLMProvider, apiKey: string, messages: ChatMessage[], stream: false, timeoutMs: number): Promise<GatewayResult["reply"]> {
  const endpoint = provider.endpoint.replace(/\/+$/, "");
  const res = await fetch(`${endpoint}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: provider.model,
      messages,
      temperature: provider.temperature,
      max_tokens: provider.maxTokens,
      stream: false,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`上游 ${res.status}：${text.slice(0, 200)}`);
  }
  const body = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  await recordUsage(provider.id, body.usage?.prompt_tokens ?? 0, body.usage?.completion_tokens ?? 0, false);
  return body.choices?.[0]?.message?.content ?? "";
}

async function callCoze(provider: LLMProvider, apiKey: string, messages: ChatMessage[], timeoutMs: number): Promise<GatewayResult> {
  const settings = await getSettings();
  const last = messages.filter((m) => m.role === "user").slice(-1)[0];
  const result = await cozeChat(
    {
      pat: apiKey,
      botId: provider.botId ?? (await parseBotIdFromEndpoint(provider)),
      apiBase: provider.endpoint,
      timeoutMs,
      userId: "hd-" + hashUserId(String(provider.id)),
    },
    last?.content ?? ""
  );
  if (result.ok) {
    await recordUsage(provider.id, 0, 0, false);
    return { ok: true, reply: result.reply, providerId: provider.id, providerName: provider.name };
  }
  throw new Error(result.errMsg ?? "Coze 调用失败");
}

async function parseBotIdFromEndpoint(provider: LLMProvider): Promise<string> {
  throw new Error(`供应商「${provider.name}」为 Coze 类型但未配置 bot_id`);
}

function hashUserId(seed: string): string {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h).toString(36);
}

/**
 * 非流式对话（测试端点/内部调用）
 */
export async function gatewayChat(messages: ChatMessage[], opts: RouteOptions = {}): Promise<GatewayResult> {
  const providers = await getRoutedProviders(opts);
  if (providers.length === 0) {
    return { ok: false, reply: "", errMsg: "尚未配置可用的 AI 模型供应商" };
  }
  const settings = await getSettings();
  const timeoutMs = Number(settings.llmTimeoutMs || 30000);
  const errors: string[] = [];

  for (const provider of providers) {
    // 熔断：当日连续失败 ≥3 次的供应商跳过
    if ((await failureCount(provider.id)) >= FAILURE_CIRCUIT && !provider.isFallback) {
      errors.push(`${provider.name}: 今日失败次数达熔断阈值，已跳过`);
      continue;
    }
    try {
      const apiKey = await resolveKey(provider);
      if (!apiKey) throw new Error("API Key 解密失败");
      if (provider.kind === "coze") {
        return await callCoze(provider, apiKey, messages, timeoutMs);
      }
      const reply = await callOpenAI(provider, apiKey, messages, false, timeoutMs);
      return { ok: true, reply, providerId: provider.id, providerName: provider.name };
    } catch (err) {
      await recordUsage(provider.id, 0, 0, true);
      errors.push(`${provider.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return { ok: false, reply: "", errMsg: errors.join("；") || "全部供应商调用失败" };
}

/**
 * 流式对话：按路由逐个尝试，返回首个成功供应商的文本增量流。
 * 上层（SSE 路由）负责把 Uint8Array 增量转为事件帧。
 */
export async function gatewayChatStream(
  messages: ChatMessage[],
  opts: RouteOptions = {}
): Promise<{ ok: true; stream: ReadableStream<Uint8Array>; providerId: number; providerName: string } | { ok: false; errMsg: string }> {
  const providers = await getRoutedProviders(opts);
  if (providers.length === 0) {
    return { ok: false, errMsg: "尚未配置可用的 AI 模型供应商" };
  }
  const settings = await getSettings();
  const timeoutMs = Number(settings.llmTimeoutMs || 30000);
  const errors: string[] = [];

  for (const provider of providers) {
    if ((await failureCount(provider.id)) >= FAILURE_CIRCUIT && !provider.isFallback) {
      errors.push(`${provider.name}: 熔断跳过`);
      continue;
    }
    try {
      const apiKey = await resolveKey(provider);
      if (!apiKey) throw new Error("API Key 解密失败");
      let stream: ReadableStream<Uint8Array>;
      if (provider.kind === "coze") {
        stream = await cozeChatStream(
          { pat: apiKey, botId: provider.botId ?? "", apiBase: provider.endpoint, timeoutMs, userId: "hd-" + hashUserId(String(provider.id)) },
          messages.filter((m): m is { role: "user" | "assistant"; content: string } => m.role !== "system")
        );
      } else {
        stream = await openAIStream(provider, apiKey, messages, timeoutMs);
      }
      await recordUsage(provider.id, 0, 0, false);
      return { ok: true, stream, providerId: provider.id, providerName: provider.name };
    } catch (err) {
      await recordUsage(provider.id, 0, 0, true);
      errors.push(`${provider.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return { ok: false, errMsg: errors.join("；") || "全部供应商调用失败" };
}

function openAIStream(provider: LLMProvider, apiKey: string, messages: ChatMessage[], timeoutMs: number): Promise<ReadableStream<Uint8Array>> {
  return (async () => {
    const endpoint = provider.endpoint.replace(/\/+$/, "");
    const res = await fetch(`${endpoint}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: provider.model,
        messages,
        temperature: provider.temperature,
        max_tokens: provider.maxTokens,
        stream: true,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "");
      throw new Error(`上游 ${res.status}：${text.slice(0, 200)}`);
    }
    const encoder = new TextEncoder();
    let buf = "";
    const decoder = new TextDecoder();
    return res.body.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          // 跨块行缓冲（P1-4）：只解析完整 SSE 行，防丢字与多字节截断
          buf += decoder.decode(chunk, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const evt = JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] };
              const delta = evt.choices?.[0]?.delta?.content;
              if (delta) controller.enqueue(encoder.encode(delta));
            } catch {
              /* 非法行忽略 */
            }
          }
        },
      })
    );
  })();
}
