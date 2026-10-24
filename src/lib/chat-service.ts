/**
 * chat-service（P06）：AI 客服的唯一装配点——官网 SSE（/api/chat/stream）与公众号（wechat.ts）共用
 * 场景装配（ChatScene：systemPrompt / knowledgeTags / useKnowledgeBase / baseIds / providerIds /
 * llmProviderId / temperature / maxTokens / topP）
 * + 知识检索（C-05 本地加权轨 searchLocalWeighted 支持 baseIds 库过滤；P12 起可叠加 Coze）
 * + 历史裁剪（≤40 条 / 4000 字，TN-012）
 * + 网关调用（llm-gateway，场景 providerIds 逐个尝试 → llmProviderId 置顶 → 默认 → priority → fallback）
 * 重试去重：同一会话末尾若是"同一问题且无回答"（上次失败），不重复写入问题、也不把它放进历史
 *
 * C-07（ADR-029 §1.1 扩展）：
 * - `parseIdListField`：baseIds/providerIds 字段的兼容解析（JSON 数组串 "[1,2]" 与旧逗号文本 "1,2" 都能解析）
 * - `preferredProviderIds` 加入 ChatContext（K12：非空优先于 llmProviderId）
 * - `AdapterOverrides`（temperature/maxTokens/topP）加入 ChatContext 并透传给网关
 *
 * C-10（WPC.4 AI 客服风控）：
 * - `checkChatGuard` 在调用模型之前统一检查：黑名单 / 敏感词 / 按用户限频
 * - `chatOnce` 命中敏感词直接返回 `GUARD_FALLBACK_REPLY`，**不调用 llm-gateway**
 * - `buildChatContext` 额外返回 `guard`，官网 SSE 在发起流式之前据此决定 429 或正常收尾
 */
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { gatewayChat, type AdapterOverrides, type ChatMessage } from "@/lib/llm-gateway";
import { formatKbContext } from "@/lib/kb-adapter";
import { searchLocalWeighted } from "@/lib/kb/local";
import { checkChatGuard, GUARD_FALLBACK_REPLY } from "@/lib/llm/guard";
import type { ChatScene } from ".prisma/client";

export const DEFAULT_SYSTEM_PROMPT = "你是弘道教育的客服助手，礼貌、专业、合规，不承诺保过。";
export const HISTORY_TAKE = 40;
export const HISTORY_BUDGET = 4000;

export type ChatChannel = "website" | "wechat";

/** C-10：guard 结果（官网 SSE 据此决定 429 / 兜底 / 正常；公众号 chatOnce 内部处理） */
export type ChatGuardOutcome =
  | { kind: "ok" }
  | { kind: "rate" }
  | { kind: "sensitive"; matched: string }
  | { kind: "blacklist" };

export type ChatContext = {
  scene: ChatScene | null;
  messages: ChatMessage[];
  /** C-07：场景 providerIds（逐个尝试序；空 = 走全局路由） */
  preferredProviderIds: number[];
  /** 兼容旧字段：场景 llmProviderId（单数） */
  preferredProviderId: number | null;
  /** C-07：场景级参数覆盖（temperature/maxTokens/topP） */
  overrides: AdapterOverrides;
  /** 本轮问题是否为上次失败问题的重试（已在历史中，不需再写入） */
  isRetry: boolean;
  /** C-10：风控结果 */
  guard: ChatGuardOutcome;
};

/**
 * C-07：ID 列表字段解析（baseIds/providerIds 均采用此规则）。
 * 兼容三种输入：JSON 数组串 "[1,2]"、旧逗号文本 "1,2"（以及旧 seed 的中文逗号）、已是数组对象。
 * 非法值安全回落 []（不抛错，避免整次请求失败）。
 */
export function parseIdListField(raw: unknown): number[] {
  if (Array.isArray(raw)) return raw.map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0);
  if (typeof raw !== "string" || !raw.trim()) return [];
  const s = raw.trim();
  if (s.startsWith("[")) {
    try {
      const arr = JSON.parse(s);
      if (Array.isArray(arr)) return arr.map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0);
    } catch {
      /* 非法 JSON 回落逗号分隔 */
    }
  }
  return s
    .split(/[,，]/)
    .map((v) => Number(v.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}

export async function findScene(where: { code?: string; id?: number | null }): Promise<ChatScene | null> {
  if (where.id) return prisma.chatScene.findFirst({ where: { id: where.id, status: "active" } });
  if (where.code) return prisma.chatScene.findFirst({ where: { code: where.code, status: "active" } });
  return null;
}

/** 历史裁剪：取最近 40 条，按 4000 字预算从新到旧保留 */
export async function loadHistory(sessionId: string): Promise<{ history: ChatMessage[]; lastUnanswered: string | null }> {
  const rows = await prisma.aIChatHistory.findMany({ where: { sessionId }, orderBy: { id: "desc" }, take: HISTORY_TAKE });
  const chronological = rows.reverse().filter((h) => h.role === "user" || h.role === "assistant");
  // 末尾"用户消息后无有效回答"= 上次失败
  let lastUnanswered: string | null = null;
  for (let i = chronological.length - 1; i >= 0; i--) {
    const h = chronological[i];
    if (h.role === "assistant") {
      if (h.message.trim()) break;
      continue;
    }
    lastUnanswered = h.message;
    break;
  }
  const out: ChatMessage[] = [];
  let budget = HISTORY_BUDGET;
  for (let i = chronological.length - 1; i >= 0; i--) {
    const h = chronological[i];
    if (h.role === "assistant" && !h.message.trim()) continue;
    const content = h.message.slice(0, Math.max(0, budget));
    if (!content) break;
    budget -= content.length;
    out.unshift({ role: h.role as "user" | "assistant", content });
  }
  return { history: out, lastUnanswered };
}

export async function buildKbContext(scene: ChatScene | null, query: string): Promise<string> {
  if (scene && !scene.useKnowledgeBase) return "";
  const tags = scene?.knowledgeTags?.split(/[,，]/).map((t) => t.trim()).filter(Boolean);
  // C-07：本地检索轨切换为 C-05 加权算法（searchLocalWeighted），支持 baseIds 库过滤
  const hits = await searchLocalWeighted(query, { tags: tags?.length ? tags : undefined, baseIds: parseIdListField(scene?.baseIds) });
  return formatKbContext(hits);
}

export function buildSystemPrompt(scene: ChatScene | null, kbContext: string): string {
  return [scene?.systemPrompt || DEFAULT_SYSTEM_PROMPT, kbContext ? `以下是可参考的知识库内容：\n${kbContext}` : ""]
    .filter(Boolean)
    .join("\n\n");
}

/** 组装网关消息：system（场景提示词 + 知识）→ 历史 → 本轮问题 */
export async function buildChatContext(input: {
  scene: ChatScene | null;
  sessionId: string;
  message: string;
  /** C-10：风控用户标识（官网默认 sessionId；公众号传 openId） */
  identifier?: string;
}): Promise<ChatContext> {
  const { history, lastUnanswered } = await loadHistory(input.sessionId);
  const isRetry = lastUnanswered !== null && lastUnanswered === input.message;
  let hist = history;
  if (isRetry) {
    // 去掉历史末尾的那条未回答问题（下面作为本轮问题再放一次）
    const idx = hist.map((h) => h.role).lastIndexOf("user");
    if (idx >= 0 && hist[idx].content === input.message) hist = [...hist.slice(0, idx), ...hist.slice(idx + 1)];
  }
  // C-10：风控（黑名单 → 敏感词 → 限频）。identifier 缺省回落 sessionId（官网口径）。
  const guardRaw = await checkChatGuard({
    sceneCode: input.scene?.code ?? null,
    identifier: input.identifier ?? input.sessionId,
    message: input.message,
  });
  const guard: ChatGuardOutcome =
    guardRaw.type === "ok"
      ? { kind: "ok" }
      : guardRaw.type === "rate"
        ? { kind: "rate" }
        : guardRaw.type === "sensitive"
          ? { kind: "sensitive", matched: guardRaw.matched }
          : { kind: "blacklist" };
  const kb = await buildKbContext(input.scene, input.message);
  // C-07：providerIds（K12，非空优先） > llmProviderId > 全局路由。
  // 归一：若 providerIds 非空取之；否则回落到 llmProviderId（若为空则两者皆空 → 全局路由）
  const sceneProviderIds = parseIdListField(input.scene?.providerIds);
  const sceneLlmProviderId = input.scene?.llmProviderId ?? null;
  // K12：providerIds 非空优先；为空回落 llmProviderId（保持旧字段 preferredProviderId 语义，B 线测试依赖）
  const preferredProviderIds = sceneProviderIds;
  return {
    scene: input.scene,
    messages: [{ role: "system", content: buildSystemPrompt(input.scene, kb) }, ...hist, { role: "user", content: input.message }],
    preferredProviderIds,
    // 旧字段：providerIds 非空时为 null（网关改读数组）；为空时仍是 llmProviderId
    preferredProviderId: preferredProviderIds.length ? null : sceneLlmProviderId,
    overrides: {
      temperature: input.scene?.temperature ?? null,
      maxTokens: input.scene?.maxTokens ?? null,
      topP: input.scene?.topP ?? null,
    },
    isRetry,
    guard,
  };
}

export async function recordMessage(data: {
  sessionId: string;
  channel: ChatChannel;
  role: "user" | "assistant";
  message: string;
  model?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  pageUrl?: string | null;
  metadata?: string | null;
}): Promise<void> {
  await prisma.aIChatHistory.create({ data }).catch((err) => console.error("[chat-service] 记录会话失败：", err));
}

/** 非流式一问一答（公众号）：装配 → 风控 → 记录问题 → 网关 → 记录回答 */
export async function chatOnce(input: {
  scene: ChatScene | null;
  sessionId: string;
  channel: ChatChannel;
  message: string;
  /** C-10：风控用户标识（缺省回落 sessionId） */
  identifier?: string;
}): Promise<{ ok: true; reply: string; providerName?: string; guarded?: boolean } | { ok: false; errMsg: string }> {
  const ctx = await buildChatContext(input);
  if (!ctx.isRetry) await recordMessage({ sessionId: input.sessionId, channel: input.channel, role: "user", message: input.message });

  // C-10：命中敏感词 → 固定兜底回复，不调用模型（验收：llm-gateway 调用次数为 0）
  if (ctx.guard.kind === "sensitive") {
    await recordMessage({
      sessionId: input.sessionId,
      channel: input.channel,
      role: "assistant",
      message: GUARD_FALLBACK_REPLY,
      model: "guard",
      metadata: JSON.stringify({ guard: "sensitive", matched: ctx.guard.matched }),
    });
    return { ok: true, reply: GUARD_FALLBACK_REPLY, providerName: "guard", guarded: true };
  }

  // C-10：黑名单 / 限频 → 不调用模型（wechat.ts 会走 wechatFallbackReply 兜底文案）
  if (ctx.guard.kind === "blacklist" || ctx.guard.kind === "rate") {
    await recordMessage({
      sessionId: input.sessionId,
      channel: input.channel,
      role: "assistant",
      message: "",
      model: "guard",
      metadata: JSON.stringify({ guard: ctx.guard.kind }),
    }).catch(() => undefined);
    return { ok: false, errMsg: ctx.guard.kind === "blacklist" ? "当前会话已被拒绝，请联系招生老师" : "咨询过于频繁，请稍后再试" };
  }

  // C-07：providerIds 逐个尝试 + 场景级参数覆盖（与官网 SSE 走同一装配点 → 两渠道 messages 全等）
  const result = await gatewayChat(ctx.messages, {
    preferredProviderId: ctx.preferredProviderId,
    preferredProviderIds: ctx.preferredProviderIds,
    overrides: ctx.overrides,
  });
  await recordMessage({
    sessionId: input.sessionId,
    channel: input.channel,
    role: "assistant",
    message: result.ok ? result.reply : "",
    model: result.providerName ?? "gateway",
    metadata: result.ok ? null : JSON.stringify({ error: result.errMsg }),
  });
  return result.ok ? { ok: true, reply: result.reply, providerName: result.providerName } : { ok: false, errMsg: result.errMsg ?? "AI 服务不可用" };
}

/* ── V11-SEC-04：官网会话服务端签发与校验 ─────────────────────────
 * 缺陷：stream 路由裸信 body.sessionId（loadHistory 直接按其查询），任何人
 * 提交他人 sessionId 即可读/写其会话历史。修复：会话由服务端签发
 * （GET /api/chat/session → httpOnly 签名 cookie），stream 只认有效签名；
 * body.sessionId 与 cookie 不一致即 400（防会话劫持）。公众号通道（openId）
 * 不走 cookie，由调用方显式传 identifier，不受影响。 */

const CHAT_SESSION_COOKIE = "chat_sid";

function chatSecret(): string {
  const s = process.env.JWT_SECRET ?? "";
  if (!s) throw new Error("JWT_SECRET 未配置，无法签发会话");
  return s;
}

/** 签发：`<id>.<hmac-sha256(id, secret)>` */
export function signChatSession(id: string): string {
  const sig = crypto.createHmac("sha256", chatSecret()).update(id).digest("base64url");
  return `${id}.${sig}`;
}

/** 校验并取出会话 id；无效返回 null */
export function verifyChatSession(cookieValue: string | undefined | null): string | null {
  if (!cookieValue) return null;
  const dot = cookieValue.lastIndexOf(".");
  if (dot <= 0) return null;
  const id = cookieValue.slice(0, dot);
  const sig = cookieValue.slice(dot + 1);
  const expect = crypto.createHmac("sha256", chatSecret()).update(id).digest("base64url");
  if (sig.length !== expect.length) return null;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
  } catch {
    return null;
  }
  return id;
}

export function readChatSessionCookie(request: Request): string | undefined {
  const raw = request.headers.get("cookie") ?? "";
  for (const part of raw.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === CHAT_SESSION_COOKIE) return rest.join("=");
  }
  return undefined;
}

export function chatSessionCookieHeader(id: string): string {
  return `${CHAT_SESSION_COOKIE}=${signChatSession(id)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`;
}

export function newChatSessionId(): string {
  return crypto.randomUUID();
}
