import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const domain = process.env.APP_DOMAIN ?? "www.hd1994.com";

/** 站点地图（REQ-NF-003）：首页 + 已发布文章（C1 后单源，不再双源） */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = `https://${domain}`;
  const entries: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/articles`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
  ];
  try {
    const articles = await prisma.article.findMany({
      where: { status: "published" },
      select: { id: true, updatedAt: true },
      orderBy: { publishedAt: "desc" },
      take: 2000,
    });
    for (const a of articles) {
      entries.push({
        url: `${base}/articles/${a.id}`,
        lastModified: a.updatedAt,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  } catch {
    // 数据库不可用时仅返回静态项
  }
  return entries;
}
