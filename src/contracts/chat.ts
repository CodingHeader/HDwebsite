/**
 * 契约：AI 对话 SSE（POST `/api/chat/stream`，公开 + IP 限频）
 * 来源：`parallel-w1/02-契约冻结包.md` §W0-05 目标形态；**从 `src/app/api/chat/stream/route.ts:11-15` 原样迁入**
 * （字段与文案不变），路由改由 C-07 引用本文件。
 *
 * 线格式：`event: <name>\ndata: <JSON>\n\n`（`route.ts` 的 sse() 编码器）。
 * 失败语义：**流开始前**的失败（限频 429、无模型 502、额度 503）仍返回 JSON 信封（`{code,data,message}`），
 * 不走 SSE；流中途失败才发 `event: error`。
 */
import { z } from "zod";

/** SSE 事件名全集（判别联合的判别键取值） */
export const CHAT_SSE_EVENTS = ["meta", "delta", "done", "error"] as const;

/** POST `/api/chat/stream` 请求体（字数上限与文案与路由现状逐字一致） */
export const chatRequestSchema = z.object({
  sessionId: z.string().min(8).max(64),
  sceneCode: z.string().max(50).default("float"),
  message: z.string().min(1, "消息不能为空").max(2000),
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;

/** SSE 事件载荷（判别联合；`meta` → `delta`* → `done`，异常时 `error`） */
export const chatSseEventSchema = z.discriminatedUnion("event", [
  z.object({
    event: z.literal("meta"),
    data: z.object({
      scene: z.object({ code: z.string(), name: z.string() }),
      greeting: z.string().nullable().optional(),
      provider: z.string().nullable().optional(),
    }),
  }),
  z.object({ event: z.literal("delta"), data: z.object({ text: z.string() }) }),
  z.object({ event: z.literal("done"), data: z.object({ conversationId: z.string() }) }),
  z.object({ event: z.literal("error"), data: z.object({ message: z.string() }) }),
]);
export type ChatSseEvent = z.infer<typeof chatSseEventSchema>;
