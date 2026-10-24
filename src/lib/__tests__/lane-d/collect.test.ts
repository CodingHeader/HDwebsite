/**
 * D-12 采集解析注册表 + 采集图片流式限长 + 批次超时中止。
 *
 * 覆盖：
 * 1. getParser 注册表：html 注入 fetchText fixture → ParsedItem[]；rss 走 mock rss-parser；
 * 2. fetchHtmlDetails / extractHtmlContent：列表→详情 markdown；parseRule 容错；titleSimilarity 不变；
 * 3. transferImage 流式超过 COLLECT_IMAGE_MAX_SIZE 立即中止（私有函数，通过 runSource 端到端验证行为）；
 * 4. runSource 批次超时：fake timers 推进 31 分钟 → collectTask/collectSource 记 failed 并 rethrow；
 * 5. 正常运行（未超时）→ status=done 且不触发失败通知。
 *
 * 测试环境：临时 DATA_DIR；prisma/settings/kb-sync/notify 等外部依赖全部 vi.mock。
 */
process.env.COLLECT_ALLOW_PRIVATE_TARGETS = "1"; // V11-SEC-04：本套件用本地服务器当采集源
import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, readdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const mocks = vi.hoisted(() => ({
  collectTaskCreate: vi.fn(),
  collectTaskUpdate: vi.fn(),
  collectSourceUpdate: vi.fn(),
  collectItemFindUnique: vi.fn(),
  collectItemFindMany: vi.fn(),
  collectItemCreate: vi.fn(),
  notifyCollectFailed: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    collectTask: { create: mocks.collectTaskCreate, update: mocks.collectTaskUpdate },
    collectSource: { update: mocks.collectSourceUpdate },
    collectItem: {
      findUnique: mocks.collectItemFindUnique,
      findMany: mocks.collectItemFindMany,
      create: mocks.collectItemCreate,
    },
    media: { create: vi.fn(async () => ({ id: 1 })) },
    $transaction: vi.fn(async (fn: unknown) => (fn as () => Promise<unknown>)()),
  },
}));
vi.mock("@/lib/settings", () => ({
  getAllSettings: vi.fn(async () => ({
    siteUrl: "",
    collectUserAgent: "D12-Test-UA",
    collectTimeoutMs: "60000000", // 16h：确保 31 分钟触发的是批次超时而非单请求超时
    collectRateLimitMs: "0",
    collectDefaultKnowledge: "true",
  })),
  getAllKeys: vi.fn(async () => []),
}));
vi.mock("@/lib/kb-sync", () => ({
  ingestCollectItem: vi.fn(async () => undefined),
  pendingKbSync: vi.fn(async () => []),
  processKbSyncQueue: vi.fn(async () => ({ synced: 0, failed: 0, adapter: "none" })),
}));
vi.mock("@/lib/content-workflow", () => ({
  scheduleAutoPublish: vi.fn(async () => undefined),
}));
vi.mock("@/lib/log", () => ({ logOperation: vi.fn(async () => undefined) }));
vi.mock("@/lib/notify-gateway", () => ({ notifyCollectFailed: mocks.notifyCollectFailed }));
vi.mock("rss-parser", () => ({
  default: class {
    constructor(_opts?: unknown) {}
    async parseString(_xml: string) {
      return {
        items: [
          { title: "RSS-A", link: "https://feed.example/x.xml#a", contentSnippet: "snip-a", isoDate: "2026-01-02T00:00:00Z" },
          { title: "RSS-B", link: "https://feed.example/x.xml#b", contentSnippet: null, isoDate: null },
        ],
      };
    }
  },
}));

import { getParser, parseRule, fetchHtmlDetails, extractHtmlContent } from "@/lib/collect/parsers";
import { runSource, COLLECT_BATCH_TIMEOUT_MS, titleSimilarity } from "@/lib/collect-engine";
import { COLLECT_IMAGE_MAX_SIZE } from "@/lib/storage";
import { prisma } from "@/lib/prisma";

vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

const ORIGINAL_DATADIR = process.env.DATA_DIR;
const ORIGINAL_APPORIGIN = process.env.APP_ORIGIN;
const ORIGINAL_FETCH = globalThis.fetch;

let tmpRoot: string;
let server: http.Server;
let base = "";

function listHtml() {
  return `<html><body><ul class="list"><li><a href="/n/1.html">采集标题一</a></li><li><a href="/n/2.html">采集标题二</a></li></ul></body></html>`;
}

beforeAll(async () => {
  server = http.createServer((rq, rs) => {
    const url = rq.url ?? "/";
    rs.setHeader("content-type", "text/html; charset=utf-8");
    if (url === "/list.html") return rs.end(listHtml());
    const d = url.match(/^\/(n)\/(\d)\.html$/);
    if (d) return rs.end(`<html><body><div class="content"><p>详情正文${d[2]}</p></div></body></html>`);
    rs.statusCode = 404;
    rs.end("nf");
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  process.env.APP_ORIGIN = base;
});

afterAll(async () => {
  server.closeAllConnections?.();
  await new Promise<void>((r) => server.close(() => r()));
  globalThis.fetch = ORIGINAL_FETCH;
  await prisma.$disconnect?.();
});

beforeEach(() => {
  tmpRoot = path.join(os.tmpdir(), `hd-d12-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  process.env.DATA_DIR = tmpRoot;
  mocks.collectTaskCreate.mockReset().mockResolvedValue({ id: 1 });
  mocks.collectTaskUpdate.mockReset().mockResolvedValue({ id: 1 });
  mocks.collectSourceUpdate.mockReset().mockResolvedValue({ id: 1 });
  mocks.collectItemFindUnique.mockReset().mockResolvedValue(null);
  mocks.collectItemFindMany.mockReset().mockResolvedValue([]);
  mocks.collectItemCreate.mockReset().mockResolvedValue({ id: 2 });
  mocks.notifyCollectFailed.mockReset();
});

afterEach(() => {
  if (ORIGINAL_DATADIR === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = ORIGINAL_DATADIR;
  if (ORIGINAL_APPORIGIN === undefined) delete process.env.APP_ORIGIN;
  else process.env.APP_ORIGIN = ORIGINAL_APPORIGIN;
  if (tmpRoot && existsSync(tmpRoot)) rmSync(tmpRoot, { recursive: true, force: true });
  vi.useRealTimers();
  globalThis.fetch = ORIGINAL_FETCH;
});

describe("D-12 采集解析注册表", () => {
  it("getParser('html') 用注入 fetchText 解析列表页 → ParsedItem[]", async () => {
    const parser = getParser("html");
    const items = await parser({
      source: { type: "html", url: `${base}/list.html`, parser: null },
      timeoutMs: 5000,
      ua: "ua",
      fetchText: async () => listHtml(),
    });
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe("采集标题一");
    expect(items[0].url).toContain("/n/1.html");
    expect(items[1].url).toContain("/n/2.html");
  });

  it("getParser('rss') 经注入 fetchText 取 XML 交给 rss-parser（mock parseString）", async () => {
    const parser = getParser("rss");
    const items = await parser({
      source: { type: "rss", url: "https://feed.example/x.xml", parser: null },
      timeoutMs: 5000,
      ua: "ua",
      fetchText: async (url) => {
        expect(url).toBe("https://feed.example/x.xml");
        return "<rss version='2.0'><channel><item><title>RSS-A</title></item></channel></rss>";
      },
    });
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe("RSS-A");
    expect(items[0].contentMd).toBe("snip-a");
    expect(items[1].url).toContain("#b");
  });

  it("getParser('unknown') 抛错，不再静默回退 html", () => {
    expect(() => getParser("unknown-type")).toThrow(/未知采集解析器类型/);
  });

  it("fetchHtmlDetails 逐条抓详情并转 markdown，失败保留列表条目", async () => {
    const entries = [
      { title: "一", url: `${base}/n/1.html` },
      { title: "二", url: `${base}/n/2.html` },
    ];
    // fetchText 用注入 fixture（与本文件 getParser 用例同模式）：不依赖共享 server 的 handler，
    // 该 handler 会被下方"图片流式限长"等 describe 整体替换，用例顺序打乱后不能依赖它
    const detail = (n: string) => `<html><body><div class="content"><p>详情正文${n}</p></div></body></html>`;
    const out = await fetchHtmlDetails(entries, {
      timeoutMs: 5000,
      ua: "ua",
      rule: {},
      rateLimitMs: 0,
      fetchText: async (u) => (u.endsWith("/n/1.html") ? detail("1") : detail("2")),
      toMarkdown: (html) => html.replace(/<[^>]+>/g, ""),
    });
    expect(out).toHaveLength(2);
    expect(out[0].contentMd).toContain("详情正文1");
    expect(out[1].contentMd).toContain("详情正文2");
    expect(extractHtmlContent(`<div class="content"><p>hi</p></div>`, {})).toContain("hi");
  });

  it("parseRule 容错：非法 JSON 返回 {}，不抛", () => {
    expect(parseRule({ parser: "{not json" })).toEqual({});
    expect(parseRule({ parser: '{"listSelector":"ul"}' })).toEqual({ listSelector: "ul" });
  });

  it("titleSimilarity 仍可用（去重辅助口径不变）", () => {
    expect(titleSimilarity("专升本报名通知", "专升本报名通知")).toBe(1);
    expect(titleSimilarity("完全不同的标题", "专升本报名通知")).toBeLessThan(0.5);
  });
});

describe("D-12 采集图片流式限长（端到端：runSource 抓详情含超限图）", () => {
  it("详情页图片超过 COLLECT_IMAGE_MAX_SIZE → 图片不落盘，条目仍入库", async () => {
    const CHUNK = 1024 * 1024;
    const overSize = COLLECT_IMAGE_MAX_SIZE + CHUNK;
    let written = 0;

    server.removeAllListeners("request");
    server.on("request", (rq, rs) => {
      const url = rq.url ?? "/";
      if (url === "/big/list.html") {
        rs.setHeader("content-type", "text/html");
        return rs.end('<html><body><ul class="list"><li><a href="/big/1.html">大图条目</a></li></ul></body></html>');
      }
      if (url === "/big/1.html") {
        rs.setHeader("content-type", "text/html");
        return rs.end('<html><body><div class="content"><p>正文</p><img src="/big/huge.jpg"></div></body></html>');
      }
      if (url === "/big/huge.jpg") {
        // 流式超大图：超过 COLLECT_IMAGE_MAX_SIZE 后必须被 transferImage 中止
        rs.writeHead(200, { "Content-Type": "image/jpeg", "Content-Length": String(overSize + CHUNK) });
        const t = setInterval(() => {
          if (written >= overSize) return clearInterval(t);
          if (rs.destroyed) return clearInterval(t);
          rs.write(Buffer.alloc(CHUNK));
          written += CHUNK;
        }, 1);
        rs.on("close", () => clearInterval(t));
        return;
      }
      rs.statusCode = 404;
      rs.end("nf");
    });

    const source = {
      id: 1,
      type: "html",
      url: `${base}/big/list.html`,
      parser: '{"contentSelector":".content"}',
      name: "D12超大图源",
      autoToKb: false,
      autoApprove: false,
    } as never;
    const r = await runSource(source);
    expect(r.newCount).toBe(1);
    // 无图片落盘（只有 uploads 根，无 collect/ 子目录）
    const collectDir = path.join(tmpRoot, "uploads", "collect");
    const files = existsSync(collectDir) ? (readdirSync(collectDir, { recursive: true }) as string[]) : [];
    expect(files).toHaveLength(0);
  });

  it("正常尺寸图片可转存为本地文件", async () => {
    server.removeAllListeners("request");
    server.on("request", (rq, rs) => {
      const url = rq.url ?? "/";
      if (url === "/ok/list.html") {
        rs.setHeader("content-type", "text/html");
        return rs.end('<html><body><ul class="list"><li><a href="/ok/1.html">小图条目</a></li></ul></body></html>');
      }
      if (url === "/ok/1.html") {
        rs.setHeader("content-type", "text/html");
        return rs.end('<html><body><div class="content"><p>正文</p><img src="/ok/small.png"></div></body></html>');
      }
      if (url === "/ok/small.png") {
        rs.writeHead(200, { "Content-Type": "image/png" });
        return rs.end(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
      }
      rs.statusCode = 404;
      rs.end("nf");
    });

    const source = {
      id: 2,
      type: "html",
      url: `${base}/ok/list.html`,
      parser: '{"contentSelector":".content"}',
      name: "D12小图源",
      autoToKb: false,
      autoApprove: false,
    } as never;
    const r = await runSource(source);
    expect(r.newCount).toBe(1);
    const collectDir = path.join(tmpRoot, "uploads", "collect");
    const files = existsSync(collectDir) ? (readdirSync(collectDir, { recursive: true }) as string[]) : [];
    expect(files.some((f) => f.endsWith(".png"))).toBe(true);
  });
});

describe("D-12 批次超时（REQ-NF-001 AC3）", () => {
  it("fake timers 推进 31 分钟 → collectTask/collectSource 记 failed，异常向上抛", async () => {
    expect(COLLECT_BATCH_TIMEOUT_MS).toBe(30 * 60 * 1000);

    // fetch 永不自行完成，仅当 signal abort 时 reject（批次超时由 deadline interval 触发 abort）
    globalThis.fetch = ((url: string, init?: RequestInit) => {
      void url;
      return new Promise<Response>((_resolve, reject) => {
        const sig = init?.signal;
        sig?.addEventListener("abort", () => reject(new DOMException("aborted-by-batch-deadline", "AbortError")), { once: true });
      });
    }) as unknown as typeof fetch;

    vi.useFakeTimers();
    const source = {
      id: 1,
      type: "html",
      url: `${base}/d/list.html`,
      parser: null,
      name: "D12超时源",
      autoToKb: false,
      autoApprove: false,
    } as never;
    const p = runSource(source);
    // 立即挂 handler，避免在 advanceTimersByTimeAsync 期间出现"先拒绝后处理"的 unhandled rejection
    const caught = p.catch((e) => e);
    await vi.advanceTimersByTimeAsync(31 * 60 * 1000);

    const err = await caught;
    expect(err).toBeInstanceOf(Error);
    // catch 把 abort 归一化为可读的批次超时信息，不再泄漏内部 AbortError
    expect(String((err as Error).message)).toContain("采集批次超时（30 分钟）");
    expect(mocks.collectTaskUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 }, data: expect.objectContaining({ status: "failed" }) })
    );
    expect(mocks.collectSourceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 }, data: expect.objectContaining({ lastStatus: "failed" }) })
    );
    // 从未标 done
    expect(mocks.collectTaskUpdate.mock.calls.every((c) => (c[0] as { data: { status?: string } }).data.status !== "done")).toBe(true);
  });

  it("正常运行（未超时）→ status=done 且不触发失败通知", async () => {
    server.removeAllListeners("request");
    server.on("request", (rq, rs) => {
      const url = rq.url ?? "/";
      if (url === "/normal/list.html") {
        rs.setHeader("content-type", "text/html");
        return rs.end(listHtml());
      }
      if (url.startsWith("/normal/")) {
        rs.setHeader("content-type", "text/html");
        return rs.end('<html><body><div class="content"><p>正文</p></div></body></html>');
      }
      rs.statusCode = 404;
      rs.end("nf");
    });
    globalThis.fetch = (async (url: string, init?: RequestInit) => ORIGINAL_FETCH(url, init)) as unknown as typeof fetch;
    const source = {
      id: 1,
      type: "html",
      url: `${base}/normal/list.html`,
      parser: '{"contentSelector":".content"}',
      name: "D12正常源",
      autoToKb: false,
      autoApprove: false,
    } as never;
    const r = await runSource(source);
    expect(r.newCount).toBe(2);
    expect(mocks.collectTaskUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "done" }) })
    );
    expect(mocks.notifyCollectFailed).not.toHaveBeenCalled();
  });
});