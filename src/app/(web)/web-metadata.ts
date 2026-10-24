/**
 * 前台 SEO 元数据助手（V11-SEO-01，K4=加）
 * ==========================================================
 * 纯函数、无 IO：供 (web) layout 与页面 metadata 组装 openGraph（绝对地址口径）与
 * JSON-LD/站内路径的绝对化。只影响 <head> 与结构化数据，不改任何可见 JSX（REQ-F-014 冻结）。
 *
 * 绝对地址来源：APP_ORIGIN 环境变量 > Setting siteUrl > 品牌出厂默认（@/lib/app-origin）。
 */
import type { Metadata } from "next";

/** 站内相对路径 → 绝对地址；已是 http(s) 原样返回；空值返回 undefined */
export function toAbsoluteUrl(path: string | null | undefined, origin: string): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  return `${origin}${path.startsWith("/") ? "" : "/"}${path}`;
}

/** (web) layout 全站 openGraph：title/description/url/image 全部绝对地址口径 */
export function buildWebOpenGraph(input: {
  siteName: string;
  title: string;
  description: string;
  logoPath: string | null | undefined;
  origin: string;
}): NonNullable<Metadata["openGraph"]> {
  const image = toAbsoluteUrl(input.logoPath, input.origin);
  return {
    type: "website",
    siteName: input.siteName,
    title: input.title,
    description: input.description,
    url: input.origin,
    ...(image ? { images: [{ url: image }] } : {}),
  };
}
