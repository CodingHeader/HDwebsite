import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { getSession } from "@/lib/auth";
import { created, error, serverError, success, validationError } from "@/lib/api-response";
import { clientIp, logOperation } from "@/lib/log";
import { applyContentHooks } from "@/lib/markdown";
import { uniqueSlug } from "@/lib/slug";
import { articleCreateSchema, articleListQuerySchema } from "@/contracts";
import type { Prisma } from ".prisma/client";

export const dynamic = "force-dynamic";

/** GET /api/articles：分页列表（keyword OR 模糊；排序 isTop → publishedAt → createdAt） */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsedQuery = articleListQuerySchema.safeParse(
    Object.fromEntries(url.searchParams.entries())
  );
  if (!parsedQuery.success) return validationError(parsedQuery.error.issues);
  const { page, limit, keyword, channel, categoryId, status, tagId } = parsedQuery.data;

  try {
    // 未登录（或无 article:list 权限）一律只看已发布内容，防草稿泄露
    const session = await getSession(request);
    const canReadAll =
      !!session &&
      ((session.role.isSuper || session.role.permissions.includes("article:list") ||
        session.role.permissions.includes("article:*") || session.role.permissions.includes("*")));
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
  } catch (err) {
    console.error("[articles/GET] 查询失败：", err);
    return serverError("获取文章列表失败");
  }
}

/** POST /api/articles：创建（鉴权 article:create；excerpt/cover 入库钩子） */
export async function POST(request: Request) {
  const guard = await requireAuth(request, "article:create");
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error("请求体不是合法 JSON");
  }
  const parsed = articleCreateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.issues);
  const input = parsed.data;

  try {
    if (input.slug) {
      const exists = await prisma.article.findUnique({ where: { slug: input.slug } });
      if (exists) return error("slug 已存在", 400);
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

    const article = await prisma.article.create({
      data: {
        title: input.title,
        slug,
        content: input.content,
        contentType: input.contentType,
        channel: input.channel,
        excerpt: hooks.excerpt,
        coverImage: hooks.coverImage,
        authorId: guard.session.id,
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
      userId: guard.session.id,
      username: guard.session.username,
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
  } catch (err) {
    console.error("[articles/POST] 创建失败：", err);
    return prismaKnownErrorTo400(err) ?? serverError("创建文章失败");
  }
}

/** Prisma 已知请求错误 → 400 响应（唯一约束/外键约束等业务性失败） */
function prismaKnownErrorTo400(err: unknown): Response | null {
  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as { code: string }).code === "string" &&
    ["P2002", "P2003"].includes((err as { code: string }).code)
  ) {
    return error("数据校验失败：字段重复或关联数据不存在", 400);
  }
  return null;
}
