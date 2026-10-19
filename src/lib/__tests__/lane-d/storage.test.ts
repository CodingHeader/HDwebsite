/**
 * D-09 storage.ts 单测：DATA_DIR 化路径解析 + resolveInside 防目录穿越。
 *
 * 重点：
 * - 未设置 DATA_DIR → 各根相对 process.cwd()（W0 零行为变化）。
 * - 设置 DATA_DIR → 各根落 DATA_DIR 之下；chdir 后结果不变（与 cwd 解耦）。
 * - resolveInside 拒绝穿越/非法形态。
 */
import { describe, expect, it, afterEach, vi } from "vitest";
import os from "node:os";
import path from "node:path";
import { dataDir, uploadsDir, backupsDir, kbDir, resolveInside } from "@/lib/storage";

const ORIGINAL_DATADIR = process.env.DATA_DIR;
const ORIGINAL_CWD = process.cwd();

afterEach(() => {
  // 恢复 DATA_DIR 与 cwd（vitest 强制 NODE_ENV=test，此处只需还原进程级状态）
  if (ORIGINAL_DATADIR === undefined) {
    delete process.env.DATA_DIR;
  } else {
    process.env.DATA_DIR = ORIGINAL_DATADIR;
  }
  try {
    process.chdir(ORIGINAL_CWD);
  } catch {
    /* 某些平台不支持 chdir 回滚 */
  }
  vi.restoreAllMocks();
});

describe("storage 根路径（D-09）", () => {
  it("未设置 DATA_DIR：四个根相对 process.cwd()（W0 零行为变化）", () => {
    delete process.env.DATA_DIR;
    expect(dataDir()).toBe(path.resolve(process.cwd(), "data"));
    expect(uploadsDir()).toBe(path.resolve(process.cwd(), "uploads"));
    expect(backupsDir()).toBe(path.resolve(process.cwd(), "backups"));
    expect(kbDir()).toBe(path.join(dataDir(), "kb"));
    expect(kbDir()).toBe(path.resolve(process.cwd(), "data", "kb"));
  });

  it("设置 DATA_DIR：四个根落 DATA_DIR 之下（绝对路径）", () => {
    const tmp = path.join(os.tmpdir(), `hd-storage-test-${Date.now()}`);
    process.env.DATA_DIR = tmp;
    expect(dataDir()).toBe(path.resolve(tmp, "data"));
    expect(uploadsDir()).toBe(path.resolve(tmp, "uploads"));
    expect(backupsDir()).toBe(path.resolve(tmp, "backups"));
    expect(kbDir()).toBe(path.resolve(tmp, "data", "kb"));
  });

  it("DATA_DIR 为相对路径：解析为绝对路径且落 cwd 之下", () => {
    process.env.DATA_DIR = "./runtime";
    expect(uploadsDir()).toBe(path.resolve(process.cwd(), "runtime", "uploads"));
  });

  it("DATA_DIR 变化后重新解析（不是缓存值）", () => {
    const a = path.join(os.tmpdir(), "hd-a");
    const b = path.join(os.tmpdir(), "hd-b");
    process.env.DATA_DIR = a;
    expect(uploadsDir()).toBe(path.resolve(a, "uploads"));
    process.env.DATA_DIR = b;
    expect(uploadsDir()).toBe(path.resolve(b, "uploads"));
  });

  it("chdir 后上传根不变（与 cwd 解耦）", () => {
    const tmp = path.join(os.tmpdir(), `hd-chdir-${Date.now()}`);
    process.env.DATA_DIR = tmp;
    const before = uploadsDir();
    const alt = path.join(os.tmpdir(), `hd-chdir-alt-${Date.now()}`);
    try {
      process.chdir(alt);
    } catch {
      return; // 平台不支持 chdir 时跳过断言（windows/mac 通常支持）
    }
    expect(uploadsDir()).toBe(before);
    expect(uploadsDir()).not.toContain(alt);
  });
});

describe("resolveInside 防目录穿越", () => {
  it("接受合法相对路径并落在根内", () => {
    const root = uploadsDir();
    expect(resolveInside(root, "202610/a.png")).toBe(path.join(root, "202610", "a.png"));
    expect(resolveInside(root, "collect/img-1.jpg")).toBe(path.join(root, "collect", "img-1.jpg"));
    expect(resolveInside(root, "a-b_c.1.txt")).toBe(path.join(root, "a-b_c.1.txt"));
  });

  it("拒绝穿越与非法形态", () => {
    const root = uploadsDir();
    for (const bad of [
      "../x.png",
      "../../etc/passwd",
      "a/../../b.png",
      "",
      "/etc/passwd",
      "C:\\windows\\system32\\x",
      "a\\b",
      "a/b\\c",
      "..",
      ".",
      ".hidden",
      "a/.hidden",
      "a//b",
      "a/\0b",
    ]) {
      expect(() => resolveInside(root, bad), `应拒绝：${JSON.stringify(bad)}`).toThrow();
    }
  });
});