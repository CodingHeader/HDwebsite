/**
 * 发布执行器（SOL-005）：PublishJob 状态机
 * draft→(审核略，单级 SuperAdmin 终审在内容态)→scheduled/pending→publishing→published|failed|cancelled
 * website 执行器：ContentItem(markdown) → Article(channel=news|info, contentType=markdown, published)
 * wechat 执行器：委托公众号模块（SOL-006）；凭证未配置 → failed（errMsg 明确，凭证后补即插桩）
 */
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/slug";
import { notifyEvent } from "@/lib/notify-gateway";
import { getWechatAccountSecret, publishDraftToWechat } from "@/lib/wechat";
import type { PublishJob } from ".prisma/client";

const MAX_ATTEMPTS = 3;

export async function executePublishJob(job: PublishJob): Promise<"published" | "failed"> {
  try {
    await prisma.publishJob.update({ where: { id: job.id }, data: { status: "publishing", startedAt: new Date() } });
    let result: "published" | "failed";
    if (job.channel === "website") {
      result = await publishToWebsite(job);
    } else {
      result = await publishToWechat(job);
    }
    if (result === "published") {
      await prisma.publishJob.update({
        where: { id: job.id },
        data: { status: "published", finishedAt: new Date(), errMsg: null },
      });
      if (job.itemId) {
        await prisma.contentItem.update({ where: { id: job.itemId }, data: { status: "published", publishedAt: new Date() } }).catch(() => undefined);
      }
    } else {
      await markFailed(job, "执行失败（详见 ContentChannel 记录）");
    }
    return result;
  } catch (err) {
    await markFailed(job, err instanceof Error ? err.message : String(err));
    return "failed";
  }
}

async function markFailed(job: PublishJob, errMsg: string): Promise<void> {
  const attempts = job.attemptCount + 1;
  const exhausted = attempts >= MAX_ATTEMPTS;
  await prisma.publishJob.update({
    where: { id: job.id },
    data: {
      status: exhausted ? "failed" : "scheduled", // 指数退避：推迟 2^attempts 分钟后由 scan 重跑
      scheduledAt: exhausted ? job.scheduledAt : new Date(Date.now() + 2 ** attempts * 60_000),
      attemptCount: attempts,
      errMsg,
      finishedAt: exhausted ? new Date() : null,
    },
  });
  if (exhausted) {
    await notifyEvent("job_failed", {
      title: `发布任务 #${job.id} 失败`,
      detail: errMsg,
      link: `${process.env.APP_ORIGIN ?? "https://www.hd1994.com"}/manager/publish-jobs`,
    });
  }
}

async function publishToWebsite(job: PublishJob): Promise<"published" | "failed"> {
  if (!job.itemId) throw new Error("任务未关联 ContentItem");
  if (job.action === "update" || job.action === "offline") {
    return await updateOrOfflineWebsite(job);
  }
  const item = await prisma.contentItem.findUnique({ where: { id: job.itemId } });
  if (!item) throw new Error("ContentItem 不存在");
  if (item.contentType !== "markdown" && item.contentType !== "html") throw new Error(`未知内容类型 ${item.contentType}`);

  const article = await prisma.article.create({
    data: {
      title: item.title,
      slug: await uniqueSlug(item.title, (s) => prisma.article.findUnique({ where: { slug: s } }).then((r) => !!r)),
      content: item.content,
      contentType: item.contentType,
      channel: job.contentType === "info" ? "info" : "news",
      excerpt: item.excerpt,
      coverImage: item.coverImage,
      authorId: item.authorId ?? 1,
      status: "published",
      publishedAt: new Date(),
    },
  });
  await prisma.contentChannel.create({
    data: {
      itemId: item.id, channel: "website", externalId: String(article.id),
      externalUrl: `/articles/${article.id}`, status: "published", publishedAt: new Date(),
    },
  });
  return "published";
}

/** update/offline 动作：作用于官网渠道已发布记录（P2-8 语义补全） */
async function updateOrOfflineWebsite(job: PublishJob): Promise<"published" | "failed"> {
  const channel = await prisma.contentChannel.findFirst({
    where: { itemId: job.itemId!, channel: "website", status: "published" },
  });
  if (!channel?.externalId) throw new Error("未找到官网已发布记录，无法执行 update/offline");
  const articleId = Number(channel.externalId);
  if (job.action === "offline") {
    await prisma.article.update({ where: { id: articleId }, data: { status: "archived" } });
    await prisma.contentChannel.update({ where: { id: channel.id }, data: { status: "unsent", errMsg: "offline" } });
  } else {
    const item = await prisma.contentItem.findUnique({ where: { id: job.itemId! } });
    if (!item) throw new Error("ContentItem 不存在");
    await prisma.article.update({
      where: { id: articleId },
      data: {
        title: item.title,
        content: item.content,
        excerpt: item.excerpt,
        coverImage: item.coverImage,
        updatedAt: new Date(),
      },
    });
  }
  return "published";
}

async function publishToWechat(job: PublishJob): Promise<"published" | "failed"> {
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

/** publish.scan 任务：到点任务逐个执行（串行，防频控） */
export async function publishScan(): Promise<void> {
  const now = new Date();
  const dueJobs = await prisma.publishJob.findMany({
    where: {
      status: { in: ["scheduled", "pending"] },
      attemptCount: { lt: MAX_ATTEMPTS },
      OR: [{ scheduledAt: { lte: now } }, { scheduledAt: null, status: "pending" }],
    },
    orderBy: { id: "asc" },
    take: 5,
  });
  for (const job of dueJobs) {
    await executePublishJob(job);
    await new Promise((r) => setTimeout(r, 2000)); // 渠道限频间隔
  }
}

/** retry.failed 任务：失败任务人工/自动重试入口（attemptCount 重置由 retry API 决定） */
export async function retryFailedScan(): Promise<void> {
  // 重试由 /api/publish-jobs/[id]/retry 显式触发；本扫描仅兜底拉起搁置的 scheduled 任务
  const stuck = await prisma.publishJob.updateMany({
    where: { status: "publishing", startedAt: { lt: new Date(Date.now() - 15 * 60_000) } },
    data: { status: "scheduled" },
  });
  if (stuck.count > 0) console.log(`[retry] 复位搁置发布任务 ${stuck.count} 个`);
}
