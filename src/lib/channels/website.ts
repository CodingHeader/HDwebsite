/**
 * 官网渠道实现（B-05，ADR-030）：从 ContentItem 创建/更新 Article，
 * 发布成功后写 ContentChannel(website) 记录，并失效前台 articles + home 缓存。
 *
 * 行为等价迁移自 publish-executor.ts 的 publishToWebsite / updateOrOfflineWebsite。
 */
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/slug";
import { invalidateWebContent } from "@/lib/cache-tags";
import type { PublishJob } from ".prisma/client";

export async function publishToWebsite(job: PublishJob): Promise<"published" | "failed"> {
  if (!job.itemId) throw new Error("任务未关联 ContentItem");
  if (job.action === "update" || job.action === "offline") {
    return updateOrOfflineWebsite(job);
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
  invalidateWebContent(["web:articles", "web:home"]);
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
  invalidateWebContent(["web:articles", "web:home"]);
  return "published";
}