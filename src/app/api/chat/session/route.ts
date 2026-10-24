/**
 * GET /api/chat/session：签发官网客服会话（V11-SEC-04）。
 *
 * 会话 id 服务端生成（UUID）+ HMAC 签名写入 httpOnly cookie；
 * 客户端同时拿到明文 id 用于展示/重试。stream 路由只认有效签名，
 * body.sessionId 与 cookie 不一致即拒绝——裸信 sessionId 的会话劫持面关闭。
 */
import { NextResponse } from "next/server";
import { success } from "@/lib/api-response";
import { chatSessionCookieHeader, newChatSessionId } from "@/lib/chat-service";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const sessionId = newChatSessionId();
  const res = NextResponse.json(success({ sessionId }, "会话已签发"));
  res.headers.set("Set-Cookie", chatSessionCookieHeader(sessionId));
  return res;
}
