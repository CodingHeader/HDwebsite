/**
 * C-06 路由测试：知识库 API（库 CRUD / 文件上传三重校验 / 删除级联 / 重解析 / 进度 / kb/test 扩 baseIds·topK）。
 * - 用 api-contract harness：临时 SQLite（全部 migrations）+ 造角色/用户/token
 * - 上传：直接构造 multipart Request（Node 24 原生 File/FormData）
 * - 磁盘落盘：spyOn(process, "cwd") 指向临时目录（kbDir() 依赖 process.cwd()），afterAll 清理
 * - kb/test：mock searchLocalWeighted 与 searchViaCoze（不触网、不依赖真实 provider）
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { deflateRawSync, crc32 } from "node:zlib";

vi.hoisted(() => {
  const tmp = process.env.TMPDIR || process.env.TEMP || "/tmp";
  process.env.DATABASE_URL = `file:${tmp}/hdw-contract-c06-${process.pid}-${Date.now()}.db`;
});

import { prisma } from "@/lib/prisma";
import { cleanupTestDb, createActor, ctx, initTestDb, json, req } from "../api-contract/harness";
import { KB_REJECT_MESSAGE } from "@/contracts/kb";
import { GET as basesGET, POST as basesPOST } from "@/app/api/knowledge-bases/route";
import { GET as baseGET, PUT as basePUT, DELETE as baseDELETE } from "@/app/api/knowledge-bases/[id]/route";
import { GET as filesGET, POST as filesPOST } from "@/app/api/knowledge-files/route";
import { GET as fileGET, PUT as filePUT, DELETE as fileDELETE } from "@/app/api/knowledge-files/[id]/route";
import { POST as reparsePOST } from "@/app/api/knowledge-files/[id]/reparse/route";
import { GET as progressGET } from "@/app/api/knowledge-files/[id]/progress/route";
import { POST as kbTestPOST } from "@/app/api/kb/test/route";

let ADMIN = "";
let NOPERM = "";
let cwdMock: ReturnType<typeof vi.spyOn>;

// 磁盘临时目录（kbDir() 依赖 process.cwd()）
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "hdw-c06-"));

beforeAll(async () => {
  await initTestDb();
  // V7-T-01 隔离：mammoth 为动态 import，首次加载慢会让 docx 用例 5s 超时；
  // 在 beforeAll 预热一次，实际用例不再触发冷加载（不改全局 vitest.config.ts）
  await import("mammoth");
  const admin = await createActor(prisma, "admin", ["kb:list", "kb:create", "kb:edit", "kb:delete"], true);
  ADMIN = admin.token;
  NOPERM = (await createActor(prisma, "noperm", [])).token;
  // 让 storage.kbDir() 指向临时目录（所有文件落盘都在 tmpRoot/data/kb 下，afterAll 清理）
  cwdMock = vi.spyOn(process, "cwd").mockReturnValue(tmpRoot as never);
});

afterAll(async () => {
  cwdMock.mockRestore();
  cleanupTestDb();
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

// ── 工具：构造 multipart 上传请求 ──────────────────────────────────────────
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
function pdfFile(name: string): File {
  return new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x31, 0x2e, 0x37])], name, { type: "application/pdf" });
}
function pngFile(name: string): File {
  return new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])], name, { type: "image/png" });
}

/** 最小可用 docx（zip：word/document.xml，mammoth 可抽取） */
function buildMinimalDocx(text: string): Buffer {
  const files: { name: string; data: Buffer }[] = [
    {
      name: "word/document.xml",
      data: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`,
        "utf8"
      ),
    },
  ];
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  for (const f of files) {
    const nameBuf = Buffer.from(f.name, "utf8");
    const crc = crc32(f.data) >>> 0;
    const compressed = deflateRawSync(f.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(0, 10);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(f.data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, nameBuf, compressed);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(f.data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, nameBuf);
    offset += 30 + nameBuf.length + compressed.length;
  }
  const centralBuf = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, centralBuf, eocd]);
}

describe("C-06 知识库 API", () => {
  it("401：未带 token 访问列表/上传", async () => {
    const res = await basesGET(new Request("http://localhost/api/knowledge-bases"), ctx());
    expect(res.status).toBe(401);
    const res2 = await filesPOST(multipartRequest("/api/knowledge-files", 1, [txtFile("a.txt", "hi")], ""), ctx());
    expect(res2.status).toBe(401);
  });

  it("403：无 kb 权限访问创建", async () => {
    const res = await basesPOST(
      req("/api/knowledge-bases", { method: "POST", token: NOPERM, body: { name: "n", code: "n" } }),
      ctx()
    );
    expect(res.status).toBe(403);
  });

  it("400：code 不合法（契约校验）", async () => {
    const res = await basesPOST(
      req("/api/knowledge-bases", { method: "POST", token: ADMIN, body: { name: "x", code: "Bad Code!" } }),
      ctx()
    );
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.code).toBe(400);
  });

  it("建库 + 列表 + 详情 + 更新 + 删除 闭环", async () => {
    // 创建（Coze 未配置 → cozeDatasetCreated=false，不抛错）
    const create = await basesPOST(
      req("/api/knowledge-bases", {
        method: "POST",
        token: ADMIN,
        body: { name: "招生知识库", code: "admission", description: "招生问答" },
      }),
      ctx()
    );
    expect(create.status).toBe(201);
    const cj = await json(create);
    expect(cj.data.name).toBe("招生知识库");
    expect(cj.data.cozeDatasetCreated).toBe(false);
    const baseId = cj.data.id as number;

    // 列表
    const list = await basesGET(req("/api/knowledge-bases", { token: ADMIN }), ctx());
    const lj = await json(list);
    expect(lj.data.pagination.total).toBeGreaterThanOrEqual(1);
    expect(lj.data.list.find((b: { id: number }) => b.id === baseId)?.code).toBe("admission");

    // 详情
    const one = await baseGET(req(`/api/knowledge-bases/${baseId}`, { token: ADMIN }), ctx({ id: String(baseId) }));
    expect((await json(one)).data.code).toBe("admission");

    // 更新
    const upd = await basePUT(
      req(`/api/knowledge-bases/${baseId}`, { method: "PUT", token: ADMIN, body: { description: "更新描述" } }),
      ctx({ id: String(baseId) })
    );
    expect((await json(upd)).data.description).toBe("更新描述");

    // 404：不存在
    const missing = await baseGET(req("/api/knowledge-bases/99999", { token: ADMIN }), ctx({ id: "99999" }));
    expect(missing.status).toBe(404);

    // 删除
    const del = await baseDELETE(req(`/api/knowledge-bases/${baseId}`, { method: "DELETE", token: ADMIN }), ctx({ id: String(baseId) }));
    expect(del.status).toBe(200);
    const delj = await json(del);
    expect(delj.data.orphanChunks).toBe(0); // 无孤儿切片（本库未上传文件）
    const after = await baseGET(req(`/api/knowledge-bases/${baseId}`, { token: ADMIN }), ctx({ id: String(baseId) }));
    expect(after.status).toBe(404);
  });

  describe("上传三重校验", () => {
    let baseId: number;

    beforeAll(async () => {
      const c = await basesPOST(
        req("/api/knowledge-bases", { method: "POST", token: ADMIN, body: { name: "上传库", code: "upload-test" } }),
        ctx()
      );
      baseId = (await json(c)).data.id as number;
      // cwd 已在顶层 beforeAll 指向 tmpRoot，所有磁盘 IO 都进 tmpRoot
    });

    it("上传 .md → 201，chunkCount > 0，文件落 storage.kbDir()", async () => {
      const md = "报名需要准备身份证与毕业证。\n\n学费按专业不同而不同。";
      const res = await filesPOST(multipartRequest("/api/knowledge-files", baseId, [txtFile("指南.md", md)], ADMIN), ctx());
      expect(res.status).toBe(201);
      const j = await json(res);
      expect(j.data.list).toHaveLength(1);
      const item = j.data.list[0];
      expect(item.chunkCount).toBeGreaterThan(0);
      expect(item.file.localParse).toBe("ok");

      // 落盘校验：kbDir()/baseId/sha256.ext
      const abs = path.join(tmpRoot, "data", "kb", String(baseId), `${item.file.sha256}.md`);
      expect(fs.existsSync(abs)).toBe(true);
      expect(fs.readFileSync(abs, "utf8")).toContain("身份证");

      // 列表可见
      const list = await filesGET(req(`/api/knowledge-files?baseId=${baseId}`, { token: ADMIN }), ctx());
      const lj = await json(list);
      expect(lj.data.pagination.total).toBeGreaterThanOrEqual(1);
    });

    it("上传 .docx → 201 且 chunkCount > 0（mammoth 抽取）", async () => {
      const docx = new File([new Uint8Array(buildMinimalDocx("这是一份 docx 文档，用于验证 C-06 上传入库。"))], "说明.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const res = await filesPOST(multipartRequest("/api/knowledge-files", baseId, [docx], ADMIN), ctx());
      expect(res.status).toBe(201);
      const j = await json(res);
      expect(j.data.list[0].file.localParse).toBe("ok");
      expect(j.data.list[0].chunkCount).toBeGreaterThan(0);
    });

    it("上传 .txt → 201 且 chunkCount > 0（本地切片落 Knowledge）", async () => {
      const res = await filesPOST(multipartRequest("/api/knowledge-files", baseId, [txtFile("说明.txt", "这是一份说明文档。内容略长。")], ADMIN), ctx());
      expect(res.status).toBe(201);
      const j = await json(res);
      expect(j.data.list[0].chunkCount).toBeGreaterThan(0);
      const fid = j.data.list[0].file.id as number;
      const chunks = await prisma.knowledge.count({ where: { fileId: fid } });
      expect(chunks).toBe(j.data.list[0].chunkCount);
    });

    it("上传 .pdf（伪装 .txt）→ 400 + KB_REJECT_MESSAGE", async () => {
      const res = await filesPOST(multipartRequest("/api/knowledge-files", baseId, [pdfFile("伪装.txt")], ADMIN), ctx());
      expect(res.status).toBe(400);
      const j = await json(res);
      expect(j.message).toBe(KB_REJECT_MESSAGE);
    });

    it("上传 .png（扩展名伪装 .md）→ 400 + KB_REJECT_MESSAGE", async () => {
      const res = await filesPOST(multipartRequest("/api/knowledge-files", baseId, [pngFile("假.md")], ADMIN), ctx());
      expect(res.status).toBe(400);
      const j = await json(res);
      expect(j.message).toBe(KB_REJECT_MESSAGE);
    });

    it("上传 .jpg（真图片）→ 400 + KB_REJECT_MESSAGE", async () => {
      const f = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], "photo.jpg", { type: "image/jpeg" });
      const res = await filesPOST(multipartRequest("/api/knowledge-files", baseId, [f], ADMIN), ctx());
      expect(res.status).toBe(400);
      expect((await json(res)).message).toBe(KB_REJECT_MESSAGE);
    });

    it("上传 .exe（扩展名不在白名单）→ 400", async () => {
      const res = await filesPOST(multipartRequest("/api/knowledge-files", baseId, [txtFile("evil.exe", "MZ")], ADMIN), ctx());
      expect(res.status).toBe(400);
      expect((await json(res)).message).toBe(KB_REJECT_MESSAGE);
    });

    it("重复上传（同 baseId+sha256）→ 200 且 status=existing，不新增记录", async () => {
      const content = "去重测试文档内容去重测试文档内容";
      const r1 = await filesPOST(multipartRequest("/api/knowledge-files", baseId, [txtFile("dup.txt", content)], ADMIN), ctx());
      expect(r1.status).toBe(201);
      const first = (await json(r1)).data.list[0];
      expect(first.status).toBe("created");
      const r2 = await filesPOST(multipartRequest("/api/knowledge-files", baseId, [txtFile("dup.txt", content)], ADMIN), ctx());
      expect(r2.status).toBe(200);
      const second = (await json(r2)).data.list[0];
      expect(second.status).toBe("existing");
      expect(second.file.id).toBe(first.file.id);
      expect(second.chunkCount).toBe(first.chunkCount);
    });

    it("多文件上传：11 个 → 400（超上限）；2 个合法 → 201", async () => {
      const over = await filesPOST(multipartRequest("/api/knowledge-files", baseId, Array.from({ length: 11 }, (_, i) => txtFile(`f${i}.txt`, `内容${i}`)), ADMIN), ctx());
      expect(over.status).toBe(400);
      expect((await json(over)).message).toContain("最多上传");

      const two = await filesPOST(multipartRequest("/api/knowledge-files", baseId, [txtFile("a.md", "# A"), txtFile("b.txt", "B 内容")], ADMIN), ctx());
      expect(two.status).toBe(201);
      expect((await json(two)).data.count).toBe(2);
    });

    it("删除文件：级联清理本地切片与磁盘文件；详情 404", async () => {
      const up = await filesPOST(multipartRequest("/api/knowledge-files", baseId, [txtFile("todelete.txt", "待删除内容待删除内容")], ADMIN), ctx());
      const upj = await json(up);
      const fid = upj.data.list[0].file.id as number;
      const sha = upj.data.list[0].file.sha256 as string;

      const detail = await fileGET(req(`/api/knowledge-files/${fid}`, { token: ADMIN }), ctx({ id: String(fid) }));
      expect(detail.status).toBe(200);

      const del = await fileDELETE(req(`/api/knowledge-files/${fid}`, { method: "DELETE", token: ADMIN }), ctx({ id: String(fid) }));
      expect(del.status).toBe(200);

      // 切片已清
      expect(await prisma.knowledge.count({ where: { fileId: fid } })).toBe(0);
      // 磁盘文件已删
      expect(fs.existsSync(path.join(tmpRoot, "data", "kb", String(baseId), `${sha}.txt`))).toBe(false);
      // 详情 404
      const after = await fileGET(req(`/api/knowledge-files/${fid}`, { token: ADMIN }), ctx({ id: String(fid) }));
      expect(after.status).toBe(404);
    });

    it("文件 PUT 只更新 tags", async () => {
      const up = await filesPOST(multipartRequest("/api/knowledge-files", baseId, [txtFile("tag.txt", "打标签内容打标签内容")], ADMIN), ctx());
      const fid = (await json(up)).data.list[0].file.id as number;
      const put = await filePUT(req(`/api/knowledge-files/${fid}`, { method: "PUT", token: ADMIN, body: { tags: ["招生", "重要"] } }), ctx({ id: String(fid) }));
      expect(put.status).toBe(200);
      const j = await json(put);
      expect(JSON.parse(j.data.tags)).toEqual(["招生", "重要"]);
    });

    it("重解析：正常文件重建切片并更新 localParse", async () => {
      const up = await filesPOST(multipartRequest("/api/knowledge-files", baseId, [txtFile("reparse.txt", "重解析内容重解析内容重解析内容重解析内容")], ADMIN), ctx());
      const fid = (await json(up)).data.list[0].file.id as number;
      const r = await reparsePOST(req(`/api/knowledge-files/${fid}/reparse`, { method: "POST", token: ADMIN }), ctx({ id: String(fid) }));
      expect(r.status).toBe(200);
      const j = await json(r);
      expect(j.data.localParse).toBe("ok");
      expect(j.data.chunkCount).toBeGreaterThan(0);
    });

    it("进度：本地返回 localParse/chunkCount；cozeDocumentId 为空时 cozeStatus=null", async () => {
      const up = await filesPOST(multipartRequest("/api/knowledge-files", baseId, [txtFile("progress.txt", "进度内容进度内容进度内容进度内容")], ADMIN), ctx());
      const fid = (await json(up)).data.list[0].file.id as number;
      const r = await progressGET(req(`/api/knowledge-files/${fid}/progress`, { token: ADMIN }), ctx({ id: String(fid) }));
      expect(r.status).toBe(200);
      const j = await json(r);
      expect(j.data.localParse).toBe("ok");
      expect(j.data.chunkCount).toBeGreaterThan(0);
      expect(j.data.cozeStatus).toBeNull();
    });

    it("删除库（含孤儿切片）：orphanChunks > 0", async () => {
      // 建库 → 上传文件 → 直接删 KnowledgeFile 记录（遗留孤儿切片）→ 删库断言孤儿被兜底清除
      const c = await basesPOST(
        req("/api/knowledge-bases", { method: "POST", token: ADMIN, body: { name: "孤儿库", code: "orphan-test" } }),
        ctx()
      );
      const bid = (await json(c)).data.id as number;
      const up = await filesPOST(multipartRequest("/api/knowledge-files", bid, [txtFile("orphan.txt", "孤儿内容孤儿内容孤儿内容")], ADMIN), ctx());
      const fid = (await json(up)).data.list[0].file.id as number;
      // 制造孤儿：直接删文件记录（模拟异常残留），切片仍存在
      await prisma.knowledgeFile.delete({ where: { id: fid } });
      expect(await prisma.knowledge.count({ where: { baseId: bid } })).toBeGreaterThan(0);

      const del = await baseDELETE(req(`/api/knowledge-bases/${bid}`, { method: "DELETE", token: ADMIN }), ctx({ id: String(bid) }));
      expect(del.status).toBe(200);
      const delj = await json(del);
      expect(delj.data.orphanChunks).toBeGreaterThan(0);
      expect(await prisma.knowledge.count({ where: { baseId: bid } })).toBe(0);
      expect(await prisma.knowledgeBase.findUnique({ where: { id: bid } })).toBeNull();
    });

    it("上传 >10MB 单文件 → 400（size 校验）", async () => {
      const big = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "big.txt", { type: "text/plain" });
      const res = await filesPOST(multipartRequest("/api/knowledge-files", baseId, [big], ADMIN), ctx());
      expect(res.status).toBe(400);
      expect((await json(res)).message).toContain("不能超过");
    });
  });

  describe("kb/test 检索测试（扩 baseIds/topK）", () => {
    it("空查询 → 400；正常查询 → 200 且 local 命中按 baseIds 过滤", async () => {
      const localSpy = vi
        .spyOn(await import("@/lib/kb/local"), "searchLocalWeighted")
        .mockResolvedValue([{ source: "local", title: "报名材料", content: "身份证毕业证", score: 3 }]);
      const cozeSpy = vi
        .spyOn(await import("@/lib/kb-adapter"), "searchViaCoze")
        .mockResolvedValue({ ok: false, errMsg: "未配置 Coze" });

      const empty = await kbTestPOST(req("/api/kb/test", { method: "POST", token: ADMIN, body: { query: "  " } }), ctx());
      expect(empty.status).toBe(400);

      const ok = await kbTestPOST(
        req("/api/kb/test", { method: "POST", token: ADMIN, body: { query: "报名需要什么", baseIds: [1, 2], topK: 3 } }),
        ctx()
      );
      expect(ok.status).toBe(200);
      const j = await json(ok);
      expect(j.data.local.hits[0].title).toBe("报名材料");
      expect(j.data.coze.ok).toBe(false);
      expect(localSpy).toHaveBeenCalledWith("报名需要什么", { baseIds: [1, 2], take: 3 });

      localSpy.mockRestore();
      cozeSpy.mockRestore();
    });

    it("topK 越界（0/21）→ 400", async () => {
      const r1 = await kbTestPOST(req("/api/kb/test", { method: "POST", token: ADMIN, body: { query: "x", topK: 0 } }), ctx());
      expect(r1.status).toBe(400);
      const r2 = await kbTestPOST(req("/api/kb/test", { method: "POST", token: ADMIN, body: { query: "x", topK: 21 } }), ctx());
      expect(r2.status).toBe(400);
    });
  });
});