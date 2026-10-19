/**
 * C-07：SSE 帧构造与解析（消费契约 `src/contracts/chat.ts` 的 `chatSseEventSchema`）。
 *
 * - `sseFrame(event, data)`：构造单帧 `event: <name>\ndata: <JSON>\n\n`（路由内联 sse() 的等价实现，收敛到此）。
 * - `parseSseFrame(frame)`：解析单帧（去 `event:`/`data:` 前缀）→ `chatSseEventSchema` 校验；
 *   未知事件 / 非法 JSON / 载荷不匹配一律返回 `null`（不抛错），供 ChatWidget 消费。
 * - `reduceSseError(prev, next)`：同一流内可能出现两条 `error` 事件（route.ts 的 catch 与 finally 都可能发），
 *   保留第一条（更具体的中断原因），避免前端展示两条重复提示。
 */
import { chatSseEventSchema, type ChatSseEvent } from "@/contracts/chat";

const encoder = new TextEncoder();

/** 构造 SSE 单帧（`event: <name>\ndata: <JSON>\n\n`） */
export function sseFrame(event: ChatSseEvent["event"], data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

/**
 * 解析单帧为契约事件；非法帧返回 null。
 * - 无 `event:` 或 `data:` 行 → null
 * - JSON 解析失败 → null
 * - 事件名或载荷不满足契约 → null
 */
export function parseSseFrame(frame: string): ChatSseEvent | null {
  const lines = frame.split("\n");
  const eventLine = lines.find((l) => l.startsWith("event:"));
  const dataLine = lines.find((l) => l.startsWith("data:"));
  if (!eventLine || !dataLine) return null;
  const event = eventLine.slice(6).trim();
  const raw = dataLine.slice(5).trim();
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = chatSseEventSchema.safeParse({ event, data: payload });
  return parsed.success ? parsed.data : null;
}

/** 同一流内多条 error 的合并：保留第一条（更具体），空值跳过 */
export function reduceSseError(prev: string | null, next: string | null): string | null {
  if (prev) return prev;
  return next || null;
}