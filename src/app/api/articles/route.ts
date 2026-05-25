import { NextRequest, NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/api-auth";
import { checkPermission } from "@/lib/auth";
import { success, error } from "@/lib/api-response";
import { z } from "zod";

// 文章创建验证Schema
const articleSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(200, "标题最多200字"),
  slug: z.string().min(1, "URL别名不能为空").max(100, "URL别名最多100字").optional(),
  content: z.string().min(1, "内容不能为空"),
  excerpt: z.string().max(500, "摘要最多500字").optional(),
  coverImage: z.string().optional(),
  categoryId: z.number().min(1, "请选择分类"),
  tagIds: z.array(z.number()).optional(),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  isTop: z.boolean().default(false),
  isRecommend: z.boolean().default(false),
  isHot: z.boolean().default(false),
  seoTitle: z.string().optional(),
  seoKeywords: z.string().optional(),
  seoDescription: z.string().optional(),
  publishedAt: z.string().optional(),
});

/**
 * 获取文章列表 API
 * GET /api/articles?page=1&limit=10&categoryId=1&status=published
 *
 * 查询参数:
 * - page: 页码 (默认1)
 * - limit: 每页数量 (默认10)
 * - categoryId: 分类ID过滤
 * - status: 状态过滤 (draft/published/archived)
 * - isTop: 是否置顶
 * - isRecommend: 是否推荐
 * - isHot: 是否热门
 * - keyword: 搜索关键词
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const categoryId = searchParams.get("categoryId");
    const status = searchParams.get("status");
    const isTop = searchParams.get("isTop");
    const isRecommend = searchParams.get("isRecommend");
    const isHot = searchParams.get("isHot");
    const keyword = searchParams.get("keyword");

    // 构建查询条件
    const where: {
      categoryId?: number;
      status?: string;
      isTop?: boolean;
      isRecommend?: boolean;
      isHot?: boolean;
      OR?: Array<{ title?: { contains: string }; content?: { contains: string }; excerpt?: { contains: string } }>;
    } = {};
    if (categoryId) where.categoryId = parseInt(categoryId);
    if (status) where.status = status;
    if (isTop !== null) where.isTop = isTop === "true";
    if (isRecommend !== null) where.isRecommend = isRecommend === "true";
    if (isHot !== null) where.isHot = isHot === "true";
    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { content: { contains: keyword } },
        { excerpt: { contains: keyword } },
      ];
    }

    // 计算分页
    const skip = (page - 1) * limit;

    // 查询文章列表
    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        include: {
          author: { select: { id: true, username: true, nickname: true } },
          category: { select: { id: true, name: true, slug: true } },
          tags: {
            include: { tag: { select: { id: true, name: true, slug: true } } },
          },
          _count: { select: { tags: true } },
        },
        orderBy: [
          { isTop: "desc" },
          { publishedAt: "desc" },
          { createdAt: "desc" },
        ],
        skip,
        take: limit,
      }),
      prisma.article.count({ where }),
    ]);

    return NextResponse.json(
      success({
        list: articles,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }, "获取文章列表成功")
    );
  } catch (err) {
    console.error("Get articles error:", err);
    return NextResponse.json(error("获取文章列表失败"), { status: 500 });
  }
}

/**
 * 创建文章 API
 * POST /api/articles
 *
 * 需要权限: article:create
 */
export async function POST(request: NextRequest) {
  try {
    // 权限验证
    const auth = await authenticateRequest(request);
    if (auth.response) return auth.response;

    const roleForCheck: Role = {
      id: auth.user!.role.id,
      name: auth.user!.role.name,
      slug: auth.user!.role.slug,
      description: null,
      permissions: JSON.stringify(auth.user!.role.permissions),
      isSuper: auth.user!.role.isSuper,
      status: "active" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    if (!checkPermission(roleForCheck, "article:create")) {
      return NextResponse.json(error("权限不足：需要 article:create"), { status: 403 });
    }
    const user = auth.user!;

    const body = await request.json();
    const result = articleSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(error(result.error.issues[0].message), { status: 400 });
    }

    const data = result.data;

    // 生成slug（如果未提供）
    if (!data.slug) {
      data.slug = data.title
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
        .replace(/^-|-$/g, "")
        .substring(0, 100);
    }

    // 检查slug是否已存在
    const existing = await prisma.article.findUnique({
      where: { slug: data.slug },
    });
    if (existing) {
      return NextResponse.json(error("URL别名已存在"), { status: 400 });
    }

    // 处理发布时间
    const publishedAt = data.status === "published"
      ? (data.publishedAt ? new Date(data.publishedAt) : new Date())
      : null;

    // 创建文章
    const article = await prisma.article.create({
      data: {
        title: data.title,
        slug: data.slug,
        content: data.content,
        excerpt: data.excerpt,
        coverImage: data.coverImage,
        authorId: user.id,
        categoryId: data.categoryId,
        status: data.status,
        isTop: data.isTop,
        isRecommend: data.isRecommend,
        isHot: data.isHot,
        seoTitle: data.seoTitle,
        seoKeywords: data.seoKeywords,
        seoDescription: data.seoDescription,
        publishedAt,
      },
      include: {
        author: { select: { id: true, username: true, nickname: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    // 关联标签
    if (data.tagIds && data.tagIds.length > 0) {
      await prisma.articleTag.createMany({
        data: data.tagIds.map((tagId) => ({
          articleId: article.id,
          tagId,
        })),
      });
    }

    // 记录操作日志
    await prisma.operationLog.create({
      data: {
        userId: user.id,
        username: user.username,
        module: "article",
        action: "create",
        title: `创建文章 "${article.title}"`,
        content: JSON.stringify({ articleId: article.id }),
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      },
    });

    return NextResponse.json(success(article, "创建文章成功"), { status: 201 });
  } catch (err) {
    console.error("Create article error:", err);
    const message = err instanceof Error ? err.message : "创建文章失败";
    return NextResponse.json(error(message), { status: 500 });
  }
}
