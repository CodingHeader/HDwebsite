/**
 * 公众号渠道实现（B-05，ADR-030）：委托公众号模块发布草稿（SOL-006），
 * 结果写 ContentChannel(wechat)；失败复用既有 failed 渠道行防重试堆积。
 *
 * 行为等价迁移自 publish-executor.ts 的 publishToWechat。
 */
import { prisma } from "@/lib/prisma";
import { getWechatAccountSecret, publishDraftToWechat } from "@/lib/wechat";
import type { PublishJob } from ".prisma/client";

export async function publishToWechat(job: PublishJob): Promise<"published" | "failed"> {
  if (!job.itemId) throw new Error("任务未关联 ContentItem");
  const item = await prisma.contentItem.findUnique({ where: { id: job.itemId } });
  if (!item) throw new Error("ContentItem 不存在");
  const account = job.accountId
    ? await prisma.wechatAccount.findUnique({ where: { id: job.accountId } })
    : await prisma.wechatAccount.findFirst({ where: { status: "active", type: "service" } });
  if (!account) throw new Error("未配置可用的公众号账号（凭证后补即插桩，ADR-002）");
  const secret = getWechatAccountSecret(account);
  if (!secret) throw new Error("AppSecret 解密失败，请在后台重新保存凭证");

  const result = await publishDraftToWechat(account, secret, item);
  // 失败复用既有 failed 渠道行，防重试堆积重复记录（P2-8）
  const existingFailed = await prisma.contentChannel.findFirst({
    where: { itemId: item.id, channel: "wechat", accountId: account.id, status: "failed" },
  });
  const channelData = {
    externalId: result.publishId ?? result.mediaId ?? null,
    externalUrl: result.url ?? null,
    status: result.ok ? ("published" as const) : ("failed" as const),
    errMsg: result.ok ? null : result.errMsg ?? null,
    publishedAt: result.ok ? new Date() : null,
  };
  if (existingFailed) {
    await prisma.contentChannel.update({ where: { id: existingFailed.id }, data: channelData });
  } else {
    await prisma.contentChannel.create({
      data: { itemId: item.id, channel: "wechat", accountId: account.id, ...channelData },
    });
  }
  if (!result.ok) throw new Error(result.errMsg ?? "公众号发布失败");
  return "published";
}