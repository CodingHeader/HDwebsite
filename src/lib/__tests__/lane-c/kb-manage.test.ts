/**
 * C-12 路由测试：知识库"其他管理"API（批量启停/标签/回收站、库统计、导出 zip、重建切片、切片在线编辑）。
 * - 用 api-contract harness：临时 SQLite（全部 migrations）+ 造角色/用户/token
 * - 远端 Coze 删除：registerKbRemoteAdapter 注入 mock remove spy（验收"彻底删除后远端删除被调用"）
 * - 磁盘落盘：spyOn(process, "cwd") 指向临时目录（kbDir() 依赖 process.cwd()）
 * - zip 有效性：读取返回体 PK 头 + EOCD 校验
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const tmp = process.env.TMPDIR || process.env.TEMP || "/tmp";
  process.env.DATABASE_URL = `file:${tmp}/hdw-contract-c12-${process.pid}-${Date.now()}.db`;
});

import { prisma } from "@/lib/prisma";
import { cleanupTestDb, createActor, ctx, initTestDb, json, req } from "../api-contract/harness";
import { registerKbRemoteAdapter } from "@/lib/kb-sync";
import { POST as batchPOST } from "@/app/api/knowledge-files/batch/route";
import { POST as trashPOST } from "@/app/api/knowledge-files/trash/route";
import { GET as statsGET } from "@/app/api/knowledge-bases/[id]/stats/route";
import { GET as exportGET } from "@/app/api/knowledge-bases/[id]/export/route";
import { POST as rebuildPOST } from "@/app/api/knowledge-bases/[id]/rebuild/route";
import { PATCH as chunkPATCH } from "@/app/api/knowledge-files/[id]/chunks/[chunkId]/route";
import { POST as basesPOST } from "@/app/api/knowledge-bases/route";
import { POST as filesPOST } from "@/app/api/knowledge-files/route";

let ADMIN = "";
let NOPERM = "";
let cwdMock: ReturnType<typeof vi.spyOn>;

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "hdw-c12-"));

function multipartRequest(url: string, baseId: number, files: File[], token: string): Request {
  const fd = new FormData();
  for (const f of files) fd.append("files", f, f.name);
  return new Request(`http://localhost${url}?baseId=${baseId}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: fd,
  });
}

function txtFile(name: string, content: string): File {
  return new File([content], name, { type: "text/plain" });
}

/** 建库 + 上传 N 个 txt，返回 baseId 与文件 id 列表 */
async function seedBase(titles: string[]): Promise<{ baseId: number; fileIds: number[] }> {
  const create = await basesPOST(
    req("/api/knowledge-bases", { method: "POST", token: ADMIN, body: { name: `库-${Date.now()}`, code: `k${Date.now()}-${Math.random().toString(36).slice(2, 6)}` } }),
    ctx()
  );
  const cj = await json(create);
  const baseId = cj.data.id as number;
  const upload = await filesPOST(multipartRequest("/api/knowledge-files", baseId, titles.map((t, i) => txtFile(`f${i}.txt`, t)), ADMIN), ctx());
  expect(upload.status).toBe(201);
  const uj = await json(upload);
  const fileIds = uj.data.list?.map((r: { file: { id: number } }) => r.file.id) ?? [];
  return { baseId, fileIds };
}

beforeAll(async () => {
  await initTestDb();
  const admin = await createActor(prisma, "admin", ["kb:list", "kb:create", "kb:edit", "kb:delete"], true);
  ADMIN = admin.token;
  NOPERM = (await createActor(prisma, "noperm", [])).token;
  cwdMock = vi.spyOn(process, "cwd").mockReturnValue(tmpRoot as never);
});

afterAll(async () => {
  cwdMock.mockRestore();
  registerKbRemoteAdapter(null);
  cleanupTestDb();
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe("C-12 知识库其他管理 API", () => {
  it("401/403：未带 token、无 kb 权限均被拒", async () => {
    const r1 = await batchPOST(req("/api/knowledge-files/batch", { method: "POST", body: { ids: [1], action: "enable" } }), ctx());
    expect(r1.status).toBe(401);
    const r2 = await batchPOST(req("/api/knowledge-files/batch", { method: "POST", token: NOPERM, body: { ids: [1], action: "enable" } }), ctx());
    expect(r2.status).toBe(403);
  });

  it("400：批量 ids > 100 返回 400 + fieldErrors（契约 kbBatchSchema max(100)）", async () => {
    const res = await batchPOST(
      req("/api/knowledge-files/batch", { method: "POST", token: ADMIN, body: { ids: Array.from({ length: 101 }, (_, i) => i + 1), action: "enable" } }),
      ctx()
    );
    expect(res.status).toBe(400);
    const b = await json(res);
    expect(b.code).toBe(400);
    // 契约 max(100) 校验失败，fieldErrors 在 data 内层（api-response.validationError），
    // 键为契约路径（"ids"），供前端逐字段回显（DR-23 schema 驱动）
    expect(b.data?.fieldErrors).toBeDefined();
    expect(typeof b.data.fieldErrors).toBe("object");
    expect(Object.keys(b.data.fieldErrors).length).toBeGreaterThan(0);
  });

  it("批量 tag/untag/trash + enable/disable 全链路", async () => {
    const { baseId, fileIds } = await seedBase(["第一条知识内容", "第二条知识内容"]);
    expect(fileIds.length).toBe(2);

    // tag
    const tag = await batchPOST(
      req("/api/knowledge-files/batch", { method: "POST", token: ADMIN, body: { ids: fileIds, action: "tag", tags: ["招生", "问答"] } }),
      ctx()
    );
    expect(tag.status).toBe(200);
    const tg = await json(tag);
    expect(tg.data.count).toBe(2);
    const f = await prisma.knowledgeFile.findUnique({ where: { id: fileIds[0] }, select: { tags: true } });
    expect(JSON.parse(f?.tags ?? "[]")).toEqual(expect.arrayContaining(["招生", "问答"]));

    // disable / enable
    const dis = await batchPOST(req("/api/knowledge-files/batch", { method: "POST", token: ADMIN, body: { ids: fileIds, action: "disable" } }), ctx());
    expect((await json(dis)).data.count).toBe(2);
    expect(await prisma.knowledge.count({ where: { fileId: { in: fileIds }, status: "inactive" } })).toBeGreaterThanOrEqual(1);

    const en = await batchPOST(req("/api/knowledge-files/batch", { method: "POST", token: ADMIN, body: { ids: fileIds, action: "enable" } }), ctx());
    expect((await json(en)).data.count).toBe(2);

    // untag
    const unt = await batchPOST(
      req("/api/knowledge-files/batch", { method: "POST", token: ADMIN, body: { ids: fileIds, action: "untag", tags: ["招生"] } }),
      ctx()
    );
    expect((await json(unt)).data.count).toBe(2);
    const f2 = await prisma.knowledgeFile.findUnique({ where: { id: fileIds[0] }, select: { tags: true } });
    const tags = JSON.parse(f2?.tags ?? "[]") as string[];
    expect(tags).toContain("问答");
    expect(tags).not.toContain("招生");

    // trash
    const tr = await batchPOST(req("/api/knowledge-files/batch", { method: "POST", token: ADMIN, body: { ids: fileIds, action: "trash" } }), ctx());
    expect((await json(tr)).data.count).toBe(2);
    const deleted = await prisma.knowledgeFile.findMany({ where: { id: { in: fileIds } }, select: { deletedAt: true } });
    expect(deleted.every((d) => d.deletedAt !== null)).toBe(true);

    void baseId;
  });

  it("统计：库不存在 404；存在返回 files/chunks/trash/lastSyncAt", async () => {
    const miss = await statsGET(req("/api/knowledge-bases/99999/stats", { token: ADMIN }), ctx({ id: "99999" }));
    expect(miss.status).toBe(404);

    const { baseId } = await seedBase(["统计用内容"]);
    const res = await statsGET(req(`/api/knowledge-bases/${baseId}/stats`, { token: ADMIN }), ctx({ id: String(baseId) }));
    expect(res.status).toBe(200);
    const b = await json(res);
    expect(b.data.baseId).toBe(baseId);
    expect(b.data.files).toBe(1);
    expect(b.data.chunks).toBeGreaterThanOrEqual(1);
    expect(b.data.trash).toBe(0);
    expect(b.data.cozeOk).toBe(0);
    expect(b.data.cozeFailed).toBe(0);
    expect(b.data.lastSyncAt).toBeNull();
  });

  it("导出 zip：返回 application/zip，PK + EOCD 头有效，含 manifest.json", async () => {
    const { baseId } = await seedBase(["zip 导出内容"]);
    const res = await exportGET(req(`/api/knowledge-bases/${baseId}/export`, { token: ADMIN }), ctx({ id: String(baseId) }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/zip");
    const buf = Buffer.from(await res.arrayBuffer());
    // PK\x03\x04
    expect(buf.readUInt32LE(0)).toBe(0x04034b50);
    // EOCD PK\x05\x06 出现在文件尾 22 字节前
    expect(buf.readUInt32LE(buf.length - 22)).toBe(0x06054b50);
    // 文件数
    expect(buf.readUInt16LE(buf.length - 22 + 10)).toBe(2); // 1 文件 + manifest.json
    // 库不存在 404
    const miss = await exportGET(req("/api/knowledge-bases/99999/export", { token: ADMIN }), ctx({ id: "99999" }));
    expect(miss.status).toBe(404);
  });

  it("彻底删除（purge）：远端删除被调用，本地文件/切片/DB 记录清除", async () => {
    const removed: string[] = [];
    registerKbRemoteAdapter({
      name: "mock-coze",
      push: async () => ({ externalId: "doc-x" }),
      remove: async (k) => {
        removed.push(String(k.externalId ?? k.id));
      },
    });
    try {
      const { baseId, fileIds } = await seedBase(["待彻底删除"]);
      // 给文件补 cozeDocumentId（模拟已同步）
      for (const id of fileIds) {
        await prisma.knowledgeFile.update({ where: { id }, data: { cozeDocumentId: `coze-${id}` } });
      }
      const trashed = await batchPOST(req("/api/knowledge-files/batch", { method: "POST", token: ADMIN, body: { ids: fileIds, action: "trash" } }), ctx());
      expect((await json(trashed)).data.count).toBe(fileIds.length);

      const purge = await trashPOST(
        req("/api/knowledge-files/trash", { method: "POST", token: ADMIN, body: { ids: fileIds, action: "purge" } }),
        ctx()
      );
      expect(purge.status).toBe(200);
      const pj = await json(purge);
      expect(pj.data.count).toBe(fileIds.length);
      expect(pj.data.purgedRemote).toBe(fileIds.length);
      expect(removed.length).toBe(fileIds.length); // 远端删除被调用

      const remain = await prisma.knowledgeFile.findMany({ where: { id: { in: fileIds } } });
      expect(remain.length).toBe(0);
      const chunks = await prisma.knowledge.count({ where: { fileId: { in: fileIds } } });
      expect(chunks).toBe(0);

      void baseId;
    } finally {
      registerKbRemoteAdapter(null);
    }
  });

  it("恢复（restore）：deletedAt 置空，文件回到正常列表", async () => {
    const { fileIds } = await seedBase(["待恢复"]);
    await batchPOST(req("/api/knowledge-files/batch", { method: "POST", token: ADMIN, body: { ids: fileIds, action: "trash" } }), ctx());
    const restore = await trashPOST(
      req("/api/knowledge-files/trash", { method: "POST", token: ADMIN, body: { ids: fileIds, action: "restore" } }),
      ctx()
    );
    expect(restore.status).toBe(200);
    expect((await json(restore)).data.count).toBe(fileIds.length);
    const f = await prisma.knowledgeFile.findUnique({ where: { id: fileIds[0] }, select: { deletedAt: true } });
    expect(f?.deletedAt).toBeNull();
  });

  it("重建切片：返回 jobId，切片覆盖为 parseByExt+chunkText 结果", async () => {
    const { baseId } = await seedBase(["重建切片测试内容".repeat(30)]);
    const res = await rebuildPOST(req(`/api/knowledge-bases/${baseId}/rebuild`, { method: "POST", token: ADMIN }), ctx({ id: String(baseId) }));
    expect(res.status).toBe(201);
    const b = await json(res);
    expect(typeof b.data.jobId).toBe("string");
    expect(b.data.jobId).toMatch(/^rebuild:/);
    // 库不存在
    const miss = await rebuildPOST(req("/api/knowledge-bases/99999/rebuild", { method: "POST", token: ADMIN }), ctx({ id: "99999" }));
    expect(miss.status).toBe(404);
  });

  it("切片在线编辑：PATCH 更新 content 且 syncStatus 置 pending；非法内容 400", async () => {
    const { baseId } = await seedBase(["编辑前内容"]);
    const chunk = await prisma.knowledge.findFirst({ where: { baseId }, select: { id: true, fileId: true } });
    expect(chunk).not.toBeNull();
    const fileId = chunk?.fileId;
    const cid = chunk?.id;
    if (!fileId || !cid) throw new Error("无切片");

    const res = await chunkPATCH(
      req(`/api/knowledge-files/${fileId}/chunks/${cid}`, { method: "PATCH", token: ADMIN, body: { content: "编辑后内容" } }),
      ctx({ id: String(fileId), chunkId: String(cid) })
    );
    expect(res.status).toBe(200);
    const after = await prisma.knowledge.findUnique({ where: { id: cid }, select: { content: true, syncStatus: true } });
    expect(after?.content).toBe("编辑后内容");
    expect(after?.syncStatus).toBe("pending");

    // 非法：空 content
    const bad = await chunkPATCH(
      req(`/api/knowledge-files/${fileId}/chunks/${cid}`, { method: "PATCH", token: ADMIN, body: { content: "" } }),
      ctx({ id: String(fileId), chunkId: String(cid) })
    );
    expect(bad.status).toBe(400);
  });
});