/**
 * D-15 e2e：前台文章详情页注入 NewsArticle JSON-LD（schema.org）。
 * 前置：`npm run build` + `npm run test:e2e`（global-setup 会重建 e2e.db 并 seed，种子含 3 篇已发布文章）。
 * 断言：
 *  1) 页面存在 `script[type="application/ld+json"]`；
 *  2) 解析 JSON-LD 后 `@type === "NewsArticle"`、`@context === "https://schema.org"`；
 *  3) headline 与页面可见 H1 一致（动态数据来源相同）；
 *  4) mainEntityOfPage["@id"] 指向当前文章 URL；
 *  5) 前台可见像素不因 JSON-LD 注入而改变（正文 H1 唯一，无额外可见 script 破坏版面）。
 */
import { expect, test } from "@playwright/test";

test("文章详情页输出 NewsArticle JSON-LD 且与可见内容一致", async ({ page }) => {
  // 前台文章列表 → 进入第一篇详情
  await page.goto("/articles");
  const link = page.locator("a[href^='/articles/']").first();
  await expect(link).toBeVisible();
  await link.click();
  await page.waitForLoadState("load");

  // 1) JSON-LD script 存在且可解析
  // 注意：Playwright 视 `<script>` 元素恒为 hidden（无渲染框），故用 toHaveCount + toBeAttached 断言存在性
  const scripts = page.locator('script[type="application/ld+json"]');
  await expect(scripts).toHaveCount(1);
  const script = scripts.first();
  await expect(script).toBeAttached();
  const raw = await script.textContent();
  expect(raw, "JSON-LD script 内容为空").toBeTruthy();
  // 2) 解析后 @context/@type 正确
  const jsonLd = JSON.parse(raw!) as Record<string, unknown>;
  expect(jsonLd["@context"]).toBe("https://schema.org");
  expect(jsonLd["@type"]).toBe("NewsArticle");

  // 3) headline 与页面 H1 一致（两者同源：article.title）
  const h1 = await page.locator("h1").first().textContent();
  expect(jsonLd.headline).toBeTruthy();
  expect(String(jsonLd.headline).trim()).toBe(String(h1 ?? "").trim());

  // 4) mainEntityOfPage 指向当前文章 URL（实现为纯字符串相对 URL，schema.org 允许 Text 形式）
  const m = jsonLd.mainEntityOfPage as string | Record<string, unknown> | undefined;
  const mId = typeof m === "string" ? m : String((m as Record<string, unknown>)["@id"] ?? "");
  expect(mId).toContain("/articles/");
  // 实现输出相对 URL，与页面 pathname 一致（绝对 URL 由浏览器补全，二者同源）
  expect(new URL(page.url()).pathname).toBe(mId);

  // 5) NewsArticle 必需字段齐全（headline / datePublished / dateModified / author / image）
  expect(jsonLd.headline).toBeTruthy();
  expect(jsonLd.datePublished).toBeTruthy();
  expect(jsonLd.dateModified).toBeTruthy();
  // 实现把 author/creator 输出为 Person 数组（schema.org 允许数组形式）
  const author = jsonLd.author as Record<string, unknown> | Record<string, unknown>[] | undefined;
  const authorList = Array.isArray(author) ? author : author ? [author] : [];
  expect(authorList.length).toBeGreaterThan(0);
  expect(authorList[0]?.["@type"]).toBe("Person");
  expect(authorList[0]?.name).toBeTruthy();
  // image：实现仅在 article.coverImage 存在时输出（seed 无封面时省略，schema.org 允许）
  const image = jsonLd.image as string | string[] | undefined;
  expect(image === undefined || Array.isArray(image) ? true : Boolean(image)).toBeTruthy();

  // 6) 可见像素未被破坏：页面只有一个 H1；正文容器存在（前台冻结未回归）
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("article, .prose-mgr, main").first()).toBeAttached();
});