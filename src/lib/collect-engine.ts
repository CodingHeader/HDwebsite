/**
 * 采集引擎（SOL-004）：可配置源抓取 → 清洗去重 → 审核队列
 * - 类型：html / rss（统一经 `collect/parsers.ts` 注册表 getParser(type)，禁止业务代码硬判断类型）
 * - 去重：urlHash（sha1）唯一约束为主；标题相似度（bigram Jaccard ≥0.9）辅助
 * - 图片默认转存本地（Q10-D5）：流式下载 → 超过 COLLECT_IMAGE_MAX_SIZE 立即中止留原链
 * - 产物默认 status=new 待人工审核（RISK-005）；失败 → collect_failed 邮件事件
 * - D-12：批次超时（REQ-NF-001 §3 AC3）—— 单个源运行超过 COLLECT_BATCH_TIMEOUT_MS（30 分钟）中止，
 *   tasks 标记 collect_failed 并触发 notifyCollectFailed（外层 jobs/index.ts 统一处理）。
 */
import crypto from "node:crypto";
import * as cheerio from "cheerio";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { getAllSettings as getSettings } from "@/lib/settings"; // P06：须含非公开键（collect*/llm*/publish* 均 isPublic=false）
import { uploadsDir, COLLECT_IMAGE_MAX_SIZE, COLLECT_IMAGE_TYPES } from "@/lib/storage";
import { getParser, parseRule, fetchHtmlDetails, type ParsedItem, type ParserRule } from "@/lib/collect/parsers";
import { ingestCollectItem } from "@/lib/kb-sync";
import { logOperation } from "@/lib/log";
import { markdownExcerpt } from "@/lib/markdown";
import { scheduleAutoPublish } from "@/lib/content-workflow";
import { appOrigin } from "@/lib/app-origin";
import { notifyCollectFailed } from "@/lib/notify-gateway";
import type { CollectSource } from ".prisma/client";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** 单个源批次最大运行时长（30 分钟）；超时中止并标记失败（D-12） */
export const COLLECT_BATCH_TIMEOUT_MS = 30 * 60 * 1000;


/** 标题相似度（字符 bigram Jaccard） */
export function titleSimilarity(a: string, b: string): number {
  const bigrams = (s: string) => {
    const set = new Set<string>();
    const clean = s.replace(/\s+/g, "");
    for (let i = 0; i < clean.length - 1; i++) set.add(clean.slice(i, i + 2));
    return set;
  };
  const A = bigrams(a);
  const B = bigrams(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return inter / (A.size + B.size - inter);
}

function htmlToMarkdown(html: string, baseUrl: string): string {
  const $ = cheerio.load(html);
  $("script,style,nav,header,footer,iframe,form,noscript").remove();
  const title = $("h1").first().text().trim();
  const parts: string[] = [];
  if (title) parts.push(`# ${title}\n`);
  $("p, h2, h3, li, img").each((_, el) => {
    const node = $(el);
    if (el.tagName === "img") {
      const src = node.attr("src");
      if (src) parts.push(`![图片](${new URL(src, baseUrl).href})`);
      return;
    }
    if (el.tagName === "h2") parts.push(`\n## ${node.text().trim()}\n`);
    else if (el.tagName === "h3") parts.push(`\n### ${node.text().trim()}\n`);
    else if (el.tagName === "li") parts.push(`- ${node.text().trim()}`);
    else {
      const text = node.text().trim();
      if (text) parts.push(`${text}\n`);
    }
  });
  return parts.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * 图片转存：流式下载（累计超过 COLLECT_IMAGE_MAX_SIZE 立即中止）→ uploads + Media 记录；
 * 返回新 URL（失败/超限返回 null 留原链）。
 */
async function transferImage(imageUrl: string, timeoutMs: number, ua: string, outer?: AbortSignal): Promise<string | null> {
  try {
    const res = await fetchWithSignalResponse(imageUrl, timeoutMs, ua, outer);
    if (!res.ok) return null;
    const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    const ext = COLLECT_IMAGE_TYPES[contentType];
    if (!ext) return null;
    if (!res.body) return null;
    // 流式累计：超过上限立即中止（D-12：不把超大图整体驻留内存）
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > COLLECT_IMAGE_MAX_SIZE) {
        await reader.cancel().catch(() => undefined);
        return null;
      }
      chunks.push(value);
    }
    if (total === 0) return null;
    const buffer = Buffer.concat(chunks);
    const now = new Date();
    const relDir = `collect/${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const uploadRoot = uploadsDir();
    const absDir = path.resolve(uploadRoot, relDir);
    mkdirSync(absDir, { recursive: true });
    const filename = `${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}${ext}`;
    const relPath = `${relDir}/${filename}`;
    writeFileSync(path.resolve(uploadRoot, relPath), buffer);
    if (contentType !== "image/gif") {
      await sharp(path.resolve(uploadRoot, relPath)).resize({ width: 1200, withoutEnlargement: true }).toBuffer()
        .then((out) => writeFileSync(path.resolve(uploadRoot, relPath), out))
        .catch(() => undefined);
    }
    await prisma.media.create({
      data: {
        filename, path: relPath, url: `/uploads/${relPath}`, mimeType: contentType,
        size: buffer.length, type: "image", category: "collect", metadata: JSON.stringify({ sourceUrl: imageUrl }),
      },
    }).catch(() => undefined);
    return `/uploads/${relPath}`;
  } catch {
    return null;
  }
}

async function transferImagesInMarkdown(md: string, timeoutMs: number, ua: string, appDomain: string, outer?: AbortSignal): Promise<string> {
  const images = [...md.matchAll(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g)];
  let out = md;
  for (const match of images) {
    const [, alt, src] = match;
    const absolute = src.startsWith("http") ? src : `${appDomain}${src}`;
    if (absolute.includes("/uploads/")) continue;
    const local = await transferImage(absolute, timeoutMs, ua, outer);
    if (local) out = out.replace(match[0], `![${alt}](${local})`);
    await sleep(500);
  }
  return out;
}

/** 短延时（保留在引擎内，供限速使用） */
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * 带超时 + 可选外部 AbortSignal 的 fetch（D-12：批次超时可中断）——返回 Response。
 * 超时优先用内部 AbortController；外部 signal 仅注册一次，避免重复 listener 泄漏。
 */
async function fetchWithSignalResponse(url: string, timeoutMs: number, ua: string, outer?: AbortSignal): Promise<Response> {
  const inner = new AbortController();
  const timeoutId = setTimeout(() => inner.abort(new Error(`请求超时 ${timeoutMs}ms`)), timeoutMs);
  const onAbort = () => inner.abort();
  outer?.addEventListener("abort", onAbort, { once: true });
  try {
    return await fetch(url, {
      headers: { "User-Agent": ua, Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
      signal: inner.signal,
    });
  } finally {
    clearTimeout(timeoutId);
    outer?.removeEventListener("abort", onAbort);
  }
}

/** 同上，但直接返回响应文本（列表页/详情页/RSS XML 统一用） */
async function fetchWithSignal(url: string, timeoutMs: number, ua: string, outer?: AbortSignal): Promise<string> {
  const res = await fetchWithSignalResponse(url, timeoutMs, ua, outer);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/** 单源执行：抓列表 → 逐条抓正文 → 去重入库（status=new）
 * D-12：批次超时 COLLECT_BATCH_TIMEOUT_MS（30 分钟）→ 中止并标记 collect_failed + 触发通知
 */
export async function runSource(source: CollectSource): Promise<{ newCount: number; skipCount: number; fetched: number; failed: number }> {
  const settings = await getSettings();
  const origin = await appOrigin();
  const ua = settings.collectUserAgent || `Mozilla/5.0 (compatible; HDBot/1.0; +${origin})`;
  const timeoutMs = Number(settings.collectTimeoutMs || 15000);
  const rateLimitMs = Number(settings.collectRateLimitMs || 2000);
  const rule = parseRule(source);
  const task = await prisma.collectTask.create({ data: { sourceId: source.id, status: "running" } });

  // 批次超时守卫：到点 abort，让进行中的 fetch 抛 AbortError，外层标记 collect_failed
  const timer = new AbortController();
  const deadline = Date.now() + COLLECT_BATCH_TIMEOUT_MS;
  const deadlineTimer = setInterval(() => {
    if (Date.now() > deadline) timer.abort();
  }, 5000);
  deadlineTimer.unref?.();

  let items: ParsedItem[] = [];
  try {
    const parser = getParser(source.type);
    items = await parser({
      source: { type: source.type, url: source.url, parser: source.parser },
      timeoutMs,
      ua,
      fetchText: (url) =>
        fetchWithSignal(url, timeoutMs, ua, timer.signal),
    });
    if (source.type === "html") {
      items = await fetchHtmlDetails(items, {
        timeoutMs,
        ua,
        rule,
        rateLimitMs,
        sleep,
        fetchText: (url) => fetchWithSignal(url, timeoutMs, ua, timer.signal),
        toMarkdown: htmlToMarkdown,
      });
    }

    let newCount = 0;
    let skipCount = 0;
    let failed = 0;
    const appDomain = process.env.APP_DOMAIN ? `https://${process.env.APP_DOMAIN}` : origin;
    for (const item of items) {
      if (timer.signal.aborted) throw new Error("采集批次超时（30 分钟）");
      const urlHash = crypto.createHash("sha1").update(item.url).digest("hex");
      const exists = await prisma.collectItem.findUnique({ where: { urlHash } });
      if (exists) {
        skipCount++;
        continue;
      }
      // 标题相似度辅助去重（同源近 200 条）
      const recent = await prisma.collectItem.findMany({ where: { sourceId: source.id }, select: { title: true }, take: 200, orderBy: { id: "desc" } });
      if (recent.some((r) => titleSimilarity(r.title, item.title) >= 0.9)) {
        skipCount++;
        continue;
      }
      let contentMd = item.contentMd ?? null;
      if (contentMd && settings.collectDefaultKnowledge !== "false") {
        contentMd = await transferImagesInMarkdown(contentMd, timeoutMs, ua, appDomain, timer.signal);
      }
      try {
        const created = await prisma.collectItem.create({
          data: {
            sourceId: source.id,
            url: item.url,
            urlHash,
            title: item.title.slice(0, 300),
            contentMd,
            publishTime: item.publishTime ?? null,
            status: "new",
          },
        });
        newCount++;
        await afterItemCreated(source, created).catch((err) =>
          console.error(`[collect] 条目 #${created.id} 入库/自动通过失败：`, err)
        );
      } catch {
        failed++;
      }
      await sleep(rateLimitMs);
    }
    await prisma.collectTask.update({
      where: { id: task.id },
      data: {
        status: "done", finishedAt: new Date(), newCount, skipCount,
        stat: JSON.stringify({ fetched: items.length, created: newCount, duplicated: skipCount, failed }),
      },
    });
    await prisma.collectSource.update({ where: { id: source.id }, data: { lastRunAt: new Date(), lastStatus: "done", errMsg: null } });
    return { newCount, skipCount, fetched: items.length, failed };
  } catch (err) {
    // 批次超时：fetch 可能仍被 abort 兜住；此处统一转成明确错误信息，便于上层通知可读
    const errMsg = timer.signal.aborted ? "采集批次超时（30 分钟）" : err instanceof Error ? err.message : String(err);
    await prisma.collectTask.update({ where: { id: task.id }, data: { status: "failed", finishedAt: new Date(), errMsg } });
    await prisma.collectSource.update({ where: { id: source.id }, data: { lastRunAt: new Date(), lastStatus: "failed", errMsg } });
    throw new Error(errMsg);
  } finally {
    clearInterval(deadlineTimer);
  }
}

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return raw.split(/[,，]/).map((t) => t.trim()).filter(Boolean);
  }
}

/** 新条目后处理：默认入知识库（autoToKb）+ 超管预授权自动通过（autoApprove） */
async function afterItemCreated(
  source: CollectSource,
  created: { id: number; title: string; url: string; contentMd: string | null; summary: string | null; knowledgeId: number | null }
): Promise<void> {
  if (source.autoToKb) {
    await ingestCollectItem(created, { tags: parseTags(source.autoTags) });
  }
  if (source.autoApprove) {
    const contentMd = created.contentMd ?? "";
    const contentItem = await prisma.$transaction(async (tx) => {
      const ci = await tx.contentItem.create({
        data: {
          title: created.title,
          contentType: "markdown",
          content: contentMd || created.title,
          excerpt: markdownExcerpt(contentMd),
          source: "collect",
          collectItemId: created.id,
          status: "approved",
        },
      });
      await tx.collectItem.update({ where: { id: created.id }, data: { status: "approved" } });
      return ci;
    });
    await logOperation({
      username: "system",
      module: "review",
      action: "auto_approve",
      title: created.title,
      after: { collectItemId: created.id, contentItemId: contentItem.id, sourceId: source.id, reason: "CollectSource.autoApprove（SuperAdmin 预授权）" },
    });
    await scheduleAutoPublish(contentItem.id);
  }
}
