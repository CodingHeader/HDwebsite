import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword, generateToken } from "@/lib/auth";
import { success, error } from "@/lib/api-response";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(1, "用户名不能为空"),
  password: z.string().min(6, "密码至少6位"),
});

/**
 * 用户登录 API
 * POST /api/auth/login
 *
 * 请求体: { username: string, password: string }
 * 响应: { code: 200, data: { token, user }, message: "登录成功" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(error(result.error.issues[0].message), { status: 400 });
    }

    const { username, password } = result.data;

    // 查询用户（包含角色信息）
    const user = await prisma.user.findUnique({
      where: { username },
      include: { role: true },
    });

    // 验证用户存在
    if (!user) {
      return NextResponse.json(error("用户名不存在"), { status: 401 });
    }

    // 验证密码正确
    if (!comparePassword(password, user.passwordHash)) {
      return NextResponse.json(error("密码错误"), { status: 401 });
    }

    // 检查用户状态
    if (!user.isActive || user.status !== "active") {
      return NextResponse.json(error("账户已被禁用，请联系管理员"), { status: 403 });
    }

    // 生成JWT Token
    const token = generateToken({
      userId: user.id,
      username: user.username,
      roleId: user.role.id,
      roleName: user.role.name,
    });

    // 更新登录记录
    const ipAddress = request.headers.get("x-forwarded-for") ||
                      request.headers.get("x-real-ip") ||
                      "unknown";
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
        loginCount: { increment: 1 },
      },
    });

    // 记录操作日志
    await prisma.operationLog.create({
      data: {
        userId: user.id,
        username: user.username,
        module: "auth",
        action: "login",
        title: `用户 "${user.username}" 登录成功`,
        ipAddress: ipAddress as string,
        userAgent: request.headers.get("user-agent") || "unknown",
      },
    });

    return NextResponse.json(
      success({
        token,
        user: {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          email: user.email,
          role: {
            id: user.role.id,
            name: user.role.name,
            slug: user.role.slug,
            permissions: JSON.parse(user.role.permissions || "[]"),
            isSuper: user.role.isSuper,
          },
        },
      }, "登录成功")
    );
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(error("登录失败，请稍后重试"), { status: 500 });
  }
}
