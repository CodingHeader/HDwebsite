import { prisma } from "@/lib/prisma";
import { created, success } from "@/lib/api-response";
import { clientIp, logOperation } from "@/lib/log";
import { applyContentHooks } from "@/lib/markdown";
import { uniqueSlug } from "@/lib/slug";
import { articleCreateSchema, articleListQuerySchema } from "@/contracts";
import { ApiHttpError, parseBody, parseQuery, withApi } from "@/lib/api-handler";
import type { Prisma } from ".prisma/client";

export const dynamic = "force-dynamic";

/** GET /api/articles：分页列表（keyword OR 模糊；排序 isTop → publishedAt → createdAt）
 * 未登录（或无 article:list 权限）一律只看已发布内容，防草稿泄露（auth: optional）
 */
export const GET = withApi(
  async ({ request, session }) => {
    const { page, limit, keyword, channel, categoryId, status, tagId } = parseQuery(request, articleListQuerySchema);

    const canReadAll =
      !!session &&
      (session.role.isSuper ||
        session.role.permissions.includes("article:list") ||
        session.role.permissions.includes("article:*") ||
        session.role.permissions.includes("*"));
    const where: Prisma.ArticleWhereInput = {};
    if (!canReadAll) {
      where.status = "published";
    } else if (status) {
      where.status = status;
    }
    if (channel) where.channel = channel;
    if (categoryId) where.categoryId = categoryId;
    if (tagId) where.tags = { some: { tagId } };
    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { content: { contains: keyword } },
        { excerpt: { contains: keyword } },
      ];
    }

    const [list, total] = await Promise.all([
      prisma.article.findMany({
        where,
        include: {
          author: { select: { id: true, username: true, nickname: true } },
          category: { select: { id: true, name: true, slug: true } },
          tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
        },
        orderBy: [{ isTop: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.article.count({ where }),
    ]);

    return success(
      {
        list: list.map((a) => ({ ...a, tags: a.tags.map((t) => t.tag) })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
      "获取文章列表成功"
    );
  },
  { auth: "optional", errorMessage: "获取文章列表失败", route: "articles/GET" }
);

/** POST /api/articles：创建（鉴权 article:create；excerpt/cover 入库钩子） */
export const POST = withApi(
  async ({ request, session }) => {
    const input = await parseBody(request, articleCreateSchema);

    if (input.slug) {
      const exists = await prisma.article.findUnique({ where: { slug: input.slug } });
      if (exists) throw new ApiHttpError(400, "slug 已存在");
    }
    const slug =
      input.slug ??
      (await uniqueSlug(input.title, (s) =>
        prisma.article.findUnique({ where: { slug: s } }).then((r) => !!r)
      ));

    const hooks = applyContentHooks({
      contentType: input.contentType,
      content: input.content,
      excerpt: input.excerpt ?? null,
      coverImage: input.coverImage ?? null,
    });

    // withApi 全局 ADR-028：P2002 → 409、P2003 → 400（不再自兜；B-02 遗留的 400 语义在此统一）
    const article = await prisma.article.create({
      data: {
        title: input.title,
        slug,
        content: input.content,
        contentType: input.contentType,
        channel: input.channel,
        excerpt: hooks.excerpt,
        coverImage: hooks.coverImage,
        authorId: session.id,
        categoryId: input.categoryId ?? null,
        status: input.status,
        isTop: input.isTop,
        isRecommend: input.isRecommend,
        isHot: input.isHot,
        seoTitle: input.seoTitle ?? null,
        seoKeywords: input.seoKeywords ?? null,
        seoDescription: input.seoDescription ?? null,
        publishedAt: input.status === "published" ? new Date() : null,
        tags: input.tagIds.length
          ? { create: input.tagIds.map((tagId) => ({ tagId })) }
          : undefined,
      },
      include: { tags: { include: { tag: true } } },
    });

    await logOperation({
      userId: session.id,
      username: session.username,
      module: "article",
      action: "create",
      title: input.title,
      after: { id: article.id, title: article.title },
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent"),
    });

    return created(
      { ...article, tags: article.tags.map((t) => t.tag) },
      "创建文章成功"
    );
  },
  { permission: "article:create", errorMessage: "创建文章失败", route: "articles/POST" }
);