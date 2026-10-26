import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

vi.hoisted(() => {
  const tmp = process.env.TMPDIR || process.env.TEMP || "/tmp";
  process.env.DATABASE_URL = `file:${tmp}/hdw-contract-ui02-${process.pid}-${Date.now()}.db`;
});

import { cleanupTestDb, createActor, initTestDb, json, req } from "./api-contract/harness";
import { prisma } from "@/lib/prisma";
import { withMissingFiles, importBuiltinsIntoMedia } from "@/lib/crud-resources/media";
import { POST as importBuiltinsPOST } from "@/app/api/media/import-builtins/route";
import { GET as mediaGET } from "@/app/api/media/route";

let tmpRoot: string;

beforeAll(async () => {
  await initTestDb();
}, 60_000);

afterAll(async () => {
  await prisma.$disconnect();
  cleanupTestDb();
});

beforeEach(() => {
  tmpRoot = mkdtempSync(path.join(os.tmpdir(), "hd-media-ui02-"));
  process.env.DATA_DIR = tmpRoot;
});

afterEach(() => {
  delete process.env.DATA_DIR;
  if (existsSync(tmpRoot)) rmSync(tmpRoot, { recursive: true, force: true });
});

describe("媒体库能力补齐（V11-UI-02）", () => {
  it("复制 public 内置资源入库，按 publicUrl 规范化并幂等跳过", async () => {
    const publicRoot = path.join(tmpRoot, "public", "images");
    const uploadsRoot = path.join(tmpRoot, "uploads");
    mkdirSync(publicRoot, { recursive: true });
    const pngPath = path.join(publicRoot, "main.png");
    const jpgPath = path.join(publicRoot, "logo.jpg");
    writeFileSync(pngPath, Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52]));
    writeFileSync(jpgPath, Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01]));
    await prisma.media.deleteMany({ where: { url: { in: ["/images/main.png", "/images/logo.jpg"] } } });

    const imported = await importBuiltinsIntoMedia([
      { publicUrl: path.join("public", "images", "main.png"), path: pngPath, size: 16, type: "image/png" },
      { publicUrl: "/images/logo.jpg", path: jpgPath, size: 16, type: "image/jpeg" },
    ]);

    expect(imported.total).toBe(2);
    expect(imported.created.map((row) => row.url)).toEqual(["/images/main.png", "/images/logo.jpg"]);
    expect(imported.created.every((row) => row.filename.endsWith(".png") || row.filename.endsWith(".jpg"))).toBe(true);
    expect(imported.failed).toEqual([]);
    expect(readFileSync(path.join(uploadsRoot, "builtin", "public_images_main.png"))[0]).toBe(0x89);
    expect(readFileSync(path.join(uploadsRoot, "builtin", "public_images_logo.jpg"))[0]).toBe(0xff);

    const second = await importBuiltinsIntoMedia([
      { publicUrl: "public/images/main.png", path: pngPath, size: 16, type: "image/png" },
      { publicUrl: "/images/logo.jpg", path: jpgPath, size: 16, type: "image/jpeg" },
    ]);
    expect(second.created).toEqual([]);
    expect(second.skipped).toHaveLength(2);
  });

  it("拒绝内容不匹配的内置资源写入，避免伪造扩展名入库", async () => {
    const outside = path.join(tmpRoot, "outside.png");
    writeFileSync(outside, "secret");
    const result = await importBuiltinsIntoMedia([{ publicUrl: "/hack.png", path: outside, size: 6, type: "image/png" }]);

    expect(result.failed).toHaveLength(1);
    expect(result.created).toEqual([]);
    expect(existsSync(outside)).toBe(true);
  });

  it("列表按真实文件状态标记 missing，并按分类过滤", async () => {
    const uploadsRoot = path.join(tmpRoot, "uploads");
    mkdirSync(path.join(uploadsRoot, "ok"), { recursive: true });
    writeFileSync(path.join(uploadsRoot, "ok", "visible.png"), Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52]));
    await prisma.media.deleteMany({ where: { url: { in: ["/uploads/ok/visible.png", "/uploads/missing/lost.png"] } } });
    await prisma.media.createMany({
      data: [
        { filename: "visible.png", path: "ok/visible.png", url: "/uploads/ok/visible.png", mimeType: "image/png", size: 16, type: "image", category: "校园" },
        { filename: "lost.png", path: "missing/lost.png", url: "/uploads/missing/lost.png", mimeType: "image/png", size: 16, type: "image", category: "证书" },
      ],
    });

    expect(
      withMissingFiles([
        { id: 1, url: "/uploads/ok/visible.png" },
        { id: 2, url: "/uploads/missing/lost.png" },
      ])
    ).toEqual([
      { id: 1, url: "/uploads/ok/visible.png", missing: false },
      { id: 2, url: "/uploads/missing/lost.png", missing: true },
    ]);

    const actor = await createActor(prisma, "media-admin", ["media:list", "media:create"], true);
    const res = await mediaGET(req("/api/media?category=%E6%A0%A1%E5%9B%AD", { token: actor.token }), { params: Promise.resolve({}) });
    const body = await json(res);
    expect(res.status).toBe(200);
    expect(body.data.list).toHaveLength(1);
    expect(body.data.list[0].missing).toBe(false);
    expect(body.data.list[0].category).toBe("校园");
  });

  it("导入内置资源 API 要求 media:create 权限并返回统计", async () => {
    await prisma.media.deleteMany({});
    await prisma.operationLog.deleteMany({ where: { module: "media", action: "import-builtins" } });
    const actor = await createActor(prisma, "media-importer", ["media:create", "media:list"], true);
    const res = await importBuiltinsPOST(req("/api/media/import-builtins", { method: "POST", token: actor.token }), { params: Promise.resolve({}) });
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.code).toBe(200);
    expect(body.data.total).toBeGreaterThanOrEqual(0);
    expect(body.data.created).toBeInstanceOf(Array);
    expect(body.data.skipped).toBeInstanceOf(Array);
    expect(body.data.failed).toBeInstanceOf(Array);
    expect(await prisma.operationLog.count({ where: { module: "media", action: "import-builtins" } })).toBe(1);
  });
});
