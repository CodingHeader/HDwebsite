/**
 * C-04 单测：Coze 知识库客户端（全 mock，不触网）
 * - URL / Header（Bearer + Agw-Js-Conv: str）/ body（chunk_strategy 必传、format_type 0）
 * - 11 个文件 → 2 批（≤10/批）；md/markdown → txt
 * - 4013 → 权限中文提示；进度映射 0/1/9；删除
 * - 无凭证：processKbSyncQueue 记录原因（skipped + reason）而非抛错
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createDataset,
  pushDocuments,
  getDocumentStatus,
  deleteDocuments,
  mapCozeError,
  setCozeFetch,
  COZE_BATCH_SIZE,
} from "@/lib/kb/coze";

type Call = { url: string; init: { method: string; headers: Record<string, string>; body: string; timeoutMs: number; logTag: string } };
const calls: Call[] = [];

function mockFetch(responder: (body: Record<string, unknown>) => { code: number; msg?: string; data?: unknown }) {
  setCozeFetch(async (url, init) => {
    calls.push({ url, init });
    const parsed = JSON.parse(init.body) as Record<string, unknown>;
    const r = responder(parsed);
    return new Response(JSON.stringify(r), { status: 200, headers: { "Content-Type": "application/json" } });
  });
}

const CFG = { pat: "test-pat", spaceId: "space-1", apiBase: "https://api.coze.cn" };

beforeEach(() => {
  calls.length = 0;
});
afterEach(() => {
  setCozeFetch(null);
  vi.restoreAllMocks();
});

describe("C-04 Coze 知识库客户端", () => {
  it("推文档：URL/Header/body 正确（Bearer、Agw-Js-Conv: str、chunk_strategy、format_type 0）", async () => {
    mockFetch(() => ({ code: 0, data: { document_infos: [{ document_id: "doc-1" }] } }));
    await pushDocuments(CFG, "dataset-9", [{ name: "a.md", content: "正文" }]);

    expect(calls).toHaveLength(1);
    const { url, init } = calls[0];
    expect(url).toBe("https://api.coze.cn/open_api/knowledge/document/create");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer test-pat");
    expect(init.headers["Agw-Js-Conv"]).toBe("str");
    const body = JSON.parse(init.body) as Record<string, unknown>;
    expect(body.dataset_id).toBe("dataset-9");
    // V11-KB-02：官方 create-document 请求体无 space_id（建库才有）
    expect(body.space_id).toBeUndefined();
    expect(body.format_type).toBe(0);
    expect(body.chunk_strategy).toBeTruthy();
    expect(JSON.stringify(body.chunk_strategy)).toContain("separator");
  });

  it("11 个文件 → 分 2 批（每批 ≤10），返回顺序与输入一致", async () => {
    let batch = 0;
    mockFetch((body) => {
      batch++;
      const docs = body.document_bases as { name: string }[];
      return { code: 0, data: { document_infos: docs.map((d, i) => ({ document_id: `b${batch}-${i}-${d.name}` })) } };
    });
    const docs = Array.from({ length: 11 }, (_, i) => ({ name: `f${i}.txt`, content: `c${i}` }));
    const ids = await pushDocuments(CFG, "ds", docs);

    expect(COZE_BATCH_SIZE).toBe(10);
    expect(calls).toHaveLength(2);
    expect((JSON.parse(calls[0].init.body) as { document_bases: unknown[] }).document_bases).toHaveLength(10);
    expect((JSON.parse(calls[1].init.body) as { document_bases: unknown[] }).document_bases).toHaveLength(1);
    expect(ids).toHaveLength(11);
    expect(ids[0]).toContain("f0.txt");
    expect(ids[10]).toContain("f10.txt");
  });

  it("V11-KB-02：文本推送走官方 document_bases 形态（source_info.file_type=document + content）", async () => {
    mockFetch((body) => {
      const bases = body.document_bases as { name: string }[];
      return { code: 0, data: { document_infos: bases.map((_, i) => ({ document_id: `d${i}` })) } };
    });
    await pushDocuments(CFG, "ds", [
      { name: "a.md", content: "1" },
      { name: "d.txt", content: "4" },
    ]);
    const parsed = JSON.parse(calls[0].init.body) as {
      document_bases: { name: string; file_type: string; source_info: { file_type: string; content: string } }[];
    };
    // 旧形态 documents[]/file_type:"txt" 与官方文档不符——现在必须没有 documents 字段
    expect((parsed as { documents?: unknown }).documents).toBeUndefined();
    expect(parsed.document_bases.map((d) => d.name)).toEqual(["a.md", "d.txt"]);
    for (const d of parsed.document_bases) {
      expect(d.file_type).toBe("document");
      expect(d.source_info.file_type).toBe("document");
      expect(typeof d.source_info.content).toBe("string");
    }
  });

  it("建库：带 space_id + chunk_strategy + format_type 0，返回 datasetId", async () => {
    mockFetch(() => ({ code: 0, data: { dataset_id: "ds-77" } }));
    const r = await createDataset(CFG, "我的知识库", "说明");
    const body = JSON.parse(calls[0].init.body) as Record<string, unknown>;
    expect(body.space_id).toBe("space-1");
    expect(body.name).toBe("我的知识库");
    expect(body.format_type).toBe(0);
    expect(r.datasetId).toBe("ds-77");
  });

  it("4013 → 权限中文提示；未知码保留原始信息", async () => {
    mockFetch(() => ({ code: 4013, msg: "no permission" }));
    await expect(pushDocuments(CFG, "ds", [{ name: "a.txt", content: "x" }])).rejects.toThrow(/权限不足/);
    expect(mapCozeError(4013)).toContain("dataset/document 权限");
    expect(mapCozeError(4011)).toContain("PAT 无效");
    expect(mapCozeError(9999, "weird")).toBe("weird");
  });

  it("进度查询：status 0/1/9 映射，含 progress；删除调用正确端点", async () => {
    mockFetch(() => ({ code: 0, data: { document_infos: [{ document_id: "doc-1", status: 1, progress: 100 }] } }));
    const st = await getDocumentStatus(CFG, "ds", "doc-1");
    expect(st).toEqual({ status: 1, progress: 100, error: null });
    expect(calls[0].url).toBe("https://api.coze.cn/open_api/knowledge/document/list");

    mockFetch((body) => ({ code: 0, data: { document_ids: body.document_ids } }));
    await deleteDocuments(CFG, "ds", ["doc-1", "doc-2"]);
    expect(calls[1].url).toBe("https://api.coze.cn/open_api/knowledge/document/delete");
    expect((JSON.parse(calls[1].init.body) as { document_ids: string[] }).document_ids).toEqual(["doc-1", "doc-2"]);
  });

  it("API base 可覆盖（provider.endpoint）", async () => {
    mockFetch(() => ({ code: 0, data: { document_infos: [{ document_id: "d" }] } }));
    await pushDocuments({ ...CFG, apiBase: "https://custom.example.com" }, "ds", [{ name: "a.txt", content: "x" }]);
    expect(calls[0].url.startsWith("https://custom.example.com/open_api/knowledge/")).toBe(true);
  });
});

describe("C-04 无凭证：队列记录原因而非抛错", () => {
  it("未配置 kbCozeProviderId/kbCozeSpaceId → skipped + reason（不抛）", async () => {
    // V7-T-01 隔离：processKbSyncQueue 经 pendingKbSync / configureCozeBackendFromSettings
    // 依赖真 prisma（Setting / Knowledge 表），干净检出时 dev.db 未迁移会抛
    // "no such column Knowledge.baseId"。这里 spyOn prisma 让查询走 mock，不触真实库。
    const { prisma } = await import("@/lib/prisma");
    vi.spyOn(prisma.setting, "findMany").mockResolvedValue([]);
    vi.spyOn(prisma.knowledge, "findMany").mockResolvedValue([]);
    const { processKbSyncQueue } = await import("@/lib/kb-sync");
    const r = await processKbSyncQueue(5);
    expect(r.adapter).toBeNull();
    expect(r.failed).toBe(0);
    expect(typeof r.reason).toBe("string");
    expect(r.reason).toMatch(/未配置|Coze/);
    vi.restoreAllMocks();
  });
});
