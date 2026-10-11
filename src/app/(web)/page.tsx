import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import type { Article, Category } from ".prisma/client";

export const dynamic = "force-dynamic";

/** 首页（Server Component 直查 DB，原项目口径 D7 维持）——骨架版：横幅 + 最新资讯 */
export default async function HomePage() {
  const [settings, articles] = await Promise.all([
    getSettings(),
    prisma.article.findMany({
      where: { status: "published" },
      orderBy: [{ isTop: "desc" }, { publishedAt: "desc" }],
      take: 6,
    }) as Promise<(Article & { category: Category | null })[]>,
  ]);

  return (
    <div>
      <section className="bg-gradient-to-r from-blue-700 to-blue-500 text-white">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h1 className="text-4xl font-bold">
            {settings.bannerTitle || "学历提升 一站式服务"}
          </h1>
          <p className="mt-4 text-lg opacity-90">
            {settings.bannerSubtitle || "自考 · 成考 · 开放大学"}
          </p>
          <Link
            href={settings.bannerBtnLink || "/apply"}
            className="inline-block mt-8 rounded-md bg-white px-6 py-3 font-semibold text-blue-700 hover:bg-blue-50"
          >
            {settings.bannerBtnText || "立即咨询"}
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">最新资讯</h2>
          <Link href="/articles" className="text-sm text-primary hover:underline">
            查看全部 →
          </Link>
        </div>
        {articles.length === 0 ? (
          <p className="mt-6 text-muted">暂无内容</p>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a) => (
              <li key={a.id} className="rounded-lg border border-border bg-card p-5">
                <Link href={`/articles/${a.id}`}>
                  <h3 className="font-semibold hover:text-primary">{a.title}</h3>
                  <p className="mt-2 text-sm text-muted line-clamp-3">{a.excerpt}</p>
                  <p className="mt-3 text-xs text-muted">
                    {a.category?.name}
                    {a.publishedAt ? ` · ${a.publishedAt.toISOString().slice(0, 10)}` : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
