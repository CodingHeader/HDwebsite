/**
 * P06 评审 #2：采集默认入知识库（M-8 / ADR-025）。autoToKb=true 的源运行一次后，
 * 新条目 knowledgeId 非空、可被本地检索命中，并进入远端知识库同步队列（P12 接 Coze）；
 * autoToKb=false 不入库；autoApprove=true 直接生成 approved 内容（超管预授权，留 OperationLog）。
 *
 * C-08（V0.6，G10）扩展断言：
 * - 目标库落位：CollectSource.knowledgeBaseId 优先，否则 seed 的 `collect` 采集资讯库
 * - 双向回链：入库同时镜像 KnowledgeFile，collectItemId 指回来源 CollectItem
 * - 推送形态：mock Coze 收到 file_type=txt 且 dataset_id 取目标库 cozeDatasetId（ADR-025 §6）
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
import { makeCozeBackend, setCozeFetch } from "@/lib/kb/coze";
import { __clearKnowledgeBackends, registerKnowledgeBackend } from "@/lib/kb/registry";

vi.setConfig({ testTimeout: 30_000 });

let server: http.Server;
let base = "";
let collectBaseId = 0;

function listHtml(prefix: string) {
  return `<html><body><ul class="list"><li><a href="/${prefix}/1.html">${prefix}专升本报名通知</a></li><li><a href="/${prefix}/2.html">${prefix}成考时间安排</a></li></ul></body></html>`;
}

beforeAll(async () => {
  await initTestDb();
  // C-08：测试库无 seed，需手动建默认采集资讯库（kb-sync.DEFAULT_COLLECT_BASE_CODE="collect"）
  const collect = await prisma.knowledgeBase.create({
    data: { name: "采集资讯", code: "collect", description: "默认采集落库", isDefault: false, sort: 2 },
  });
  collectBaseId = collect.id;
  await prisma.setting.createMany({
    data: [
      { key: "collectRateLimitMs", value: "0", group: "collect" },
      { key: "collectTimeoutMs", value: "5000", group: "collect" },
    ],
  });
  // C-08：注册 Coze 后端（makeCozeBackend + 可注入 fetch），让 processKbSyncQueue 能走真实 Coze 客户端路径
  __clearKnowledgeBackends();
  registerKnowledgeBackend(
    makeCozeBackend(() => ({ pat: "test-pat", spaceId: "space-1", apiBase: "https://api.coze.cn", timeoutMs: 30_000 }))
  );
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
  setCozeFetch(null);
  __clearKnowledgeBackends();
  await prisma.$disconnect();
  cleanupTestDb();
});

describe("采集默认入知识库", () => {
  it("C-08：默认库落位——Knowledge.baseId = seed 的 collect 库，且 G10 KnowledgeFile.collectItemId 双向回链", async () => {
    const source = await prisma.collectSource.create({ data: { name: "源A", type: "html", url: `${base}/a/list.html` } });
    expect(source.autoToKb).toBe(true);
    const r = await runSource(source);
    expect(r.newCount).toBe(2);
    const items = await prisma.collectItem.findMany({ where: { sourceId: source.id } });
    expect(items).toHaveLength(2);
    for (const it of items) {
      const k = await prisma.knowledge.findUnique({ where: { id: it.knowledgeId! } });
      expect(k?.baseId).toBe(collectBaseId);
      expect(k?.source).toBe("collect");
      // G10：入库同时镜像 KnowledgeFile，collectItemId 指回来源 CollectItem（双向可查）
      const f = await prisma.knowledgeFile.findFirst({ where: { collectItemId: it.id } });
      expect(f).not.toBeNull();
      expect(f!.baseId).toBe(collectBaseId);
    }
    // 反向可查：由文件 → 采集条目（范围限定本源 items，不依赖其他用例留下的数据）
    const files = await prisma.knowledgeFile.findMany({ where: { collectItemId: { in: items.map((i) => i.id) } } });
    expect(files.length).toBe(2);
    const back = await prisma.collectItem.findUnique({ where: { id: files[0].collectItemId! } });
    expect(back?.knowledgeId).not.toBeNull();
    // 本地检索命中（本地兜底轨行为不变）
    const hits = await searchLocal("KBHITa");
    expect(hits.length).toBeGreaterThan(0);
    // 本源的 2 条新知识全部进入同步队列（队列可能含其他用例的条目，按 id 范围断言）
    const queue = await pendingKbSync();
    const queuedIds = queue.filter((k) => items.some((i) => i.knowledgeId === k.id)).map((k) => k.id).sort();
    expect(queuedIds).toEqual(items.map((i) => i.knowledgeId!).sort());
  });

  it("C-08：源指定 knowledgeBaseId 优先于默认 collect 库", async () => {
    const custom = await prisma.knowledgeBase.create({ data: { name: "定制库", code: "custom-collect" } });
    const source = await prisma.collectSource.create({
      data: { name: "源B", type: "html", url: `${base}/b/list.html`, knowledgeBaseId: custom.id },
    });
    await runSource(source);
    const items = await prisma.collectItem.findMany({ where: { sourceId: source.id } });
    expect(items).toHaveLength(2);
    for (const it of items) {
      const k = await prisma.knowledge.findUnique({ where: { id: it.knowledgeId! } });
      expect(k?.baseId).toBe(custom.id);
      const f = await prisma.knowledgeFile.findFirst({ where: { collectItemId: it.id } });
      expect(f?.baseId).toBe(custom.id);
    }
  });

  it("C-08：mock Coze 收到 file_type=txt，且 dataset_id 取目标库 cozeDatasetId", async () => {
    // 自包含 arrange：清空遗留队列状态（pending/failed → synced），再造 collect 库源A + 未绑定 dataset 的 custom 库源B
    await prisma.knowledge.updateMany({ where: { syncStatus: { in: ["pending", "failed"] } }, data: { syncStatus: "synced" } });
    // "远端适配器"用例的清理（registerKbRemoteAdapter(null)）会注销 coze 后端，这里确保已注册
    registerKnowledgeBackend(
      makeCozeBackend(() => ({ pat: "test-pat", spaceId: "space-1", apiBase: "https://api.coze.cn", timeoutMs: 30_000 }))
    );
    const ds = "coze-ds-collect";
    await prisma.knowledgeBase.update({ where: { id: collectBaseId }, data: { cozeDatasetId: ds } });
    const custom = await prisma.knowledgeBase.create({ data: { name: "定制库C08", code: `custom-c08-${Date.now()}` } });
    const sourceA = await prisma.collectSource.create({ data: { name: "源A-C08", type: "html", url: `${base}/a2/list.html` } });
    await runSource(sourceA);
    const sourceB = await prisma.collectSource.create({
      data: { name: "源B-C08", type: "html", url: `${base}/b2/list.html`, knowledgeBaseId: custom.id },
    });
    await runSource(sourceB);
    const seen: { dataset_id?: string; file_type?: string; name?: string }[] = [];
    setCozeFetch(async (url, init) => {
      void url;
      const body = JSON.parse(init.body) as { dataset_id?: string; documents?: { file_type?: string; name?: string }[] };
      seen.push({ dataset_id: body.dataset_id, file_type: body.documents?.[0]?.file_type, name: body.documents?.[0]?.name });
      return new Response(JSON.stringify({ code: 0, data: { document_infos: [{ document_id: "doc-1" }] } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    try {
      const r = await processKbSyncQueue(50);
      expect(r.adapter).toBe("coze");
      // 队列含 源A-C08（collect 库）与 源B-C08（custom 库）共 4 条
      //  - collect 库已绑定 dataset → 推送到 ds 并 synced（2 条）
      //  - custom 库未绑定 dataset → 记 failed + syncErr（不静默成功，也不推送到 "default"）
      expect(r.synced).toBe(2);
      expect(r.failed).toBe(2);
      expect(seen.length).toBe(2);
      expect(seen.every((s) => s.dataset_id === ds)).toBe(true); // ADR-025 §6：推送到对应 dataset
      expect(seen.every((s) => s.file_type === "txt")).toBe(true); // md/markdown → txt（契约 COZE_FILE_TYPE_MAP）
      const failedCustom = await prisma.knowledge.findMany({ where: { syncStatus: "failed" } });
      expect(failedCustom).toHaveLength(2);
      expect(failedCustom.every((k) => k.syncErr?.includes("未绑定 Coze dataset"))).toBe(true);
      // 源A-C08 的 2 条已 synced
      const aItems = await prisma.collectItem.findMany({ where: { sourceId: sourceA.id } });
      for (const it of aItems) {
        const k = await prisma.knowledge.findUnique({ where: { id: it.knowledgeId! } });
        expect(k?.syncStatus).toBe("synced");
        expect(k?.externalId).toBe("doc-1");
      }
    } finally {
      setCozeFetch(null);
    }
  });

  it("远端适配器注册后处理队列：成功 → synced 且回写 kbSyncedAt（薄包装兼容）", async () => {
    // 自包含 arrange：清空遗留队列状态；再造"未绑定 dataset → failed"（源F）与"pending"（源C）两组
    await prisma.knowledge.updateMany({ where: { syncStatus: { in: ["pending", "failed"] } }, data: { syncStatus: "synced" } });
    registerKnowledgeBackend(
      makeCozeBackend(() => ({ pat: "test-pat", spaceId: "space-1", apiBase: "https://api.coze.cn", timeoutMs: 30_000 }))
    );
    const custom = await prisma.knowledgeBase.create({ data: { name: "定制库F", code: `custom-f-${Date.now()}` } });
    const sourceF = await prisma.collectSource.create({
      data: { name: "源F", type: "html", url: `${base}/f/list.html`, knowledgeBaseId: custom.id },
    });
    await runSource(sourceF);
    // 未绑定 dataset 在 push 前即抛错（不外呼），2 条记 failed（failed 仍在队列）
    await processKbSyncQueue(50);
    expect(await prisma.knowledge.count({ where: { source: "collect", syncStatus: "failed" } })).toBe(2);
    const source = await prisma.collectSource.create({ data: { name: "源C", type: "html", url: `${base}/c/list.html` } });
    await runSource(source);
    const items = await prisma.collectItem.findMany({ where: { sourceId: source.id } });
    const pushed: string[] = [];
    registerKbRemoteAdapter({ name: "mock", push: async (k) => { pushed.push(k.title); return { externalId: `doc-${k.id}` }; } });
    try {
      const r = await processKbSyncQueue();
      // 队列 = 源F 的 2 条 failed（未绑定 dataset）+ 源C 的 2 条 pending；mock 适配器全部成功
      expect(r.synced).toBe(4);
      expect(pushed).toHaveLength(4);
      expect(await pendingKbSync()).toHaveLength(0);
      expect(items.every((i) => i.knowledgeId)).toBe(true);
    } finally {
      registerKbRemoteAdapter(null);
    }
  });

  it("autoToKb=false：不入库", async () => {
    const source = await prisma.collectSource.create({ data: { name: "源D", type: "html", url: `${base}/d/list.html`, autoToKb: false } });
    await runSource(source);
    const items = await prisma.collectItem.findMany({ where: { sourceId: source.id } });
    expect(items).toHaveLength(2);
    expect(items.every((i) => i.knowledgeId === null)).toBe(true);
    // 不镜像 KnowledgeFile
    const files = await prisma.knowledgeFile.findMany({ where: { collectItemId: { in: items.map((i) => i.id) } } });
    expect(files).toHaveLength(0);
  });

  it("autoApprove=true：直接生成 approved ContentItem 并记 OperationLog（超管预授权）", async () => {
    const source = await prisma.collectSource.create({ data: { name: "源E", type: "html", url: `${base}/e/list.html`, autoApprove: true } });
    await runSource(source);
    const items = await prisma.collectItem.findMany({ where: { sourceId: source.id }, include: { contentItem: true } });
    expect(items.every((i) => i.status === "approved" && i.contentItem?.status === "approved")).toBe(true);
    expect(await prisma.operationLog.count({ where: { module: "review", action: "auto_approve" } })).toBe(2);
  });
});