/**
 * GET /api/chat/session：签发官网客服会话（V11-SEC-04；V12-E2E-01 幂等化）。
 *
 * 会话 id 服务端生成（UUID）+ HMAC 签名写入 httpOnly cookie；
 * 客户端同时拿到明文 id 用于展示/重试。stream 路由只认有效签名，
 * body.sessionId 与 cookie 不一致即拒绝——裸信 sessionId 的会话劫持面关闭。
 *
 * V12-E2E-01 幂等签发：请求已带有效签名 cookie → 复用该 sessionId
 * （响应 200，不覆盖 cookie）；仅无有效 cookie 才签发新 id。
 * 从根上消灭多签发源竞态（ApplyClient + ChatWidget 并发 GET 同键覆盖）。
 */
import { success } from "@/lib/api-response";
import { chatSessionCookieHeader, newChatSessionId, readChatSessionCookie, verifyChatSession } from "@/lib/chat-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  // 幂等：已有有效签名 cookie → 复用 sessionId，不覆盖 cookie
  const cookieSession = verifyChatSession(readChatSessionCookie(request));
  if (cookieSession) {
    return success({ sessionId: cookieSession }, "会话已存在");
  }
  // 无有效 cookie → 签发新会话
  const sessionId = newChatSessionId();
  const res = success({ sessionId }, "会话已签发");
  res.headers.set("Set-Cookie", chatSessionCookieHeader(sessionId));
  return res;
}
