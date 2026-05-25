import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { success, error, unauthorized } from "@/lib/api-response";

/**
 * 用户登出 API
 * POST /api/auth/logout
 *
 * 请求头: Authorization: Bearer <token>
 * 响应: { code: 200, message: "登出成功" }
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const user = await requireAuth(authHeader);

    // 记录登出日志
    const ipAddress = request.headers.get("x-forwarded-for") ||
                      request.headers.get("x-real-ip") ||
                      "unknown";

    await prisma.operationLog.create({
      data: {
        userId: user.id,
        username: user.username,
        module: "auth",
        action: "logout",
        title: `用户 "${user.username}" 登出成功`,
        ipAddress: ipAddress as string,
        userAgent: request.headers.get("user-agent") || "unknown",
      },
    });

    // 注：JWT是无状态的，服务器端无法真正"销毁"Token
    // 客户端需要自行删除存储的Token
    // 可以在这里实现Token黑名单机制（如果需要）

    return NextResponse.json(success(null, "登出成功"));
  } catch (err) {
    const message = err instanceof Error ? err.message : "登出失败";
    return NextResponse.json(unauthorized(message), { status: 401 });
  }
}
