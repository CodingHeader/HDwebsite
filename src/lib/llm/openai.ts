/**
 * OpenAI 兼容适配器（C-01）：/chat/completions 非流式 + SSE 流式。
 * - HTTP 走 http-client（超时/重试/统一 HttpError；不再用原生超时信号——验收 grep 双空之一）
 * - SSE 解析的跨块行缓冲（P1-4）随实现整体搬入，行为不变
 */
import { httpFetch } from "@/lib/http-client";
import type { LLMProvider } from ".prisma/client";
import type { AdapterChatResult, ChatMessage, LLMProviderAdapter } from "./types";

export const openaiAdapter: LLMProviderAdapter = {
  kind: "openai",

  async chat(provider: LLMProvider, apiKey: string, messages: ChatMessage[], timeoutMs: number): Promise<AdapterChatResult> {
    const endpoint = provider.endpoint.replace(/\/+$/, "");
    // http-client：超时由 timeoutMs 控制、非 2xx 抛 HttpError（含 bodyText 前 2000 字符）
    const res = await httpFetch(`${endpoint}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: provider.model,
        messages,
        temperature: provider.temperature,
        max_tokens: provider.maxTokens,
        stream: false,
      }),
      timeoutMs,
      logTag: "llm-openai",
    });
    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    return {
      reply: body.choices?.[0]?.message?.content ?? "",
      tokensIn: body.usage?.prompt_tokens ?? 0,
      tokensOut: body.usage?.completion_tokens ?? 0,
    };
  },

  async stream(provider: LLMProvider, apiKey: string, messages: ChatMessage[], timeoutMs: number): Promise<ReadableStream<Uint8Array>> {
    const endpoint = provider.endpoint.replace(/\/+$/, "");
    const res = await httpFetch(`${endpoint}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: provider.model,
        messages,
        temperature: provider.temperature,
        max_tokens: provider.maxTokens,
        stream: true,
      }),
      timeoutMs,
      logTag: "llm-openai",
    });
    if (!res.body) throw new Error("上游未返回响应体");
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
  },
};
