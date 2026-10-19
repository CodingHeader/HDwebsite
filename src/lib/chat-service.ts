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
 */
import { prisma } from "@/lib/prisma";
import { gatewayChat, type AdapterOverrides, type ChatMessage } from "@/lib/llm-gateway";
import { formatKbContext } from "@/lib/kb-adapter";
import { searchLocalWeighted } from "@/lib/kb/local";
import type { ChatScene } from ".prisma/client";

export const DEFAULT_SYSTEM_PROMPT = "你是弘道教育的客服助手，礼貌、专业、合规，不承诺保过。";
const HISTORY_TAKE = 40;
const HISTORY_BUDGET = 4000;

export type ChatChannel = "website" | "wechat";

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
export async function buildChatContext(input: { scene: ChatScene | null; sessionId: string; message: string }): Promise<ChatContext> {
  const { history, lastUnanswered } = await loadHistory(input.sessionId);
  const isRetry = lastUnanswered !== null && lastUnanswered === input.message;
  let hist = history;
  if (isRetry) {
    // 去掉历史末尾的那条未回答问题（下面作为本轮问题再放一次）
    const idx = hist.map((h) => h.role).lastIndexOf("user");
    if (idx >= 0 && hist[idx].content === input.message) hist = [...hist.slice(0, idx), ...hist.slice(idx + 1)];
  }
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

/** 非流式一问一答（公众号）：装配 → 记录问题 → 网关 → 记录回答 */
export async function chatOnce(input: {
  scene: ChatScene | null;
  sessionId: string;
  channel: ChatChannel;
  message: string;
}): Promise<{ ok: true; reply: string; providerName?: string } | { ok: false; errMsg: string }> {
  const ctx = await buildChatContext(input);
  if (!ctx.isRetry) await recordMessage({ sessionId: input.sessionId, channel: input.channel, role: "user", message: input.message });
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
