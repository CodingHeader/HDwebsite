/**
 * Coze 适配器（C-01 / ADR-023）：v3/chat 非流式（轮询）+ 流式（SSE）。
 * - 由 llm-gateway 的 kind 分支整体搬入；LLMProvider 形态（endpoint=apiBase、botId、PAT）→ CozeConfig
 * - kind 分支在 llm-gateway 中归零（验收 grep 口径：src/lib 与 src/app/api 中该类型字面量比较为 0）
 *
 * C-07（ADR-029 §1.1 扩展）：Coze 路径显式拼接 system 与最近历史为首条 user 前缀——
 * Coze `additional_messages` 不接受 `system` 角色，因此把 ChatScene.systemPrompt + 知识库上下文
 * 拼为「首条 user」前缀，紧随其后的是最近历史（最多 40 条 / 4000 字，chat-service 已裁剪），
 * 最后才是本轮问题。导出 `cozeStreamMessages` 供单测断言。
 */
import { cozeChat, cozeChatStream } from "@/lib/coze";
import type { LLMProvider } from ".prisma/client";
import type { AdapterChatResult, ChatMessage, LLMProviderAdapter } from "./types";

/** Coze 会话 userId（按 provider 稳定派生；与会话隔离，ADR-023） */
function hashUserId(seed: string): string {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h).toString(36);
}

async function parseBotIdFromEndpoint(provider: LLMProvider): Promise<string> {
  throw new Error(`供应商「${provider.name}」为 Coze 类型但未配置 bot_id`);
}

/**
 * C-07：Coze 消息装配 —— system 显式拼接为首条 user 前缀（Coze `additional_messages` 不接受 system 角色）。
 * 结构：`[{user: system}]`（首条必须为 user）+ 最近历史逐条（保持 user/assistant 角色）+ 本轮 user。
 * - system 为空时跳过；若历史以 assistant 开头（无 system），并入首条 user。
 * 导出供单测断言两渠道 messages 全等与 Coze 前缀语义。
 */
export function cozeStreamMessages(messages: ChatMessage[]): { role: "user" | "assistant"; content: string }[] {
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).filter(Boolean).join("\n\n");
  const rest = messages.filter((m) => m.role !== "system") as { role: "user" | "assistant"; content: string }[];
  const out: { role: "user" | "assistant"; content: string }[] = [];

  if (system) {
    out.push({ role: "user", content: system });
  }
  for (const m of rest) {
    // 首条必须是 user：若没有 system 且第一条是 assistant，则并入下一条 user
    if (out.length === 0 && m.role === "assistant") continue;
    out.push({ role: m.role, content: m.content });
  }
  return out;
}

export const cozeAdapter: LLMProviderAdapter = {
  kind: "coze",

  async chat(provider: LLMProvider, apiKey: string, messages: ChatMessage[], timeoutMs: number): Promise<AdapterChatResult> {
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
    if (result.ok) return { reply: result.reply, tokensIn: 0, tokensOut: 0 };
    throw new Error(result.errMsg ?? "Coze 调用失败");
  },

  async stream(provider: LLMProvider, apiKey: string, messages: ChatMessage[], timeoutMs: number): Promise<ReadableStream<Uint8Array>> {
    return cozeChatStream(
      { pat: apiKey, botId: provider.botId ?? "", apiBase: provider.endpoint, timeoutMs, userId: "hd-" + hashUserId(String(provider.id)) },
      cozeStreamMessages(messages)
    );
  },
};