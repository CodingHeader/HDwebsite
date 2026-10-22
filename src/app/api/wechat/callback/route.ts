/**
 * 微信公众号服务器回调（GET 验证 / POST 消息分发）
 * V8-T-04：迁入 withApi（统一异常映射）。
 * 本路由返回**微信要求的原始文本/XML**（不是 JSON 信封），故 handler 直接 return Response；
 * withApi 只负责包装与未捕获异常兜底。签名校验仍在本 handler 内完成（403 语义不变）。
 */
import { prisma } from "@/lib/prisma";
import { handleCallback, verifySignature } from "@/lib/wechat";
import { withApi } from "@/lib/api-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/wechat/callback：微信服务器 URL 验证（echostr） */
export const GET = withApi(
  async ({ request }) => {
    const url = new URL(request.url);
    const signature = url.searchParams.get("signature") ?? "";
    const timestamp = url.searchParams.get("timestamp") ?? "";
    const nonce = url.searchParams.get("nonce") ?? "";
    const echostr = url.searchParams.get("echostr") ?? "";
    const account = await prisma.wechatAccount.findFirst({ where: { status: "active" } });
    const token = account?.verifyToken || process.env.WECHAT_MP_VERIFY_TOKEN;
    if (!token) return new Response("token 未配置", { status: 500 });
    if (verifySignature(token, signature, timestamp, nonce)) {
      return new Response(echostr);
    }
    return new Response("签名校验失败", { status: 403 });
  },
  { errorMessage: "微信验证失败", route: "wechat/callback/GET" }
);

/** POST /api/wechat/callback：消息/事件分发（被动回复 + 异步客服补发） */
export const POST = withApi(
  async ({ request }) => {
    const url = new URL(request.url);
    const signature = url.searchParams.get("signature") ?? "";
    const timestamp = url.searchParams.get("timestamp") ?? "";
    const nonce = url.searchParams.get("nonce") ?? "";
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
  },
  { errorMessage: "微信消息处理失败", route: "wechat/callback/POST" }
);
