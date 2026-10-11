import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { getSession } from "@/lib/auth";
import { error, notFound, serverError, success, validationError } from "@/lib/api-response";
import { clientIp, logOperation } from "@/lib/log";
import { applyContentHooks } from "@/lib/markdown";
import { idParamSchema, articleUpdateSchema } from "@/contracts";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

function canReadAll(session: { role: { isSuper: boolean; permissions: string[] } } | null): boolean {
  if (!session) return false;
  const p = session.role.permissions;
  return session.role.isSuper || p.includes("*") || p.includes("article:list") || p.includes("article:*");
}

/** GET /api/articles/[id]：详情（未登录仅可见已发布内容） */
export async function GET(_request: Request, { params }: RouteParams) {
  const { id: rawId } = await params;
  const parsedId = idParamSchema.safeParse(rawId);
  if (!parsedId.success) return validationError([{ message: "非法的文章 ID" }]);

  try {
    const article = await prisma.article.findUnique({
      where: { id: parsedId.data },
      include: {
        author: { select: { id: true, username: true, nickname: true } },
        category: true,
        tags: { include: { tag: true } },
      },
    });
    if (!article) return notFound("文章不存在");
    if (article.status !== "published" && !canReadAll(await getSession(_request))) {
      return notFound("文章不存在");
    }
    return success(
      { ...article, tags: article.tags.map((t) => t.tag) },
      "获取文章成功"
    );
  } catch (err) {
    console.error("[articles/GET:id] 查询失败：", err);
    return serverError("获取文章失败");
  }
}

/** PUT /api/articles/[id]：更新（鉴权 article:edit；content 变更时重跑入库钩子） */
export async function PUT(request: Request, { params }: RouteParams) {
  const guard = await requireAuth(request, "article:edit");
  if (!guard.ok) return guard.response;

  const { id: rawId } = await params;
  const parsedId = idParamSchema.safeParse(rawId);
  if (!parsedId.success) return validationError([{ message: "非法的文章 ID" }]);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error("请求体不是合法 JSON");
  }
  const parsed = articleUpdateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.issues);
  const input = parsed.data;

  try {
    const existing = await prisma.article.findUnique({ where: { id: parsedId.data } });
    if (!existing) return notFound("文章不存在");
    if (input.slug && input.slug !== existing.slug) {
      const exists = await prisma.article.findUnique({ where: { slug: input.slug } });
      if (exists) return error("slug 已存在", 400);
    }

    const contentType = input.contentType ?? existing.contentType;
    const content = input.content ?? existing.content;
    // 显式传入才视为变更；未传时以存量值兜底，避免编辑正文抹掉手工摘要/封面
    const excerptInput = input.excerpt !== undefined ? input.excerpt : existing.excerpt;
    const coverInput = input.coverImage !== undefined ? input.coverImage : existing.coverImage;
    const hooks = input.content
      ? applyContentHooks({ contentType, content, excerpt: excerptInput, coverImage: coverInput })
      : {
          excerpt: excerptInput?.trim() || existing.excerpt,
          coverImage: coverInput?.trim() || existing.coverImage,
        };

    const article = await prisma.article.update({
      where: { id: parsedId.data },
      data: {
        title: input.title,
        slug: input.slug,
        content: input.content,
        contentType: input.contentType,
        channel: input.channel,
        excerpt: hooks.excerpt,
        coverImage: hooks.coverImage,
        categoryId: input.categoryId,
        status: input.status,
        isTop: input.isTop,
        isRecommend: input.isRecommend,
        isHot: input.isHot,
        seoTitle: input.seoTitle,
        seoKeywords: input.seoKeywords,
        seoDescription: input.seoDescription,
        publishedAt:
          input.status === "published" && !existing.publishedAt
            ? new Date()
            : input.status === "draft"
              ? null
              : undefined,
        tags: input.tagIds
          ? {
              deleteMany: {},
              create: input.tagIds.map((tagId) => ({ tagId })),
            }
          : undefined,
      },
      include: { tags: { include: { tag: true } } },
    });

    await logOperation({
      userId: guard.session.id,
      username: guard.session.username,
      module: "article",
      action: "update",
      title: article.title,
      before: { id: existing.id, title: existing.title, status: existing.status },
      after: { id: article.id, title: article.title, status: article.status },
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent"),
    });

    return success(
      { ...article, tags: article.tags.map((t) => t.tag) },
      "更新文章成功"
    );
  } catch (err) {
    console.error("[articles/PUT:id] 更新失败：", err);
    return prismaKnownErrorTo400(err) ?? serverError("更新文章失败");
  }
}

/** DELETE /api/articles/[id]：删除（鉴权 article:delete） */
export async function DELETE(request: Request, { params }: RouteParams) {
  const guard = await requireAuth(request, "article:delete");
  if (!guard.ok) return guard.response;

  const { id: rawId } = await params;
  const parsedId = idParamSchema.safeParse(rawId);
  if (!parsedId.success) return validationError([{ message: "非法的文章 ID" }]);

  try {
    const existing = await prisma.article.findUnique({ where: { id: parsedId.data } });
    if (!existing) return notFound("文章不存在");
    await prisma.article.delete({ where: { id: parsedId.data } });
    await logOperation({
      userId: guard.session.id,
      username: guard.session.username,
      module: "article",
      action: "delete",
      title: existing.title,
      before: { id: existing.id, title: existing.title },
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent"),
    });
    return success({ id: parsedId.data }, "删除文章成功");
  } catch (err) {
    console.error("[articles/DELETE:id] 删除失败：", err);
    return serverError("删除文章失败");
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
