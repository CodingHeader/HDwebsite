import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { error, notFound, serverError, success, validationError } from "@/lib/api-response";
import { clientIp, logOperation } from "@/lib/log";
import { idParamSchema } from "@/contracts";
import { collectItemUpdateSchema } from "@/contracts/resources";
import { markdownExcerpt } from "@/lib/markdown";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/collect-items/[id]：审核动作
 * - approved：创建本地知识条目（ADR-020 本地兜底）+ ContentItem（source=collect, approved）
 * - rejected：仅标记
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAuth(request, "review:edit");
  if (!guard.ok) return guard.response;
  const parsedId = idParamSchema.safeParse((await params).id);
  if (!parsedId.success) return validationError([{ message: "非法 ID" }]);
  let body: unknown;
  try { body = await request.json(); } catch { return error("请求体不是合法 JSON"); }
  const parsed = collectItemUpdateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.issues);
  const input = parsed.data;
  try {
    const item = await prisma.collectItem.findUnique({ where: { id: parsedId.data }, include: { source: { select: { name: true } } } });
    if (!item) return notFound("采集条目不存在");
    if (item.status !== "new") {
      return error(`该条目状态为 ${item.status}，仅待审核（new）状态可执行本操作`, 400);
    }

    if (input.status === "rejected") {
      await prisma.collectItem.update({ where: { id: item.id }, data: { status: "rejected" } });
      await logOperation({
        userId: guard.session.id, username: guard.session.username, module: "collect",
        action: "reject", title: item.title, ip: clientIp(request), userAgent: request.headers.get("user-agent"),
      });
      return success({ id: item.id, status: "rejected" }, "已拒绝");
    }

    const contentMd = input.contentMd ?? item.contentMd ?? "";
    const title = input.title ?? item.title;

    // 审核通过（ADR-017：review:edit SuperAdmin 独享）；事务保证三写一致
    const result = await prisma.$transaction(async (tx) => {
      const knowledge = await tx.knowledge.create({
        data: {
          title, content: contentMd, tags: "采集",
          source: "collect", externalUrl: item.url, status: "active",
        },
      });
      const contentItem = await tx.contentItem.create({
        data: {
          title,
          contentType: "markdown",
          content: contentMd,
          excerpt: markdownExcerpt(contentMd),
          authorId: guard.session.id,
          source: "collect",
          collectItemId: item.id,
          status: "approved",
        },
      });
      await tx.collectItem.update({
        where: { id: item.id },
        data: { status: "approved", knowledgeId: knowledge.id, contentMd },
      });
      return { knowledgeId: knowledge.id, contentItemId: contentItem.id };
    });
    const knowledgeId = result.knowledgeId;
    const contentItem = { id: result.contentItemId };
    await logOperation({
      userId: guard.session.id, username: guard.session.username, module: "collect",
      action: "approve", title,
      after: { contentItemId: contentItem.id, knowledgeId },
      ip: clientIp(request), userAgent: request.headers.get("user-agent"),
    });
    return success({ id: item.id, status: "approved", contentItemId: contentItem.id, knowledgeId }, "审核通过，已入内容中枢与知识库");
  } catch (err) {
    console.error("[collect-items/PATCH] 审核失败：", err);
    return serverError("审核操作失败");
  }
}
