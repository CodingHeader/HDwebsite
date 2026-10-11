/**
 * 试抓预览（ADR-003）：只解析列表不入库；与 collect-engine 共用选择器口径
 */
import * as cheerio from "cheerio";
import Parser from "rss-parser";
import { getSettings } from "@/lib/settings";
import type { CollectSource } from ".prisma/client";

export async function fetchTextOnce(url: string): Promise<string> {
  const settings = await getSettings();
  const res = await fetch(url, {
    headers: { "User-Agent": settings.collectUserAgent || "Mozilla/5.0 (compatible; HDBot/1.0)" },
    signal: AbortSignal.timeout(Number(settings.collectTimeoutMs || 15000)),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

type ParserRule = {
  listSelector?: string;
  titleSelector?: string;
  linkSelector?: string;
  timeSelector?: string;
};

export async function testParseSource(
  source: CollectSource,
  fetchText: (url: string) => Promise<string>
): Promise<{ items: { title: string; url: string }[]; errMsg?: string }> {
  let rule: ParserRule = {};
  try {
    rule = source.parser ? JSON.parse(source.parser) : {};
  } catch {
    return { items: [], errMsg: "解析规则 JSON 非法" };
  }
  try {
    if (source.type === "rss") {
      const parser = new Parser();
      const feed = await parser.parseURL(source.url);
      return { items: feed.items.filter((i) => i.title && i.link).map((i) => ({ title: i.title!, url: i.link! })) };
    }
    const html = await fetchText(source.url);
    const $ = cheerio.load(html);
    const items: { title: string; url: string }[] = [];
    $(rule.listSelector ?? "ul.list li").each((_, el) => {
      const a = $(el).find(rule.linkSelector ?? "a").first();
      const href = a.attr("href");
      const title = ($(el).find(rule.titleSelector ?? "a").attr("title") || a.text() || "").trim();
      if (href && title) items.push({ title, url: new URL(href, source.url).href });
    });
    return { items };
  } catch (err) {
    return { items: [], errMsg: err instanceof Error ? err.message : String(err) };
  }
}
