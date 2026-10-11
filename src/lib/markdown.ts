/**
 * Markdown 管线（SOL-001 §3.2，服务端单点）
 * - 渲染走 <MarkdownRenderer>（RSC 组件）；本模块负责：元数据提取 + 输出净化兜底
 * - 入库钩子：excerpt=纯文本前 200 字（可覆盖）、coverImage=首图（可覆盖）
 * - 净化：markdown 允许内嵌 html 片段，统一经 sanitizeHtmlServer 白名单
 */
import { generateExcerpt, sanitizeHtmlServer, stripHtml } from "@/lib/security/xss-filter";

/** 提取 markdown 首图 URL（![alt](src) 或 <img src>） */
export function extractFirstImage(markdown: string): string | null {
  const mdImage = markdown.match(/!\[[^\]]*\]\(([^)\s]+)[^)]*\)/);
  if (mdImage?.[1]) return mdImage[1];
  const htmlImage = markdown.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (htmlImage?.[1]) return htmlImage[1];
  return null;
}

/** markdown → 纯文本摘要（前 200 字） */
export function markdownExcerpt(markdown: string, maxLength = 200): string {
  const withoutCode = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1");
  const text = stripHtml(withoutCode)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_~|-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, maxLength);
}

export { generateExcerpt as htmlExcerpt, sanitizeHtmlServer };

/**
 * 入库钩子：依据 contentType 计算 excerpt 与 coverImage（显式传入值优先）
 */
export function applyContentHooks(input: {
  contentType: string;
  content: string;
  excerpt?: string | null;
  coverImage?: string | null;
}): { excerpt: string | null; coverImage: string | null } {
  const excerpt =
    input.excerpt?.trim() ||
    (input.contentType === "markdown"
      ? markdownExcerpt(input.content)
      : generateExcerpt(input.content)) ||
    null;
  const coverImage =
    input.coverImage?.trim() ||
    (input.contentType === "markdown" ? extractFirstImage(input.content) : null);
  return { excerpt, coverImage: coverImage ?? null };
}

/**
 * markdown 允许内嵌 html → 统一净化入口（REQ-NF-002：所有富内容出口必经）
 * MarkdownRenderer 组件内直接渲染 markdown；对 html 型内容走本函数。
 */
export function sanitizeRichContent(html: string): string {
  return sanitizeHtmlServer(html);
}
