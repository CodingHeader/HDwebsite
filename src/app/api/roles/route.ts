import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error, unauthorized } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    await requireAuth(authHeader);

    const roles = await prisma.role.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { users: true } },
      },
    });

    const formattedRoles = roles.map((role: { id: number; name: string; slug: string; description: string | null; permissions: string; isSuper: boolean; status: string; createdAt: Date; _count: { users: number } }) => ({
      id: role.id,
      name: role.name,
      slug: role.slug,
      description: role.description,
      permissions: role.permissions,
      isSuper: role.isSuper,
      status: role.status,
      userCount: role._count.users,
      createdAt: role.createdAt.toISOString(),
    }));

    return NextResponse.json(success({ items: formattedRoles }, "获取角色成功"));
  } catch (err) {
    const message = err instanceof Error ? err.message : "获取角色失败";
    return NextResponse.json(unauthorized(message), { status: 401 });
  }
}
