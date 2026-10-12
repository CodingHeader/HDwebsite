import { prisma } from "@/lib/prisma";
import { error, notFound, success } from "@/lib/api-response";
import { parseBody, parseId, withApi } from "@/lib/api-handler";
import { clientIp, logOperation } from "@/lib/log";
import { collectItemUpdateSchema } from "@/contracts/resources";
import { markdownExcerpt } from "@/lib/markdown";
import { ingestCollectItem } from "@/lib/kb-sync";
import { scheduleAutoPublish } from "@/lib/content-workflow";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/collect-items/[id]：审核动作（review:edit，SuperAdmin 独享 ADR-017）
 * - approved：知识条目已在采集时默认入库（autoToKb）→ 用审核后正文更新并重新排队同步；未入库的此时补建；
 *   创建 ContentItem(source=collect, approved) 并按设置自动建发布任务
 * - rejected：仅标记（已入库的知识保留，作为客服参考资料；可在知识库页停用）
 */
export const PATCH = withApi<{ id: string }>(
  async ({ request, params, session }) => {
    const id = parseId(params.id);
    const input = await parseBody(request, collectItemUpdateSchema);
    const item = await prisma.collectItem.findUnique({ where: { id }, include: { source: { select: { name: true, autoTags: true } } } });
    if (!item) return notFound("采集条目不存在");
    if (item.status !== "new") {
      return error(`该条目状态为 ${item.status}，仅待审核（new）状态可执行本操作`, 400);
    }

    if (input.status === "rejected") {
      await prisma.collectItem.update({ where: { id: item.id }, data: { status: "rejected" } });
      await logOperation({
        userId: session.id, username: session.username, module: "collect",
        action: "reject", title: item.title, ip: clientIp(request), userAgent: request.headers.get("user-agent"),
      });
      return success({ id: item.id, status: "rejected" }, "已拒绝");
    }

    const contentMd = input.contentMd ?? item.contentMd ?? "";
    const title = input.title ?? item.title;

    const contentItem = await prisma.$transaction(async (tx) => {
      const ci = await tx.contentItem.create({
        data: {
          title,
          contentType: "markdown",
          content: contentMd || title,
          excerpt: markdownExcerpt(contentMd),
          authorId: session.id,
          source: "collect",
          collectItemId: item.id,
          status: "approved",
        },
      });
      await tx.collectItem.update({ where: { id: item.id }, data: { status: "approved", title, contentMd } });
      return ci;
    });
    // 已存在则更新（不重复建 Knowledge）
    const knowledgeId = await ingestCollectItem({ ...item, title, contentMd });
    const jobs = await scheduleAutoPublish(contentItem.id);
    await logOperation({
      userId: session.id, username: session.username, module: "collect",
      action: "approve", title,
      after: { contentItemId: contentItem.id, knowledgeId, publishJobIds: jobs },
      ip: clientIp(request), userAgent: request.headers.get("user-agent"),
    });
    return success(
      { id: item.id, status: "approved", contentItemId: contentItem.id, knowledgeId, publishJobIds: jobs },
      jobs.length ? `审核通过，已入内容中枢与知识库，并排期自动发布（${jobs.length} 个任务）` : "审核通过，已入内容中枢与知识库"
    );
  },
  { permission: "review:edit", route: "collect-items/PATCH", errorMessage: "审核操作失败" }
);
