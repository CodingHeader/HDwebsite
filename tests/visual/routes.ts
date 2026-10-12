/**
 * 前台视觉回归路由清单（P02）：15 路由 × 3 宽度。
 * 动态路由取"列表首条"：在被测站点自身的列表页上解析第一条链接（main 与 upgrade 同数据 → 同一条）。
 */
import type { Page } from "@playwright/test";

export interface VisualRoute {
  name: string;
  path?: string;
  /** 动态路由：在 from 页面上取第一个匹配 pattern 的链接 */
  resolve?: { from: string; pattern: RegExp };
}

export const VIEWPORTS = [
  { name: "1440", width: 1440, height: 900 },
  { name: "768", width: 768, height: 1024 },
  { name: "375", width: 375, height: 812 },
] as const;

export const ROUTES: VisualRoute[] = [
  { name: "home", path: "/" },
  { name: "about", path: "/about" },
  { name: "apply", path: "/apply" },
  { name: "articles", path: "/articles" },
  { name: "article-detail", resolve: { from: "/articles", pattern: /^\/articles\/\d+$/ } },
  { name: "campus", path: "/campus" },
  { name: "contact", path: "/contact" },
  { name: "courses", path: "/courses" },
  { name: "course-detail", resolve: { from: "/courses", pattern: /^\/courses\/\d+$/ } },
  { name: "gallery", path: "/gallery" },
  { name: "learning", path: "/learning" },
  { name: "partners", path: "/partners" },
  { name: "party", path: "/party" },
  { name: "service-detail", resolve: { from: "/", pattern: /^\/services\/[^/?#]+$/ } },
  { name: "not-found", path: "/not-exist" },
];

/** main 首页区块顺序（main `src/app/(web)/page.tsx` 渲染顺序，ADR-024 区块编码） */
export const MAIN_HOME_BLOCK_ORDER = [
  "home-banner",
  "home-cards",
  "home-topbar",
  "home-entrance",
  "home-stats",
  "home-partners",
  "home-courses",
  "home-intro",
  "home-news",
  "home-certificates",
  "home-campus",
  "home-cta",
];

export async function resolvePath(page: Page, route: VisualRoute): Promise<string> {
  if (route.path) return route.path;
  const { from, pattern } = route.resolve!;
  await page.goto(from, { waitUntil: "domcontentloaded" });
  const hrefs = await page.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href") ?? ""));
  const hit = hrefs.find((h) => pattern.test(h));
  if (!hit) throw new Error(`在 ${from} 上找不到匹配 ${pattern} 的链接`);
  return hit;
}
