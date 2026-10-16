/**
 * Coze（扣子）API 客户端（ADR-023，封装收敛单模块 RISK-002）
 * 文档依据：wechat-clawbot/docs/coze-integration.md + Coze Open API v3
 * - chat：v3/chat（stream=true SSE 优先；轮询 retrieve + message/list 兜底）
 * - 错误码：4011 PAT 无效 / 4101 未发布 / 4102 bot_id 错 / 4013 权限不足
 * C-01：HTTP 走 http-client（超时/重试/统一 HttpError；不再用原生超时信号——验收 grep 双空之一）
 */
import { httpFetch } from "@/lib/http-client";

const DEFAULT_API_BASE = "https://api.coze.cn";

export type CozeConfig = {
  pat: string;
  botId: string;
  apiBase?: string;
  timeoutMs?: number;
  userId?: string;
};

export type CozeChatResult = { ok: boolean; reply: string; errMsg?: string; conversationId?: string; chatId?: string };

function headers(pat: string): Record<string, string> {
  return {
    Authorization: `Bearer ${pat}`,
    "Content-Type": "application/json",
  };
}

/**
 * 流式对话：返回 ReadableStream（文本增量），由网关注入 SSE。
 * 解析 v3/chat SSE：conversation.message.delta(type=answer) 为增量；completed 结束。
 */
export async function cozeChatStream(
  cfg: CozeConfig,
  messages: { role: "user" | "assistant"; content: string }[]
): Promise<ReadableStream<Uint8Array>> {
  const apiBase = cfg.apiBase || DEFAULT_API_BASE;
  const res = await httpFetch(`${apiBase}/v3/chat`, {
    method: "POST",
    headers: headers(cfg.pat),
    body: JSON.stringify({
      bot_id: cfg.botId,
      user_id: cfg.userId ?? "hd-website",
      stream: true,
      auto_save_history: true,
      additional_messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        content_type: "text",
      })),
    }),
    timeoutMs: cfg.timeoutMs ?? 60_000,
    logTag: "coze",
  });
  if (!res.body) {
    throw new Error("Coze 上游未返回响应体");
  }
  const encoder = new TextEncoder();
  let buf = "";
  const decoder = new TextDecoder();
  return res.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        // 跨块行缓冲（P1-4）：SSE 行可能被网络分块切断，只解析完整行，防丢字与多字节截断
        buf += decoder.decode(chunk, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[done]") continue;
          try {
            const evt = JSON.parse(payload) as {
              role?: string; type?: string; content?: string; code?: number; msg?: string;
            };
            // 业务错误（4101 token 失效等）以 HTTP 200 + 错误体返回 → 显式抛出，禁止吞成空流
            if (typeof evt.code === "number" && evt.code !== 0) {
              throw new Error("Coze " + evt.code + ": " + (evt.msg ?? "").slice(0, 160));
            }
            if (evt.type === "answer" && typeof evt.content === "string" && evt.content) {
              controller.enqueue(encoder.encode(evt.content));
            }
          } catch (err) {
            if (err instanceof Error && err.message.startsWith("Coze ")) throw err;
          }
        }
      },
      flush(controller) {
        if (buf.startsWith("data:")) {
          const payload = buf.slice(5).trim();
          if (payload && payload !== "[done]") {
            try {
              const evt = JSON.parse(payload) as { type?: string; content?: string };
              if (evt.type === "answer" && evt.content) controller.enqueue(encoder.encode(evt.content));
            } catch {
              /* 残余不完整行忽略 */
            }
          }
        }
      },
    })
  );
}

/** 非流式对话（测试端点/兜底）：create → poll retrieve → message list */
export async function cozeChat(cfg: CozeConfig, message: string): Promise<CozeChatResult> {
  const apiBase = cfg.apiBase || DEFAULT_API_BASE;
  const timeoutMs = cfg.timeoutMs ?? 60_000;
  const createRes = (await httpFetch(`${apiBase}/v3/chat`, {
    method: "POST",
    headers: headers(cfg.pat),
    body: JSON.stringify({
      bot_id: cfg.botId,
      user_id: cfg.userId ?? "hd-website",
      stream: false,
      auto_save_history: true,
      additional_messages: [{ role: "user", content: message, content_type: "text" }],
    }),
    timeoutMs,
    // 与原实现语义一致：业务错误以 200 + code 字段返回，由下方 code 检查处理（非 2xx 不抛）
    throwOnHttpError: false,
    logTag: "coze",
  }).then((r) => r.json())) as { code?: number; msg?: string; data?: { id: string; conversation_id: string; status: string } };

  if (createRes.code !== 0 || !createRes.data) {
    return { ok: false, reply: "", errMsg: `Coze ${createRes.code}: ${createRes.msg ?? "创建对话失败"}` };
  }
  const chatId = createRes.data.id;
  const conversationId = createRes.data.conversation_id;

  // 轮询至 completed（最长 timeoutMs）
  const deadline = Date.now() + timeoutMs;
  let status = createRes.data.status;
  while (status === "created" || status === "in_progress") {
    if (Date.now() > deadline) return { ok: false, reply: "", errMsg: "Coze 轮询超时", conversationId, chatId };
    await new Promise((r) => setTimeout(r, 1000));
    const retrieve = (await httpFetch(
      `${apiBase}/v3/chat/retrieve?chat_id=${chatId}&conversation_id=${conversationId}`,
      { headers: headers(cfg.pat), timeoutMs: 10_000, throwOnHttpError: false, logTag: "coze" }
    ).then((r) => r.json())) as { code?: number; data?: { status: string; last_error?: { msg?: string } } };
    if (retrieve.code !== 0 || !retrieve.data) {
      return { ok: false, reply: "", errMsg: `Coze retrieve ${retrieve.code}`, conversationId, chatId };
    }
    status = retrieve.data.status;
    if (status === "failed") {
      return { ok: false, reply: "", errMsg: `Coze 失败：${retrieve.data.last_error?.msg ?? "unknown"}`, conversationId, chatId };
    }
  }

  const list = (await httpFetch(
    `${apiBase}/v3/chat/message/list?chat_id=${chatId}&conversation_id=${conversationId}`,
    { headers: headers(cfg.pat), timeoutMs: 10_000, throwOnHttpError: false, logTag: "coze" }
  ).then((r) => r.json())) as { code?: number; data?: { role: string; type: string; content: string }[] };
  if (list.code !== 0 || !list.data) {
    return { ok: false, reply: "", errMsg: `Coze message/list ${list.code}`, conversationId, chatId };
  }
  const answer = list.data.find((m) => m.type === "answer" && m.role === "assistant");
  return { ok: true, reply: answer?.content ?? "", conversationId, chatId };
}
