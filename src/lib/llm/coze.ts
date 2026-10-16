/**
 * Coze 适配器（C-01 / ADR-023）：v3/chat 非流式（轮询）+ 流式（SSE）。
 * - 由 llm-gateway 的 kind 分支整体搬入；LLMProvider 形态（endpoint=apiBase、botId、PAT）→ CozeConfig
 * - kind 分支在 llm-gateway 中归零（验收 grep 口径：src/lib 与 src/app/api 中该类型字面量比较为 0）
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
      messages.filter((m): m is { role: "user" | "assistant"; content: string } => m.role !== "system")
    );
  },
};
