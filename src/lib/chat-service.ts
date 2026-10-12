/**
 * chat-service（P06）：AI 客服的唯一装配点——官网 SSE（/api/chat/stream）与公众号（wechat.ts）共用
 * 场景装配（ChatScene：systemPrompt / knowledgeTags / useKnowledgeBase / llmProviderId）
 * + 知识检索（本地兜底轨 searchLocal；P12 起可叠加 Coze）
 * + 历史裁剪（≤40 条 / 4000 字，TN-012）
 * + 网关调用（llm-gateway，场景模型置顶 → 默认 → priority → fallback）
 * 重试去重：同一会话末尾若是"同一问题且无回答"（上次失败），不重复写入问题、也不把它放进历史
 */
import { prisma } from "@/lib/prisma";
import { gatewayChat, type ChatMessage } from "@/lib/llm-gateway";
import { formatKbContext, searchLocal } from "@/lib/kb-adapter";
import type { ChatScene } from ".prisma/client";

export const DEFAULT_SYSTEM_PROMPT = "你是弘道教育的客服助手，礼貌、专业、合规，不承诺保过。";
const HISTORY_TAKE = 40;
const HISTORY_BUDGET = 4000;

export type ChatChannel = "website" | "wechat";

export type ChatContext = {
  scene: ChatScene | null;
  messages: ChatMessage[];
  preferredProviderId: number | null;
  /** 本轮问题是否为上次失败问题的重试（已在历史中，不需再写入） */
  isRetry: boolean;
};

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
  return formatKbContext(await searchLocal(query, { tags }));
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
  return {
    scene: input.scene,
    messages: [{ role: "system", content: buildSystemPrompt(input.scene, kb) }, ...hist, { role: "user", content: input.message }],
    preferredProviderId: input.scene?.llmProviderId ?? null,
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
  const result = await gatewayChat(ctx.messages, { preferredProviderId: ctx.preferredProviderId });
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
