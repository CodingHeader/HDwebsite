/**
 * 采集解析注册表（D-12）—— 单一类型 → 解析器映射，html/rss 共用同一口径。
 *
 * 设计约束：
 * - 类型字符串作为注册键；任何模块不得在业务代码里硬判断源类型（如按 "rss" 分叉）。
 * - `getParser(type)` 统一入口；未知类型抛错（调用方应在上层校验源类型）。
 * - 解析器职责：从原始文本/URL 产出 `ParsedItem[]`；不涉及入库、图片转存、去重。
 */
import * as cheerio from "cheerio";
import Parser from "rss-parser";

/** 采集源支持的解析器类型 */
export type ParserType = "html" | "rss";

/** CSS 选择器规则（源 parser 字段 JSON） */
export type ParserRule = {
  listSelector?: string;
  titleSelector?: string;
  linkSelector?: string;
  timeSelector?: string;
  contentSelector?: string;
};

/** 解析出的待入库条目 */
export type ParsedItem = {
  title: string;
  url: string;
  contentMd?: string;
  publishTime?: Date;
};

/** 解析器函数签名（统一收束输入输出） */
export type ParserFn = (ctx: {
  source: { type: string; url: string; parser: string | null };
  timeoutMs: number;
  ua: string;
  /** 取列表页原始文本（便于单测注入 fixture） */
  fetchText?: (url: string) => Promise<string>;
}) => Promise<ParsedItem[]>;

/** 解析 source.parser JSON 为规则对象 */
export function parseRule(source: { parser: string | null }): ParserRule {
  try {
    return source.parser ? (JSON.parse(source.parser) as ParserRule) : {};
  } catch {
    return {};
  }
}

/** HTML 列表页解析：按 CSS 选择器抓取 title/link/time，后续详情页解析由调用方处理 */
export async function parseHtmlList(ctx: {
  source: { type: string; url: string; parser: string | null };
  timeoutMs: number;
  ua: string;
  fetchText?: (url: string) => Promise<string>;
}): Promise<ParsedItem[]> {
  const rule = parseRule(ctx.source);
  const html = await (ctx.fetchText ? ctx.fetchText(ctx.source.url) : fetchTextImpl(ctx.source.url, ctx.timeoutMs, ctx.ua));
  const $ = cheerio.load(html);
  const listSel = rule.listSelector ?? "ul.list li";
  const items: ParsedItem[] = [];
  $(listSel).each((_, el) => {
    const node = $(el);
    const a = node.find(rule.linkSelector ?? "a").first();
    const href = a.attr("href");
    const title = (node.find(rule.titleSelector ?? "a").attr("title") || a.text() || "").trim();
    if (!href || !title) return;
    const abs = new URL(href, ctx.source.url).href;
    const time = rule.timeSelector ? node.find(rule.timeSelector).first().text().trim() : undefined;
    const parsedTime = time ? new Date(time) : undefined;
    items.push({
      title,
      url: abs,
      publishTime: parsedTime && !Number.isNaN(parsedTime.getTime()) ? parsedTime : undefined,
    });
  });
  return items;
}

/** RSS 解析：rss-parser 直接产出条目 */
export async function parseRss(ctx: {
  source: { type: string; url: string; parser: string | null };
  timeoutMs: number;
  ua: string;
}): Promise<ParsedItem[]> {
  const parser = new Parser({ timeout: ctx.timeoutMs, headers: { "User-Agent": ctx.ua } });
  const feed = await parser.parseURL(ctx.source.url);
  return feed.items
    .filter((i) => i.title && i.link)
    .map((i) => ({
      title: i.title!,
      url: i.link!,
      contentMd: i.contentSnippet ?? undefined,
      publishTime: i.isoDate ? new Date(i.isoDate) : undefined,
    }));
}

/** HTML 详情页正文抽取（返回 markdown 或原始 HTML 片段；调用方再清洗） */
export function extractHtmlContent(
  detailHtml: string,
  rule: ParserRule,
): string {
  const $ = cheerio.load(detailHtml);
  const contentSel = rule.contentSelector ?? ".content, .article-content, #content, main";
  return $(contentSel).first().html() ?? detailHtml;
}

/** 列表 → 详情抓取（html 类型）：限速 + 逐条 fetchText + 正文抽取 */
export async function fetchHtmlDetails(
  entries: ParsedItem[],
  ctx: {
    timeoutMs: number;
    ua: string;
    rule: ParserRule;
    rateLimitMs: number;
    sleep?: (ms: number) => Promise<void>;
    fetchText?: (url: string) => Promise<string>;
    /** markdown 转换（与 collect-engine 的 htmlToMarkdown 一致） */
    toMarkdown: (html: string, baseUrl: string) => string;
  },
): Promise<ParsedItem[]> {
  const sleepImpl = ctx.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const out: ParsedItem[] = [];
  for (const entry of entries.slice(0, 20)) {
    await sleepImpl(ctx.rateLimitMs);
    try {
      const detailHtml = await (ctx.fetchText
        ? ctx.fetchText(entry.url)
        : fetchTextImpl(entry.url, ctx.timeoutMs, ctx.ua));
      const contentHtml = extractHtmlContent(detailHtml, ctx.rule);
      out.push({ ...entry, contentMd: ctx.toMarkdown(contentHtml, entry.url) });
    } catch {
      out.push(entry);
    }
  }
  return out;
}

/** 默认 fetch 实现（超时 + UA） */
async function fetchTextImpl(url: string, timeoutMs: number, ua: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": ua, Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/** 解析器注册表 */
const REGISTRY: Record<ParserType, ParserFn> = {
  html: parseHtmlList,
  rss: parseRss,
};

/**
 * 按源类型取解析器。未知类型抛错，调用方应在上层校验。
 */
export function getParser(type: string): ParserFn {
  const p = REGISTRY[type as ParserType];
  if (!p) throw new Error(`未知采集解析器类型：${type}`);
  return p;
}

/** 支持的解析器类型集合 */
export function isKnownParserType(type: string): type is ParserType {
  return type in REGISTRY;
}