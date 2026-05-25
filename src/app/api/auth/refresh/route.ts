import { NextRequest, NextResponse } from "next/server";
import { verifyToken, generateToken, getCurrentUser } from "@/lib/auth";
import { success, error, unauthorized } from "@/lib/api-response";

/**
 * Token刷新 API
 * POST /api/auth/refresh
 *
 * 请求头: Authorization: Bearer <old_token>
 * 响应: { code: 200, data: { token, user }, message: "刷新成功" }
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const oldToken = authHeader?.replace("Bearer ", "");

    if (!oldToken) {
      return NextResponse.json(unauthorized("未提供Token"), { status: 401 });
    }

    // 验证旧Token
    const payload = verifyToken(oldToken);
    if (!payload) {
      return NextResponse.json(unauthorized("Token无效或已过期"), { status: 401 });
    }

    // 获取用户最新信息
    const user = await getCurrentUser(oldToken);
    if (!user) {
      return NextResponse.json(unauthorized("用户不存在或已被禁用"), { status: 401 });
    }

    // 生成新Token
    const newToken = generateToken({
      userId: user.id,
      username: user.username,
      roleId: user.role.id,
      roleName: user.role.name,
    });

    return NextResponse.json(
      success({
        token: newToken,
        user: {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          email: user.email,
          role: user.role,
        },
      }, "Token刷新成功")
    );
  } catch (err) {
    console.error("Token refresh error:", err);
    return NextResponse.json(error("Token刷新失败"), { status: 500 });
  }
}
