import { prisma } from "@/lib/prisma";
import { handleCallback, verifySignature } from "@/lib/wechat";
import { getSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/wechat/callback：微信服务器 URL 验证（echostr） */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const signature = url.searchParams.get("signature") ?? "";
  const timestamp = url.searchParams.get("timestamp") ?? "";
  const nonce = url.searchParams.get("nonce") ?? "";
  const echostr = url.searchParams.get("echostr") ?? "";
  const settings = await getSettings();
  const account = await prisma.wechatAccount.findFirst({ where: { status: "active" } });
  const token = account?.verifyToken || process.env.WECHAT_MP_VERIFY_TOKEN;
  if (!token) return new Response("token 未配置", { status: 500 });
  if (verifySignature(token, signature, timestamp, nonce)) {
    return new Response(echostr);
  }
  return new Response("签名校验失败", { status: 403 });
}

/** POST /api/wechat/callback：消息/事件分发（被动回复 + 异步客服补发） */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const signature = url.searchParams.get("signature") ?? "";
  const timestamp = url.searchParams.get("timestamp") ?? "";
  const nonce = url.searchParams.get("nonce") ?? "";
  const settings = await getSettings();
  const account = await prisma.wechatAccount.findFirst({ where: { status: "active", type: "service" } });
  const token = account?.verifyToken || process.env.WECHAT_MP_VERIFY_TOKEN;
  if (!token || !verifySignature(token, signature, timestamp, nonce)) {
    return new Response("签名校验失败", { status: 403 });
  }
  const body = await request.text();
  if (account) {
    const reply = await handleCallback(account, body);
    if (reply) {
      return new Response(reply, { headers: { "Content-Type": "application/xml" } });
    }
  }
  return new Response("success");
}
