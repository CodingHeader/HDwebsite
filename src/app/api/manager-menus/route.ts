import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { success, error, unauthorized } from "@/lib/api-response";

/**
 * 获取后台菜单树 API
 * GET /api/manager-menus
 *
 * 根据当前用户的权限返回可见的菜单
 * 需要认证
 */
export async function GET(request: NextRequest) {
  try {
    // 认证检查
    const authHeader = request.headers.get("authorization");
    const user = await requireAuth(authHeader);

    // 获取所有一级菜单
    const menus = await prisma.managerMenu.findMany({
      where: { level: 1, isVisible: true },
      orderBy: { sort: "asc" },
      include: {
        children: {
          where: { isVisible: true },
          orderBy: { sort: "asc" },
        },
      },
    });

    const normalizeMenuLabels = <T extends { code: string; label: string; children?: T[] }>(
      menuList: T[]
    ): T[] =>
      menuList.map((menu) => ({
        ...menu,
        label: menu.code === "campus" ? "学院风采" : menu.label,
        children: menu.children ? normalizeMenuLabels(menu.children) : menu.children,
      }));

    return NextResponse.json(success(normalizeMenuLabels(menus), "获取菜单成功"));
  } catch (err) {
    const message = err instanceof Error ? err.message : "获取菜单失败";
    return NextResponse.json(unauthorized(message), { status: 401 });
  }
}
