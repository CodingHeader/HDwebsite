/**
 * 内容工作流（P06）：审核（ADR-017 SuperAdmin 独享）→ 自动建发布任务（官网 + 公众号）→ 发布前提醒 → 执行
 * - reviewContentItem：pending_review → approved | rejected（状态机见 contracts/events）
 * - scheduleAutoPublish：按 Setting publishAutoChannels / publishAutoDelayMinutes 建 scheduled 任务（幂等：同渠道已有未结束任务则跳过）
 */
import { prisma } from "@/lib/prisma";
import { getAllSettings } from "@/lib/settings";
import { logOperation } from "@/lib/log";
import { canTransitionContentItem } from "@/contracts/events";
import { getChannel, isChannelKind } from "@/lib/channels/registry";
import { ApiHttpError } from "@/lib/api-handler";

type Actor = { id: number | null; username: string; ip?: string | null; userAgent?: string | null };

export async function reviewContentItem(itemId: number, decision: "approved" | "rejected", actor: Actor, remark?: string | null) {
  const item = await prisma.contentItem.findUnique({ where: { id: itemId } });
  if (!item) throw new ApiHttpError(404, "内容不存在");
  if (!canTransitionContentItem(item.status, decision)) {
    throw new ApiHttpError(400, `当前状态 ${item.status} 不可审核为 ${decision}（仅待审核内容可审核）`);
  }
  const updated = await prisma.contentItem.update({ where: { id: itemId }, data: { status: decision } });
  await logOperation({
    userId: actor.id,
    username: actor.username,
    module: "review",
    action: decision === "approved" ? "approve" : "reject",
    title: item.title,
    before: { status: item.status },
    after: { status: decision, remark: remark ?? null },
    ip: actor.ip,
    userAgent: actor.userAgent,
  });
  const jobs = decision === "approved" ? await scheduleAutoPublish(itemId) : [];
  return { item: updated, jobs };
}

/** 审核通过后自动建发布任务；返回新建任务 id */
export async function scheduleAutoPublish(itemId: number): Promise<number[]> {
  const settings = await getAllSettings();
  const channels = (settings.publishAutoChannels ?? "")
    .split(/[,，\s]+/)
    .map((c) => c.trim())
    .filter((c): c is "website" | "wechat" => isChannelKind(c));
  if (channels.length === 0) return [];
  const delay = Math.max(0, Number(settings.publishAutoDelayMinutes || 60));
  const scheduledAt = new Date(Date.now() + delay * 60_000);
  const created: number[] = [];
  for (const channel of channels) {
    const impl = getChannel(channel);
    let accountId: number | null = null;
    if (impl.requiresAccount) {
      const account = await prisma.wechatAccount.findFirst({ where: { status: "active", type: "service", freepublishEnabled: true } });
      if (!account) continue; // 未配置服务号：不建公众号任务（凭证后补，ADR-002）
      accountId = account.id;
    }
    const open = await prisma.publishJob.findFirst({
      where: { itemId, channel, action: "publish", status: { in: ["pending", "reviewing", "scheduled", "publishing", "published"] } },
    });
    if (open) continue;
    const job = await prisma.publishJob.create({
      data: {
        itemId,
        channel,
        accountId,
        contentType: impl.defaultContentType,
        action: "publish",
        status: "scheduled",
        scheduledAt,
        preNotify: true,
      },
    });
    created.push(job.id);
  }
  return created;
}
