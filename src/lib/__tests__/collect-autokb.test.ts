/**
 * P06 评审 #2：采集默认入知识库（M-8 / ADR-025）。autoToKb=true 的源运行一次后，
 * 新条目 knowledgeId 非空、可被本地检索命中，并进入远端知识库同步队列（P12 接 Coze）；
 * autoToKb=false 不入库；autoApprove=true 直接生成 approved 内容（超管预授权，留 OperationLog）。
 */
import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const tmp = process.env.TMPDIR || "/tmp";
  process.env.DATABASE_URL = `file:${tmp}/hdw-contract-p06kb-${process.pid}-${Date.now()}.db`;
});

import { prisma } from "@/lib/prisma";
import { cleanupTestDb, initTestDb } from "./api-contract/harness";
import { runSource } from "@/lib/collect-engine";
import { searchLocal } from "@/lib/kb-adapter";
import { pendingKbSync, processKbSyncQueue, registerKbRemoteAdapter } from "@/lib/kb-sync";

vi.setConfig({ testTimeout: 30_000 });

let server: http.Server;
let base = "";

function listHtml(prefix: string) {
  return `<html><body><ul class="list"><li><a href="/${prefix}/1.html">${prefix}专升本报名通知</a></li><li><a href="/${prefix}/2.html">${prefix}成考时间安排</a></li></ul></body></html>`;
}

beforeAll(async () => {
  await initTestDb();
  await prisma.setting.createMany({
    data: [
      { key: "collectRateLimitMs", value: "0", group: "collect" },
      { key: "collectTimeoutMs", value: "5000", group: "collect" },
    ],
  });
  server = http.createServer((rq, rs) => {
    const url = rq.url ?? "/";
    rs.setHeader("content-type", "text/html; charset=utf-8");
    const m = url.match(/^\/(\w+)\/list\.html$/);
    if (m) return rs.end(listHtml(m[1]));
    const d = url.match(/^\/(\w+)\/(\d)\.html$/);
    if (d) return rs.end(`<html><body><div class="content"><p>${d[1]}正文${d[2]}：弘道专升本资讯关键字KBHIT${d[1]}</p></div></body></html>`);
    rs.statusCode = 404;
    rs.end("nf");
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => {
  server.close();
  await prisma.$disconnect();
  cleanupTestDb();
});

describe("采集默认入知识库", () => {
  it("autoToKb=true：新条目 knowledgeId 非空且可检索，进入同步队列", async () => {
    const source = await prisma.collectSource.create({ data: { name: "源A", type: "html", url: `${base}/a/list.html` } });
    expect(source.autoToKb).toBe(true);
    expect(source.autoApprove).toBe(false);
    const r = await runSource(source);
    expect(r.newCount).toBe(2);
    const items = await prisma.collectItem.findMany({ where: { sourceId: source.id } });
    expect(items).toHaveLength(2);
    for (const it of items) {
      expect(it.knowledgeId).not.toBeNull();
      expect(it.status).toBe("new"); // 仍待审核（审核门不变）
    }
    const hits = await searchLocal("KBHITa");
    expect(hits.length).toBeGreaterThan(0);
    const queue = await pendingKbSync();
    expect(queue.map((k) => k.id).sort()).toEqual(items.map((i) => i.knowledgeId!).sort());
  });

  it("远端适配器注册后处理队列：成功 → synced 且回写 kbSyncedAt", async () => {
    const pushed: string[] = [];
    registerKbRemoteAdapter({ name: "mock", push: async (k) => { pushed.push(k.title); return { externalId: `doc-${k.id}` }; } });
    const r = await processKbSyncQueue();
    expect(r.synced).toBe(2);
    expect(pushed).toHaveLength(2);
    expect(await pendingKbSync()).toHaveLength(0);
    const items = await prisma.collectItem.findMany();
    expect(items.every((i) => i.kbSyncedAt)).toBe(true);
    registerKbRemoteAdapter(null);
  });

  it("autoToKb=false：不入库", async () => {
    const source = await prisma.collectSource.create({ data: { name: "源B", type: "html", url: `${base}/b/list.html`, autoToKb: false } });
    await runSource(source);
    const items = await prisma.collectItem.findMany({ where: { sourceId: source.id } });
    expect(items).toHaveLength(2);
    expect(items.every((i) => i.knowledgeId === null)).toBe(true);
  });

  it("autoApprove=true：直接生成 approved ContentItem 并记 OperationLog（超管预授权）", async () => {
    const source = await prisma.collectSource.create({ data: { name: "源C", type: "html", url: `${base}/c/list.html`, autoApprove: true } });
    await runSource(source);
    const items = await prisma.collectItem.findMany({ where: { sourceId: source.id }, include: { contentItem: true } });
    expect(items.every((i) => i.status === "approved" && i.contentItem?.status === "approved")).toBe(true);
    expect(await prisma.operationLog.count({ where: { module: "review", action: "auto_approve" } })).toBe(2);
  });
});
