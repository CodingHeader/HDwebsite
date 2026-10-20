/**
 * 试抓预览（ADR-003）：只解析列表不入库；D-12 起复用 `collect/parsers.ts` 注册表，
 * 不再在业务代码里按源类型硬分叉解析逻辑。
 */
import { getAllSettings as getSettings } from "@/lib/settings"; // P06：须含非公开键（collect*/llm*/publish* 均 isPublic=false）
import { getParser, parseRule } from "@/lib/collect/parsers";
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

export async function testParseSource(
  source: CollectSource,
  fetchText: (url: string) => Promise<string>
): Promise<{ items: { title: string; url: string }[]; errMsg?: string }> {
  try {
    parseRule(source); // 校验 parser JSON 是否合法（非法时返回 {}，这里仅做前置容错说明）
    const settings = await getSettings();
    const parser = getParser(source.type);
    const items = await parser({
      source: { type: source.type, url: source.url, parser: source.parser },
      timeoutMs: Number(settings.collectTimeoutMs || 15000),
      ua: settings.collectUserAgent || "Mozilla/5.0 (compatible; HDBot/1.0)",
      fetchText,
    });
    return { items: items.map((i) => ({ title: i.title, url: i.url })) };
  } catch (err) {
    return { items: [], errMsg: err instanceof Error ? err.message : String(err) };
  }
}