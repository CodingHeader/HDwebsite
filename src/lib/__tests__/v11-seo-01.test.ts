/**
 * V11-SEO-01：OG meta / JSON-LD 绝对地址 / sitemap 导航页扩展
 * ==========================================================
 * - og 组装纯函数（web-metadata.ts）：title/description/url/image 绝对地址口径
 * - JSON-LD（json-ld.ts）：origin 传入时 mainEntityOfPage/image 绝对地址；未传保持旧相对口径
 *   （lane-d/jsonld.test.ts 既有断言不受影响）
 * - sitemap：静态导航页条目快照 + 文章条目，URL 全绝对
 * 构建产物 og 断言见证据（npm run build 产物 head 检查）。
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const tmp = process.env.TMPDIR || process.env.TEMP || "/tmp";
  process.env.DATABASE_URL = `file:${tmp}/hdw-contract-v11seo-${process.pid}-${Date.now()}.db`;
  // sitemap 在模块顶层读取 APP_DOMAIN → 必须先于模块导入设置
  process.env.APP_DOMAIN = "seo-test.example.com";
});

import { prisma } from "@/lib/prisma";
import { cleanupTestDb, initTestDb } from "./api-contract/harness";
import { buildWebOpenGraph, toAbsoluteUrl } from "@/app/(web)/web-metadata";
import { buildArticleJsonLd, type JsonLdArticleInput } from "@/app/(web)/articles/[id]/json-ld";
import sitemap from "@/app/sitemap";

beforeAll(async () => {
  await initTestDb();
});
afterAll(async () => {
  await prisma.$disconnect();
  cleanupTestDb();
});

describe("V11-SEO-01 · og 组装（web-metadata.ts）", () => {
  const ORIGIN = "https://www.hd1994.com";

  it("toAbsoluteUrl：相对路径补全、http(s) 原样、空值 undefined", () => {
    expect(toAbsoluteUrl("/images/logo.png", ORIGIN)).toBe(`${ORIGIN}/images/logo.png`);
    expect(toAbsoluteUrl("images/logo.png", ORIGIN)).toBe(`${ORIGIN}/images/logo.png`);
    expect(toAbsoluteUrl("https://cdn.x.com/a.png", ORIGIN)).toBe("https://cdn.x.com/a.png");
    expect(toAbsoluteUrl("", ORIGIN)).toBeUndefined();
    expect(toAbsoluteUrl(null, ORIGIN)).toBeUndefined();
  });

  it("buildWebOpenGraph：og:title/og:description/og:url/og:image 全绝对地址", () => {
    const og = buildWebOpenGraph({
      siteName: "弘道教育",
      title: "弘道教育",
      description: "专注专升本教育",
      logoPath: "/images/logo.png",
      origin: ORIGIN,
    }) as { title: string; url: string; images: { url: string }[]; siteName: string; type: string };
    expect(og.type).toBe("website");
    expect(og.siteName).toBe("弘道教育");
    expect(og.title).toBe("弘道教育");
    expect(og.url).toBe(ORIGIN);
    expect(og.images[0].url).toBe(`${ORIGIN}/images/logo.png`);
  });

  it("buildWebOpenGraph：无 logo 时不产生空 images（og:image 缺省由页面级补齐）", () => {
    const og = buildWebOpenGraph({ siteName: "s", title: "t", description: "d", logoPath: null, origin: ORIGIN }) as { images?: unknown };
    expect(og.images).toBeUndefined();
  });
});

describe("V11-SEO-01 · JSON-LD 绝对地址（json-ld.ts）", () => {
  const BASE: JsonLdArticleInput = {
    id: 42,
    title: "招生简章",
    coverImage: "/uploads/cover-1.png",
    publishedAt: new Date("2026-09-01T08:00:00Z"),
  };

  it("传 origin：mainEntityOfPage 与 image 为绝对地址（无相对地址残留）", () => {
    const d = buildArticleJsonLd({ ...BASE, origin: "https://www.hd1994.com/" });
    expect(d.mainEntityOfPage).toBe("https://www.hd1994.com/articles/42");
    expect(d.image).toEqual(["https://www.hd1994.com/uploads/cover-1.png"]);
    expect(JSON.stringify(d)).not.toMatch(/"\/(uploads|articles)/);
  });

  it("不传 origin：保持旧相对口径（既有 lane-d 用例回归）", () => {
    const d = buildArticleJsonLd(BASE);
    expect(d.mainEntityOfPage).toBe("/articles/42");
    expect(d.image).toEqual(["/uploads/cover-1.png"]);
  });

  it("已是 http(s) 的 image 原样保留；末尾斜杠 origin 不产生双斜杠", () => {
    const d = buildArticleJsonLd({ ...BASE, coverImage: "https://cdn.x.com/a.png", origin: "https://www.hd1994.com" });
    expect(d.image).toEqual(["https://cdn.x.com/a.png"]);
  });
});

describe("V11-SEO-01 · sitemap 导航页扩展", () => {
  it("静态条目快照：首页 + /articles + 11 个导航页，URL 全为 https 绝对地址", async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls[0]).toBe("https://seo-test.example.com");
    const expectedStatic = [
      "https://seo-test.example.com/articles",
      "https://seo-test.example.com/about",
      "https://seo-test.example.com/courses",
      "https://seo-test.example.com/apply",
      "https://seo-test.example.com/services",
      "https://seo-test.example.com/news",
      "https://seo-test.example.com/campus",
      "https://seo-test.example.com/gallery",
      "https://seo-test.example.com/partners",
      "https://seo-test.example.com/party",
      "https://seo-test.example.com/learning",
      "https://seo-test.example.com/contact",
    ];
    for (const u of expectedStatic) expect(urls).toContain(u);
    expect(urls.filter((u) => !u.startsWith("https://seo-test.example.com"))).toEqual([]);
  });

  it("已发布文章 → /articles/{id} 条目（weekly, 0.6）", async () => {
    const role = await prisma.role.create({ data: { name: `seo-role-${Date.now()}`, slug: `seo-role-${Date.now()}`, permissions: "[]", isSuper: false } });
    const author = await prisma.user.create({ data: { username: `seo-${Date.now()}`, passwordHash: "x", roleId: role.id } });
    const article = await prisma.article.create({
      data: { title: "SEO 文章", slug: `seo-${Date.now()}`, content: "c", authorId: author.id, status: "published" },
    });
    const entries = await sitemap();
    const hit = entries.find((e) => e.url === `https://seo-test.example.com/articles/${article.id}`);
    expect(hit).toBeTruthy();
    expect(hit?.changeFrequency).toBe("weekly");
    expect(hit?.priority).toBe(0.6);
  });
});
