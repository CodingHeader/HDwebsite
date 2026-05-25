import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { success, error, unauthorized } from "@/lib/api-response";

/**
 * 获取当前登录用户信息 API
 * GET /api/auth/me
 *
 * 请求头: Authorization: Bearer <token>
 * 响应: { code: 200, data: user, message: "获取成功" }
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const user = await requireAuth(authHeader);

    return NextResponse.json(
      success({
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        email: user.email,
        role: user.role,
      }, "获取成功")
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Token无效或已过期";
    return NextResponse.json(unauthorized(message), { status: 401 });
  }
}
