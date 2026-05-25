import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error, unauthorized } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization");
    await requireAuth(authHeader);

    const { id } = await params;
    const userId = parseInt(id);
    const body = await request.json();
    const { username, nickname, email, password, roleId, isActive } = body;

    const updateData: Record<string, unknown> = {
      username,
      nickname: nickname || null,
      email: email || null,
      roleId: roleId ? parseInt(roleId) : undefined,
      isActive: isActive !== undefined ? isActive : undefined,
      status: isActive !== undefined ? (isActive ? "active" : "inactive") : undefined,
    };

    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
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

    return NextResponse.json(success(user, "更新用户成功"));
  } catch (err) {
    const message = err instanceof Error ? err.message : "更新用户失败";
    return NextResponse.json(error(message), { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization");
    await requireAuth(authHeader);

    const { id } = await params;
    const userId = parseInt(id);

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json(success(null, "删除用户成功"));
  } catch (err) {
    const message = err instanceof Error ? err.message : "删除用户失败";
    return NextResponse.json(error(message), { status: 500 });
  }
}
