import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { BRAND_DEFAULTS } from "@/config/brand";

export const dynamic = "force-dynamic";

const domain = process.env.APP_DOMAIN ?? BRAND_DEFAULTS.siteDomain;

/**
 * 静态导航类页面（V11-SEO-01：sitemap 收录导航页，清单见证据 V11/SEO-01/execution.md）。
 * 动态详情（courses/[id]、services/[slug]、news/[id]）不在本卡范围，保持原状。
 */
const STATIC_NAV_PAGES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "/about", changeFrequency: "monthly", priority: 0.6 },
  { path: "/courses", changeFrequency: "weekly", priority: 0.8 },
  { path: "/apply", changeFrequency: "monthly", priority: 0.8 },
  { path: "/services", changeFrequency: "monthly", priority: 0.6 },
  { path: "/news", changeFrequency: "daily", priority: 0.7 },
  { path: "/campus", changeFrequency: "monthly", priority: 0.5 },
  { path: "/gallery", changeFrequency: "monthly", priority: 0.5 },
  { path: "/partners", changeFrequency: "monthly", priority: 0.5 },
  { path: "/party", changeFrequency: "monthly", priority: 0.5 },
  { path: "/learning", changeFrequency: "monthly", priority: 0.5 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.6 },
];

/** 站点地图（REQ-NF-003）：首页 + 静态导航页（V11-SEO-01 扩展）+ 已发布文章（C1 后单源，不再双源） */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = `https://${domain}`;
  const entries: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/articles`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
  ];
  for (const p of STATIC_NAV_PAGES) {
    entries.push({ url: `${base}${p.path}`, lastModified: new Date(), changeFrequency: p.changeFrequency, priority: p.priority });
  }
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
