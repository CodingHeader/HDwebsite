import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error, unauthorized, forbidden } from "@/lib/api-response";
import { z } from "zod";
import { requireAuth, requirePermission } from "@/lib/auth";

// 导航数据验证Schema
const navigationSchema = z.object({
  name: z.string().min(1, "菜单名称不能为空"),
  slug: z.string().min(1, "URL标识不能为空"),
  parentId: z.number().nullable().optional(),
  level: z.number().default(1),
  icon: z.string().optional(),
  link: z.string().optional(),
  linkType: z.enum(["internal", "external", "dropdown"]).default("internal"),
  target: z.enum(["_self", "_blank"]).default("_self"),
  templateId: z.number().nullable().optional(),
  categoryId: z.number().nullable().optional(),
  contentType: z.string().optional(),
  sort: z.number().default(0),
  status: z.enum(["active", "inactive"]).default("active"),
  isVisible: z.boolean().default(true),
  isNav: z.boolean().default(true),
  seoTitle: z.string().optional(),
  seoKeywords: z.string().optional(),
  seoDescription: z.string().optional(),
});

interface NavigationItem {
  id: number;
  parentId: number | null;
  sort: number;
  [key: string]: unknown;
}

interface NavigationTreeItem extends NavigationItem {
  children: NavigationTreeItem[];
}

/**
 * 构建树形导航结构
 */
function buildTree(items: NavigationItem[], parentId: number | null = null): NavigationTreeItem[] {
  const result = items
    .filter(item => item.parentId === parentId)
    .map(item => ({
      ...item,
      children: buildTree(items, item.id),
    }))
    .sort((a, b) => a.sort - b.sort);
  return result;
}

/**
 * 获取导航树 API
 * GET /api/navigations?tree=true&level=1
 *
 * 查询参数:
 * - tree: 是否返回树形结构 (true/false)
 * - level: 过滤层级 (1/2/3)
 * - status: 过滤状态 (active/inactive)
 * - isVisible: 过滤可见性 (true/false)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tree = searchParams.get("tree") === "true";
    const level = searchParams.get("level");
    const status = searchParams.get("status");
    const isVisible = searchParams.get("isVisible");

    // 构建查询条件
    const where: {
      level?: number;
      status?: string;
      isVisible?: boolean;
    } = {};
    if (level) where.level = parseInt(level);
    if (status) where.status = status;
    if (isVisible !== null) where.isVisible = isVisible === "true";

    const navigations = await prisma.navigation.findMany({
      where,
      include: {
        template: { select: { id: true, code: true, name: true } },
        category: { select: { id: true, name: true, slug: true } },
        _count: { select: { children: true } },
      },
      orderBy: [{ level: "asc" }, { sort: "asc" }],
    });

    // 如果需要树形结构
    if (tree) {
      const treeData = buildTree(navigations, null);
      return NextResponse.json(success(treeData, "获取导航树成功"));
    }

    return NextResponse.json(success(navigations, "获取导航列表成功"));
  } catch (err) {
    console.error("Get navigations error:", err);
    return NextResponse.json(error("获取导航列表失败"), { status: 500 });
  }
}

/**
 * 创建导航 API
 * POST /api/navigations
 *
 * 需要权限: navigation:create
 */
export async function POST(request: NextRequest) {
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
      await requirePermission(authHeader, "navigation:create");
    } catch {
      return NextResponse.json(forbidden("权限不足：需要 navigation:create 权限"), { status: 403 });
    }

    const body = await request.json();
    const result = navigationSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(error(result.error.issues[0].message), { status: 400 });
    }

    const data = result.data;

    // 检查slug是否已存在
    const existing = await prisma.navigation.findUnique({
      where: { slug: data.slug },
    });

    if (existing) {
      return NextResponse.json(error("URL标识已存在"), { status: 400 });
    }

    // 如果有父级，验证层级
    if (data.parentId) {
      const parent = await prisma.navigation.findUnique({
        where: { id: data.parentId },
      });
      if (!parent) {
        return NextResponse.json(error("父级导航不存在"), { status: 400 });
      }
      // 子级层级 = 父级层级 + 1
      data.level = parent.level + 1;
    }

    const navigation = await prisma.navigation.create({
      data: {
        name: data.name,
        slug: data.slug,
        parentId: data.parentId,
        level: data.level,
        icon: data.icon,
        link: data.link,
        linkType: data.linkType,
        target: data.target,
        templateId: data.templateId,
        categoryId: data.categoryId,
        contentType: data.contentType,
        sort: data.sort,
        status: data.status,
        isVisible: data.isVisible,
        isNav: data.isNav,
        seoTitle: data.seoTitle,
        seoKeywords: data.seoKeywords,
        seoDescription: data.seoDescription,
      },
      include: {
        template: { select: { id: true, code: true, name: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    return NextResponse.json(success(navigation, "创建导航成功"), { status: 201 });
  } catch (err) {
    console.error("Create navigation error:", err);
    return NextResponse.json(error("创建导航失败"), { status: 500 });
  }
}
