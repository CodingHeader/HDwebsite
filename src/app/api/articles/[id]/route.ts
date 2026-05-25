import { NextRequest, NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/api-auth";
import { checkPermission } from "@/lib/auth";
import { success, error } from "@/lib/api-response";
import { z } from "zod";

// 文章更新验证Schema
const articleUpdateSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(200, "标题最多200字").optional(),
  slug: z.string().min(1, "URL别名不能为空").max(100, "URL别名最多100字").optional(),
  content: z.string().min(1, "内容不能为空").optional(),
  excerpt: z.string().max(500, "摘要最多500字").optional(),
  coverImage: z.string().optional(),
  categoryId: z.number().min(1, "请选择分类").nullable().optional(),
  tagIds: z.array(z.number()).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  isTop: z.boolean().optional(),
  isRecommend: z.boolean().optional(),
  isHot: z.boolean().optional(),
  seoTitle: z.string().optional(),
  seoKeywords: z.string().optional(),
  seoDescription: z.string().optional(),
  publishedAt: z.string().optional(),
});

/**
 * 获取文章详情 API
 * GET /api/articles/:id
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const articleId = parseInt(id);

    if (isNaN(articleId)) {
      return NextResponse.json(error("无效的文章ID"), { status: 400 });
    }

    const article = await prisma.article.findUnique({
      where: { id: articleId },
      include: {
        author: { select: { id: true, username: true, nickname: true } },
        category: { select: { id: true, name: true, slug: true } },
        tags: {
          include: { tag: { select: { id: true, name: true, slug: true } } },
        },
      },
    });

    if (!article) {
      return NextResponse.json(error("文章不存在"), { status: 404 });
    }

    // 增加浏览量
    await prisma.article.update({
      where: { id: articleId },
      data: { viewCount: { increment: 1 } },
    });

    return NextResponse.json(success(article, "获取文章详情成功"));
  } catch (err) {
    console.error("Get article error:", err);
    return NextResponse.json(error("获取文章详情失败"), { status: 500 });
  }
}

/**
 * 更新文章 API
 * PUT /api/articles/:id
 *
 * 需要权限: article:update
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const articleId = parseInt(id);

    if (isNaN(articleId)) {
      return NextResponse.json(error("无效的文章ID"), { status: 400 });
    }

    // 权限验证
    const auth = await authenticateRequest(request);
    if (auth.response) return auth.response;

    // 检查权限
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
    if (!checkPermission(roleForCheck, "article:update")) {
      return NextResponse.json(error("权限不足：需要 article:update"), { status: 403 });
    }
    const user = auth.user!;

    const body = await request.json();
    const result = articleUpdateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(error(result.error.issues[0].message), { status: 400 });
    }

    const data = result.data;

    // 检查文章是否存在
    const existing = await prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!existing) {
      return NextResponse.json(error("文章不存在"), { status: 404 });
    }

    // 如果修改slug，检查是否与其他文章冲突
    if (data.slug && data.slug !== existing.slug) {
      const slugExists = await prisma.article.findUnique({
        where: { slug: data.slug },
      });
      if (slugExists) {
        return NextResponse.json(error("URL别名已被使用"), { status: 400 });
      }
    }

    // 处理发布时间
    let publishedAt = existing.publishedAt;
    if (data.status === "published" && existing.status !== "published") {
      // 从草稿变为发布
      publishedAt = data.publishedAt ? new Date(data.publishedAt) : new Date();
    } else if (data.publishedAt) {
      publishedAt = new Date(data.publishedAt);
    }

    // 构建更新数据
    const updateData: {
      title?: string;
      slug?: string;
      content?: string;
      excerpt?: string;
      coverImage?: string;
      categoryId?: number;
      status?: string;
      isTop?: boolean;
      isRecommend?: boolean;
      isHot?: boolean;
      seoTitle?: string;
      seoKeywords?: string;
      seoDescription?: string;
      publishedAt?: Date | null;
    } = {
      ...(data.title && { title: data.title }),
      ...(data.slug && { slug: data.slug }),
      ...(data.content && { content: data.content }),
      ...(data.excerpt !== undefined && { excerpt: data.excerpt }),
      ...(data.coverImage !== undefined && { coverImage: data.coverImage }),
      ...(data.categoryId && { categoryId: data.categoryId }),
      ...(data.status && { status: data.status }),
      ...(data.isTop !== undefined && { isTop: data.isTop }),
      ...(data.isRecommend !== undefined && { isRecommend: data.isRecommend }),
      ...(data.isHot !== undefined && { isHot: data.isHot }),
      ...(data.seoTitle !== undefined && { seoTitle: data.seoTitle }),
      ...(data.seoKeywords !== undefined && { seoKeywords: data.seoKeywords }),
      ...(data.seoDescription !== undefined && { seoDescription: data.seoDescription }),
      ...(data.status && { publishedAt }),
    };

    // 更新文章
    const article = await prisma.article.update({
      where: { id: articleId },
      data: updateData,
      include: {
        author: { select: { id: true, username: true, nickname: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    // 更新标签关联
    if (data.tagIds !== undefined) {
      // 删除现有标签关联
      await prisma.articleTag.deleteMany({
        where: { articleId },
      });

      // 创建新标签关联
      if (data.tagIds.length > 0) {
        await prisma.articleTag.createMany({
          data: data.tagIds.map((tagId) => ({
            articleId: article.id,
            tagId,
          })),
        });
      }
    }

    // 记录操作日志
    await prisma.operationLog.create({
      data: {
        userId: user.id,
        username: user.username,
        module: "article",
        action: "update",
        title: `更新文章 "${article.title}"`,
        content: JSON.stringify({ articleId: article.id }),
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      },
    });

    return NextResponse.json(success(article, "更新文章成功"));
  } catch (err) {
    console.error("Update article error:", err);
    const message = err instanceof Error ? err.message : "更新文章失败";
    return NextResponse.json(error(message), { status: 500 });
  }
}

/**
 * 删除文章 API
 * DELETE /api/articles/:id
 *
 * 需要权限: article:delete
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const articleId = parseInt(id);

    if (isNaN(articleId)) {
      return NextResponse.json(error("无效的文章ID"), { status: 400 });
    }

    // 权限验证
    const auth = await authenticateRequest(request);
    if (auth.response) return auth.response;

    // 检查权限
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
    if (!checkPermission(roleForCheck, "article:delete")) {
      return NextResponse.json(error("权限不足：需要 article:delete"), { status: 403 });
    }
    const user = auth.user!;

    // 检查文章是否存在
    const existing = await prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!existing) {
      return NextResponse.json(error("文章不存在"), { status: 404 });
    }

    // 删除文章（级联删除标签关联）
    await prisma.article.delete({
      where: { id: articleId },
    });

    // 记录操作日志
    await prisma.operationLog.create({
      data: {
        userId: user.id,
        username: user.username,
        module: "article",
        action: "delete",
        title: `删除文章 "${existing.title}"`,
        content: JSON.stringify({ articleId, title: existing.title }),
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      },
    });

    return NextResponse.json(success(null, "删除文章成功"));
  } catch (err) {
    console.error("Delete article error:", err);
    const message = err instanceof Error ? err.message : "删除文章失败";
    return NextResponse.json(error(message), { status: 500 });
  }
}

/**
 * 文章发布/下架 API
 * PATCH /api/articles/:id
 *
 * 需要权限: article:publish
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const articleId = parseInt(id);

    if (isNaN(articleId)) {
      return NextResponse.json(error("无效的文章ID"), { status: 400 });
    }

    // 权限验证
    const auth = await authenticateRequest(request);
    if (auth.response) return auth.response;

    // 检查权限
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
    if (!checkPermission(roleForCheck, "article:publish")) {
      return NextResponse.json(error("权限不足：需要 article:publish"), { status: 403 });
    }
    const user = auth.user!;

    const body = await request.json();
    const { status } = body;

    if (!status || !["draft", "published", "archived"].includes(status)) {
      return NextResponse.json(error("无效的状态值"), { status: 400 });
    }

    // 检查文章是否存在
    const existing = await prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!existing) {
      return NextResponse.json(error("文章不存在"), { status: 404 });
    }

    // 更新状态
    const publishedAt = status === "published" && existing.status !== "published"
      ? new Date()
      : existing.publishedAt;

    const article = await prisma.article.update({
      where: { id: articleId },
      data: {
        status,
        publishedAt,
      },
      include: {
        author: { select: { id: true, username: true, nickname: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    // 记录操作日志
    const actionMap: Record<string, string> = {
      draft: "设为草稿",
      published: "发布",
      archived: "归档",
    };

    await prisma.operationLog.create({
      data: {
        userId: user.id,
        username: user.username,
        module: "article",
        action: "publish",
        title: `${actionMap[status]}文章 "${article.title}"`,
        content: JSON.stringify({ articleId: article.id, status }),
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      },
    });

    return NextResponse.json(success(article, `${actionMap[status]}成功`));
  } catch (err) {
    console.error("Publish article error:", err);
    const message = err instanceof Error ? err.message : "操作失败";
    return NextResponse.json(error(message), { status: 500 });
  }
}
