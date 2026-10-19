/**
 * 采集引擎（SOL-004）：可配置源抓取 → 清洗去重 → 审核队列
 * - 类型：html（cheerio + 每源 CSS 选择器）/ rss（rss-parser）；限速 ≥2s、超时可配
 * - 去重：urlHash（sha1）唯一约束为主；标题相似度（bigram Jaccard ≥0.9）辅助
 * - 图片默认转存本地（Q10-D5）：下载 → uploads + Media 记录，正文链接替换，失败留原链
 * - 产物默认 status=new 待人工审核（RISK-005）；失败 → collect_failed 邮件事件
 * - P06：源 autoToKb（默认 true）→ 新条目立即入本地知识库并进入远端同步队列（kb-sync，P12 接 Coze）；
 *   源 autoApprove（默认 false）→ 视为 SuperAdmin 预授权：直接生成 approved 内容 + OperationLog(review/auto_approve)
 *   + 按设置自动建发布任务
 */
import crypto from "node:crypto";
import * as cheerio from "cheerio";
import Parser from "rss-parser";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { getAllSettings as getSettings } from "@/lib/settings"; // P06：须含非公开键（collect*/llm*/publish* 均 isPublic=false）
import { uploadsDir } from "@/lib/storage";
import { ingestCollectItem } from "@/lib/kb-sync";
import { logOperation } from "@/lib/log";
import { markdownExcerpt } from "@/lib/markdown";
import { scheduleAutoPublish } from "@/lib/content-workflow";
import { appOrigin } from "@/lib/app-origin";
import type { CollectSource } from ".prisma/client";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type ParsedItem = { title: string; url: string; contentMd?: string; publishTime?: Date };


type ParserRule = {
  listSelector?: string;
  titleSelector?: string;
  linkSelector?: string;
  timeSelector?: string;
  contentSelector?: string;
};

function parseRule(source: CollectSource): ParserRule {
  try {
    return source.parser ? (JSON.parse(source.parser) as ParserRule) : {};
  } catch {
    return {};
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchText(url: string, timeoutMs: number, ua: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": ua, Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

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

/** 图片转存：下载 → uploads + Media 记录；返回新 URL（失败返回 null 留原链） */
async function transferImage(imageUrl: string, timeoutMs: number, ua: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, { headers: { "User-Agent": ua }, signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > 10 * 1024 * 1024) return null;
    const extMap: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };
    const ext = extMap[contentType.split(";")[0]];
    if (!ext) return null;
    const now = new Date();
    const relDir = `collect/${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const uploadRoot = uploadsDir();
    const absDir = path.resolve(uploadRoot, relDir);
    mkdirSync(absDir, { recursive: true });
    const filename = `${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}${ext}`;
    const relPath = `${relDir}/${filename}`;
    writeFileSync(path.resolve(uploadRoot, relPath), buffer);
    if (contentType.startsWith("image/") && contentType !== "image/gif") {
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

async function transferImagesInMarkdown(md: string, timeoutMs: number, ua: string, appDomain: string): Promise<string> {
  const images = [...md.matchAll(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g)];
  let out = md;
  for (const match of images) {
    const [, alt, src] = match;
    const absolute = src.startsWith("http") ? src : `${appDomain}${src}`;
    if (absolute.includes("/uploads/")) continue;
    const local = await transferImage(absolute, timeoutMs, ua);
    if (local) out = out.replace(match[0], `![${alt}](${local})`);
    await sleep(500);
  }
  return out;
}

/** 单源执行：抓列表 → 逐条抓正文 → 去重入库（status=new） */
export async function runSource(source: CollectSource): Promise<{ newCount: number; skipCount: number; fetched: number; failed: number }> {
  const settings = await getSettings();
  const origin = await appOrigin();
  const ua = settings.collectUserAgent || `Mozilla/5.0 (compatible; HDBot/1.0; +${origin})`;
  const timeoutMs = Number(settings.collectTimeoutMs || 15000);
  const rateLimitMs = Number(settings.collectRateLimitMs || 2000);
  const rule = parseRule(source);
  const task = await prisma.collectTask.create({ data: { sourceId: source.id, status: "running" } });

  let items: ParsedItem[] = [];
  try {
    if (source.type === "rss") {
      const parser = new Parser({ timeout: timeoutMs, headers: { "User-Agent": ua } });
      const feed = await parser.parseURL(source.url);
      items = feed.items
        .filter((i) => i.title && i.link)
        .map((i) => ({ title: i.title!, url: i.link!, contentMd: i.contentSnippet ?? undefined, publishTime: i.isoDate ? new Date(i.isoDate) : undefined }));
    } else {
      const html = await fetchText(source.url, timeoutMs, ua);
      const $ = cheerio.load(html);
      const listSel = rule.listSelector ?? "ul.list li";
      const entries: { title: string; url: string; time?: string }[] = [];
      $(listSel).each((_, el) => {
        const node = $(el);
        const a = node.find(rule.linkSelector ?? "a").first();
        const href = a.attr("href");
        const title = (node.find(rule.titleSelector ?? "a").attr("title") || a.text() || "").trim();
        if (!href || !title) return;
        const abs = new URL(href, source.url).href;
        entries.push({ title, url: abs, time: rule.timeSelector ? node.find(rule.timeSelector).first().text().trim() : undefined });
      });
      // 正文抓取（限速）
      for (const entry of entries.slice(0, 20)) {
        await sleep(rateLimitMs);
        try {
          const detailHtml = await fetchText(entry.url, timeoutMs, ua);
          const $$ = cheerio.load(detailHtml);
          const contentSel = rule.contentSelector ?? ".content, .article-content, #content, main";
          const contentHtml = $$(contentSel).first().html() ?? detailHtml;
          const parsedTime = entry.time ? new Date(entry.time) : undefined;
          const validTime = parsedTime && !Number.isNaN(parsedTime.getTime()) ? parsedTime : undefined;
          items.push({
            title: entry.title,
            url: entry.url,
            contentMd: htmlToMarkdown(contentHtml, entry.url),
            publishTime: validTime,
          });
        } catch {
          items.push({ title: entry.title, url: entry.url });
        }
      }
    }

    let newCount = 0;
    let skipCount = 0;
    let failed = 0;
    const appDomain = process.env.APP_DOMAIN ? `https://${process.env.APP_DOMAIN}` : origin;
    for (const item of items) {
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
        contentMd = await transferImagesInMarkdown(contentMd, timeoutMs, ua, appDomain);
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
    const errMsg = err instanceof Error ? err.message : String(err);
    await prisma.collectTask.update({ where: { id: task.id }, data: { status: "failed", finishedAt: new Date(), errMsg } });
    await prisma.collectSource.update({ where: { id: source.id }, data: { lastRunAt: new Date(), lastStatus: "failed", errMsg } });
    throw err;
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
