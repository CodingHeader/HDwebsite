import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { isTruthySetting } from "@/lib/settings-registry";
import type { Article, HomeCard, HotMajor, Partner, Course, Category, Gallery, Campus } from ".prisma/client";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [settings, banners, cards, hotMajors, courses, articles, partners, gallery, campus] = await Promise.all([
    getSettings(),
    prisma.banner.findMany({ where: { status: "active" }, orderBy: { sort: "asc" }, take: 5 }),
    prisma.homeCard.findMany({ where: { status: "active" }, orderBy: { sort: "asc" }, take: 4 }) as Promise<HomeCard[]>,
    prisma.hotMajor.findMany({ where: { status: "active" }, orderBy: { sort: "asc" }, take: 6 }) as Promise<HotMajor[]>,
    prisma.course.findMany({ where: { status: "active" }, orderBy: { sort: "asc" }, take: 6, include: { category: true } }),
    prisma.article.findMany({ where: { status: "published" }, orderBy: [{ isTop: "desc" }, { publishedAt: "desc" }], take: 6 }) as Promise<(Article & { category: Category | null })[]>,
    prisma.partner.findMany({ where: { status: "active" }, orderBy: { sort: "asc" }, take: 12 }) as Promise<Partner[]>,
    prisma.gallery.findMany({ where: { status: "active" }, orderBy: { sort: "asc" }, take: 6 }) as Promise<Gallery[]>,
    prisma.campus.findMany({ where: { status: "active" }, orderBy: { sort: "asc" }, take: 3, include: { images: { orderBy: { sort: "asc" }, take: 1 } } }) as Promise<(Campus & { images: { image: string }[] })[]>,
  ]);

  return (
    <div>
      {/* 轮播/横幅 */}
      <section className="bg-gradient-to-r from-blue-700 to-blue-500 text-white">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h1 className="text-4xl font-bold">{settings.bannerTitle || "学历提升 一站式服务"}</h1>
          <p className="mt-4 text-lg opacity-90">{settings.bannerSubtitle || "自考 · 成考 · 开放大学"}</p>
          {isTruthySetting(settings.bannerShowContent) && (
            <Link href={settings.bannerBtnLink || "/apply"} className="mt-8 inline-block rounded-md bg-white px-6 py-3 font-semibold text-blue-700 hover:bg-blue-50">
              {settings.bannerBtnText || "立即咨询"}
            </Link>
          )}
        </div>
      </section>

      {/* 四宫格 */}
      {cards.length > 0 && (
        <section className="mx-auto -mt-8 max-w-6xl px-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((c) => (
              <Link
                key={c.id}
                href={c.href ?? "/apply"}
                className="rounded-lg p-6 text-white shadow-md transition-transform hover:-translate-y-1"
                style={{ background: c.gradient ?? "#1d4ed8" }}
              >
                <p className="text-lg font-bold">{c.title}</p>
                <p className="mt-1 text-sm opacity-90">{c.subtitle}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 统计 */}
      <section className="mx-auto max-w-6xl px-4 py-12 text-center">
        <div className="grid gap-6 sm:grid-cols-3">
          {(settings.statsText || "11年办学经验|10000+服务学员|98%通过率").split("|").map((item) => (
            <div key={item}>
              <p className="text-2xl font-bold text-primary">{item}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 热门专业 */}
      {hotMajors.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-6">
          <h2 className="text-2xl font-bold">热门专业</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {hotMajors.map((m) => (
              <Link key={m.id} href={m.majorId ? `/courses` : m.link} className="rounded-lg border border-border bg-card p-5 hover:border-primary">
                <p className="font-semibold">{m.title}</p>
                <p className="mt-1 text-sm text-muted">{m.subtitle} · {m.duration}</p>
                <p className="mt-2 text-sm line-clamp-2 text-muted">{m.description}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 课程 */}
      {courses.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">学历提升课程</h2>
            <Link href="/courses" className="text-sm text-primary hover:underline">查看全部 →</Link>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <Link key={c.id} href={`/courses/${c.id}`} className="rounded-lg border border-border bg-card p-5 hover:border-primary">
                {c.cover && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.cover} alt={c.title} className="mb-3 h-36 w-full rounded object-cover" loading="lazy" />
                )}
                <p className="font-semibold">{c.title}</p>
                <p className="mt-1 text-sm text-muted">{c.category?.name}</p>
                <p className="mt-2 text-primary">{c.priceText || (c.price > 0 ? `¥${c.price}` : "咨询报价")}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 资讯 */}
      <section className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">最新资讯</h2>
          <Link href="/articles" className="text-sm text-primary hover:underline">查看全部 →</Link>
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

      {/* 合作院校 */}
      {partners.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">合作院校</h2>
            <Link href="/partners" className="text-sm text-primary hover:underline">全部院校 →</Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {partners.map((p) => (
              <div key={p.id} className="flex h-20 items-center justify-center rounded-lg border border-border bg-card p-2">
                {p.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.logo} alt={p.name} className="max-h-full object-contain" loading="lazy" />
                ) : (
                  <span className="text-center text-xs text-muted">{p.name}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 证书 + 校区 */}
      <section className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">证书风采</h2>
              <Link href="/gallery" className="text-sm text-primary hover:underline">更多 →</Link>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {gallery.slice(0, 6).map((g) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={g.id} src={g.image} alt={g.title} className="h-24 w-full rounded-lg object-cover" loading="lazy" />
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">校区环境</h2>
              <Link href="/campus" className="text-sm text-primary hover:underline">更多 →</Link>
            </div>
            <div className="mt-4 space-y-3">
              {campus.map((c) => (
                <div key={c.id} className="flex items-center gap-4 rounded-lg border border-border bg-card p-3">
                  {c.images[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.images[0].image} alt={c.name} className="h-16 w-24 rounded object-cover" loading="lazy" />
                  )}
                  <div>
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-sm text-muted">{c.address}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 公司简介 */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-xl bg-card p-8">
          <h2 className="text-2xl font-bold">{settings.companySlogan}</h2>
          <p className="mt-4 leading-7 text-muted">{settings.companyIntro}</p>
        </div>
      </section>
    </div>
  );
}
