import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error, unauthorized, forbidden } from "@/lib/api-response";
import { z } from "zod";
import { requireAuth, requirePermission } from "@/lib/auth";

// 移除未使用变量警告
const _useUser = (user: unknown) => user;

// 导航更新验证Schema
const navigationUpdateSchema = z.object({
  name: z.string().min(1, "菜单名称不能为空").optional(),
  slug: z.string().min(1, "URL标识不能为空").optional(),
  parentId: z.number().nullable().optional(),
  level: z.number().optional(),
  icon: z.string().optional(),
  link: z.string().optional(),
  linkType: z.enum(["internal", "external", "dropdown"]).optional(),
  target: z.enum(["_self", "_blank"]).optional(),
  templateId: z.number().nullable().optional(),
  categoryId: z.number().nullable().optional(),
  contentType: z.string().optional(),
  sort: z.number().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  isVisible: z.boolean().optional(),
  isNav: z.boolean().optional(),
  seoTitle: z.string().optional(),
  seoKeywords: z.string().optional(),
  seoDescription: z.string().optional(),
});

/**
 * 获取导航详情 API
 * GET /api/navigations/:id
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const navigationId = parseInt(id);

    if (isNaN(navigationId)) {
      return NextResponse.json(error("无效的导航ID"), { status: 400 });
    }

    const navigation = await prisma.navigation.findUnique({
      where: { id: navigationId },
      include: {
        template: { select: { id: true, code: true, name: true } },
        category: { select: { id: true, name: true, slug: true } },
        parent: { select: { id: true, name: true, slug: true } },
        children: {
          include: {
            template: { select: { id: true, code: true, name: true } },
            category: { select: { id: true, name: true, slug: true } },
          },
          orderBy: { sort: "asc" },
        },
      },
    });

    if (!navigation) {
      return NextResponse.json(error("导航不存在"), { status: 404 });
    }

    return NextResponse.json(success(navigation, "获取导航详情成功"));
  } catch (err) {
    console.error("Get navigation error:", err);
    return NextResponse.json(error("获取导航详情失败"), { status: 500 });
  }
}

/**
 * 更新导航 API
 * PUT /api/navigations/:id
 *
 * 需要权限: navigation:update
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 鉴权检查
    const authHeader = request.headers.get("authorization");
    let user;
    try {
      user = await requireAuth(authHeader);
    } catch {
      return NextResponse.json(unauthorized("未登录或登录已过期"), { status: 401 });
    }

    // 权限检查
    try {
      await requirePermission(authHeader, "navigation:update");
    } catch {
      return NextResponse.json(forbidden("权限不足：需要 navigation:update 权限"), { status: 403 });
    }

    // 使用user变量（用于日志记录等）
    _useUser(user);

    const { id } = await params;
    const navigationId = parseInt(id);

    if (isNaN(navigationId)) {
      return NextResponse.json(error("无效的导航ID"), { status: 400 });
    }

    const body = await request.json();
    const result = navigationUpdateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(error(result.error.issues[0].message), { status: 400 });
    }

    const data = result.data;

    // 检查导航是否存在
    const existing = await prisma.navigation.findUnique({
      where: { id: navigationId },
    });

    if (!existing) {
      return NextResponse.json(error("导航不存在"), { status: 404 });
    }

    // 如果修改slug，检查是否与其他导航冲突
    if (data.slug && data.slug !== existing.slug) {
      const slugExists = await prisma.navigation.findUnique({
        where: { slug: data.slug },
      });
      if (slugExists) {
        return NextResponse.json(error("URL标识已被使用"), { status: 400 });
      }
    }

    // 如果修改parentId，验证层级
    if (data.parentId !== undefined && data.parentId !== existing.parentId) {
      if (data.parentId === null) {
        data.level = 1;
      } else {
        const parent = await prisma.navigation.findUnique({
          where: { id: data.parentId },
        });
        if (!parent) {
          return NextResponse.json(error("父级导航不存在"), { status: 400 });
        }
        // 防止循环引用
        if (data.parentId === navigationId) {
          return NextResponse.json(error("不能将自己设为父级"), { status: 400 });
        }
        data.level = parent.level + 1;
      }
    }

    const navigation = await prisma.navigation.update({
      where: { id: navigationId },
      data,
      include: {
        template: { select: { id: true, code: true, name: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    return NextResponse.json(success(navigation, "更新导航成功"));
  } catch (err) {
    console.error("Update navigation error:", err);
    return NextResponse.json(error("更新导航失败"), { status: 500 });
  }
}

/**
 * 删除导航 API
 * DELETE /api/navigations/:id
 *
 * 需要权限: navigation:delete
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 鉴权检查
    const authHeader = request.headers.get("authorization");
    try {
      await requireAuth(authHeader);
    } catch {
      return NextResponse.json(unauthorized("未登录或登录已过期"), { status: 401 });
    }

    // 权限检查
    try {
      await requirePermission(authHeader, "navigation:delete");
    } catch {
      return NextResponse.json(forbidden("权限不足：需要 navigation:delete 权限"), { status: 403 });
    }

    const { id } = await params;
    const navigationId = parseInt(id);

    if (isNaN(navigationId)) {
      return NextResponse.json(error("无效的导航ID"), { status: 400 });
    }

    // 检查导航是否存在
    const existing = await prisma.navigation.findUnique({
      where: { id: navigationId },
      include: { _count: { select: { children: true } } },
    });

    if (!existing) {
      return NextResponse.json(error("导航不存在"), { status: 404 });
    }

    // 检查是否有子级导航
    if (existing._count.children > 0) {
      return NextResponse.json(
        error("该导航下存在子级导航，请先删除子级导航"),
        { status: 400 }
      );
    }

    await prisma.navigation.delete({
      where: { id: navigationId },
    });

    return NextResponse.json(success(null, "删除导航成功"));
  } catch (err) {
    console.error("Delete navigation error:", err);
    return NextResponse.json(error("删除导航失败"), { status: 500 });
  }
}
