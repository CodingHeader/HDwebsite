import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error, unauthorized } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    await requireAuth(authHeader);

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        nickname: true,
        email: true,
        isActive: true,
        status: true,
        createdAt: true,
        role: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(success({ items: users }, "获取用户成功"));
  } catch (err) {
    const message = err instanceof Error ? err.message : "获取用户失败";
    return NextResponse.json(unauthorized(message), { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    await requireAuth(authHeader);

    const body = await request.json();
    const { username, nickname, email, password, roleId, isActive } = body;

    if (!username || !password) {
      return NextResponse.json(error("用户名和密码不能为空"), { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return NextResponse.json(error("用户名已存在"), { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        nickname: nickname || null,
        email: email || null,
        passwordHash,
        roleId: roleId ? parseInt(roleId) : 1,
        isActive: isActive !== false,
        status: isActive !== false ? "active" : "inactive",
      },
      select: {
        id: true,
        username: true,
        nickname: true,
        email: true,
        isActive: true,
        status: true,
        createdAt: true,
        role: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(success(user, "创建用户成功"));
  } catch (err) {
    const message = err instanceof Error ? err.message : "创建用户失败";
    return NextResponse.json(error(message), { status: 500 });
  }
}
