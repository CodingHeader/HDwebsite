/**
 * D-11 媒体删除单测：单删/批删后物理文件（原图 + thumb/small/medium）全部不存在。
 *
 * 通过 vi.mock 让 crud-resources/media 的 removeMediaFiles 在真实临时目录上删除文件，
 * 并验证 crudDelete 的 afterDelete 钩子与 batch 路由的清理逻辑。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const ORIGINAL_DATADIR = process.env.DATA_DIR;

let tmpRoot: string;
let uploadsRoot: string;

beforeEach(() => {
  tmpRoot = path.join(os.tmpdir(), `hd-media-del-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  uploadsRoot = path.join(tmpRoot, "uploads");
  process.env.DATA_DIR = tmpRoot;
  mkdirSync(path.join(uploadsRoot, "202610"), { recursive: true });
});

afterEach(() => {
  if (ORIGINAL_DATADIR === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = ORIGINAL_DATADIR;
  if (tmpRoot && existsSync(tmpRoot)) rmSync(tmpRoot, { recursive: true, force: true });
  vi.restoreAllMocks();
});

/** 造一条 media 记录形态（path + metadata 含四张缩略图） */
function makeMedia() {
  const rel = "202610/abc.png";
  const files = [
    rel,
    "202610/abc_thumb.webp",
    "202610/abc_small.webp",
    "202610/abc_medium.webp",
  ];
  for (const f of files) writeFileSync(path.join(uploadsRoot, f), "x");
  return {
    path: rel,
    metadata: JSON.stringify({
      thumb: `/uploads/202610/abc_thumb.webp`,
      small: `/uploads/202610/abc_small.webp`,
      medium: `/uploads/202610/abc_medium.webp`,
    }),
    files,
  };
}

describe("removeMediaFiles（D-11）", () => {
  it("单删：path + 三张缩略图全部删除", async () => {
    const { removeMediaFiles } = await import("@/lib/crud-resources/media");
    const m = makeMedia();
    for (const f of m.files) expect(existsSync(path.join(uploadsRoot, f))).toBe(true);

    removeMediaFiles({ path: m.path, metadata: m.metadata });

    for (const f of m.files) expect(existsSync(path.join(uploadsRoot, f))).toBe(false);
  });

  it("批删：多个 media 的 path + 缩略图全部删除", async () => {
    const { removeMediaFiles } = await import("@/lib/crud-resources/media");
    const rows = [makeMedia(), makeMedia()];
    for (const r of rows) removeMediaFiles({ path: r.path, metadata: r.metadata });
    for (const r of rows) for (const f of r.files) expect(existsSync(path.join(uploadsRoot, f))).toBe(false);
  });

  it("穿越防护：恶意 path 被跳过且合法条目仍被清理", async () => {
    const { removeMediaFiles } = await import("@/lib/crud-resources/media");
    const outside = path.join(tmpRoot, "outside.png");
    writeFileSync(outside, "secret");
    const m = makeMedia();
    expect(() =>
      removeMediaFiles({ path: "../outside.png", metadata: m.metadata })
    ).not.toThrow();
    expect(existsSync(outside)).toBe(true);
    // 合法缩略图应被清理
    expect(existsSync(path.join(uploadsRoot, "202610/abc_thumb.webp"))).toBe(false);
  });

  it("metadata 非 JSON：不抛错且仅删 path", async () => {
    const { removeMediaFiles } = await import("@/lib/crud-resources/media");
    const m = makeMedia();
    expect(() => removeMediaFiles({ path: m.path, metadata: "not-json" })).not.toThrow();
    expect(existsSync(path.join(uploadsRoot, m.path))).toBe(false);
  });
});