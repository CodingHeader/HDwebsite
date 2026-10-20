/**
 * D-10 备份单测：jobs/tar 的 tar.gz 打包/读回 + jobs/backup 归档三类（db+uploads+kb）+ 保留 14 份。
 *
 * 说明：
 * - 备份任务内部用 @libsql/client 的 VACUUM INTO；单测中 VACUUM 目标为临时目录的伪 db 文件，
 *   通过 vi.mock 让 createClient 抛错以走 copyFileSync 回退（不依赖真实 db 环境）。
 * - 全部路径基于临时 DATA_DIR，避免污染工作区。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdirSync, writeFileSync, existsSync, readdirSync, utimesSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildTarGz, listTar, splitTarPath, collectDirEntries } from "@/lib/jobs/tar";

// mock @libsql/client：备份任务的 createClient 抛错 → 走 copyFileSync 回退
vi.mock("@libsql/client", () => ({
  createClient: vi.fn(() => ({
    execute: async () => {
      throw new Error("mock: VACUUM INTO not supported");
    },
    close: () => undefined,
  })),
}));

import { backupJob } from "@/lib/jobs/backup";

const ORIGINAL_DATADIR = process.env.DATA_DIR;
const ORIGINAL_DBURL = process.env.DATABASE_URL;

let tmpRoot: string;
let backupRoot: string;
let uploadsRoot: string;
let kbRoot: string;
let dbPath: string;

beforeEach(() => {
  tmpRoot = fs_tmp();
  backupRoot = path.join(tmpRoot, "backups");
  uploadsRoot = path.join(tmpRoot, "uploads");
  kbRoot = path.join(tmpRoot, "data", "kb");
  dbPath = path.join(tmpRoot, "dev.db");
  mkdirSync(uploadsRoot, { recursive: true });
  mkdirSync(kbRoot, { recursive: true });
  mkdirSync(path.join(kbRoot, "1"), { recursive: true });
  writeFileSync(dbPath, "fake-sqlite-bytes");
  writeFileSync(path.join(uploadsRoot, "a.png"), "png");
  writeFileSync(path.join(kbRoot, "1", "abc.md"), "kb content");
  process.env.DATA_DIR = tmpRoot;
  process.env.DATABASE_URL = `file:${dbPath}`;
});

afterEach(() => {
  if (ORIGINAL_DATADIR === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = ORIGINAL_DATADIR;
  if (ORIGINAL_DBURL === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = ORIGINAL_DBURL;
  if (tmpRoot && existsSync(tmpRoot)) rmSync(tmpRoot, { recursive: true, force: true });
  vi.restoreAllMocks();
});

/** 生成唯一临时目录 */
function fs_tmp(): string {
  return path.join(os.tmpdir(), `hd-backup-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
}

/** 生成 yyyymmdd 日期串（与 backup.ts 一致） */
function today(): string {
  const n = new Date();
  return [
    n.getFullYear(),
    String(n.getMonth() + 1).padStart(2, "0"),
    String(n.getDate()).padStart(2, "0"),
  ].join("");
}

describe("jobs/tar：打包与读回", () => {
  it("splitTarPath：短路径 name 直接落、长路径分 prefix", () => {
    expect(splitTarPath("uploads/a.png")).toEqual({ name: "uploads/a.png", prefix: "" });
    const long = `uploads/${"d".repeat(120)}/file.txt`;
    const r = splitTarPath(long);
    expect(r.name).toContain("file.txt");
    expect(r.prefix.length).toBeGreaterThan(0);
    expect(Buffer.byteLength(r.name)).toBeLessThanOrEqual(100);
  });

  it("buildTarGz → listTar：归档文件与目录完整", async () => {
    const target = path.join(tmpRoot, "out.tar.gz");
    const entries = [
      { rel: "db/dev.db", abs: dbPath, type: "file" as const },
      { rel: "uploads/a.png", abs: path.join(uploadsRoot, "a.png"), type: "file" as const },
      { rel: "kb/1/", abs: path.join(kbRoot, "1"), type: "dir" as const },
      { rel: "kb/1/abc.md", abs: path.join(kbRoot, "1", "abc.md"), type: "file" as const },
    ];
    await buildTarGz(target, entries);
    expect(existsSync(target)).toBe(true);
    const listed = listTar(target);
    const names = listed.map((e) => e.name);
    expect(names).toContain("db/dev.db");
    expect(names).toContain("uploads/a.png");
    expect(names).toContain("kb/1/abc.md");
    // gzip 输出：文件应明显小于原始体积（fake 内容小，仅验证能解压出条目）
    expect(listed.length).toBeGreaterThanOrEqual(3);
  });

  it("collectDirEntries：收集目录下全部文件", () => {
    const es = collectDirEntries(uploadsRoot, "uploads");
    expect(es.length).toBeGreaterThanOrEqual(1);
    expect(es.some((e) => e.rel === "uploads/a.png" && e.type === "file")).toBe(true);
  });
});

describe("jobs/backup：归档 db+uploads+kb 且保留 14 份", () => {
  it("归档包含三类并保留最近 14 份", async () => {
    // 预置 15 个历史备份目录（不同 mtime 保证排序确定）
    mkdirSync(backupRoot, { recursive: true });
    for (let i = 0; i < 15; i++) {
      const d = path.join(backupRoot, `202601${String(i + 1).padStart(2, "0")}`);
      mkdirSync(d, { recursive: true });
      utimesSync(d, new Date(2026, 0, i + 1, 0, 0, 0), new Date(2026, 0, i + 1, 0, 0, 0));
    }

    await backupJob({} as never);

    const dirs = readdirSync(backupRoot).filter((d) => /^\d{8}$/.test(d)).sort();
    // 15 个历史 + 今天 1 个 = 16，保留 14 → 应删掉最旧的 2 个
    expect(dirs.length).toBe(14);
    // 最旧的两个（20260101、20260102）应已被删除
    expect(dirs).not.toContain("20260101");
    expect(dirs).not.toContain("20260102");
    expect(dirs).toContain(today());

    const targetDir = path.join(backupRoot, today());
    const files = readdirSync(targetDir);
    const archive = files.find((f) => f.endsWith(".tar.gz"));
    expect(archive).toBeDefined();

    const listed = listTar(path.join(targetDir, archive!));
    const names = listed.map((e) => e.name);
    expect(names).toContain("db/dev.db");
    expect(names).toContain("uploads/a.png");
    expect(names).toContain("kb/1/abc.md");
  });

  it("uploads 或 kb 目录不存在时归档仅含 db", async () => {
    rmSync(uploadsRoot, { recursive: true, force: true });
    rmSync(kbRoot, { recursive: true, force: true });
    await backupJob({} as never);
    const targetDir = path.join(backupRoot, today());
    const archive = readdirSync(targetDir).find((f) => f.endsWith(".tar.gz"));
    expect(archive).toBeDefined();
    const names = listTar(path.join(targetDir, archive!)).map((e) => e.name);
    expect(names).toContain("db/dev.db");
    expect(names.filter((n) => n.startsWith("uploads/"))).toHaveLength(0);
    expect(names.filter((n) => n.startsWith("kb/"))).toHaveLength(0);
  });
});