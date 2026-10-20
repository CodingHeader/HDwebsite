/**
 * D-14 restore 单测：对临时 DATA_DIR 做真实还原（buildTarGz → restore.mjs --apply → 校验文件）。
 *
 * 覆盖：
 * 1. 完整还原：db + uploads + kb 三类条目回到目标目录；
 * 2. 拒绝覆盖非空 uploads/kb（--force 可越过）；
 * 3. dry-run 不做任何落盘。
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { buildTarGz, collectDirEntries } from "@/lib/jobs/tar";

const ORIGINAL_DATADIR = process.env.DATA_DIR;
let tmpRoot: string;

function runRestore(args: string[]): { status: number; stdout: string; stderr: string } {
  const script = path.resolve(process.cwd(), "scripts", "restore.mjs");
  try {
    const stdout = execFileSync(process.execPath, [script, ...args], {
      cwd: path.resolve(process.cwd()),
      env: { ...process.env, DATA_DIR: tmpRoot },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { status: 0, stdout, stderr: "" };
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string };
    return { status: err.status ?? 1, stdout: String(err.stdout ?? ""), stderr: String(err.stderr ?? "") };
  }
}

beforeEach(() => {
  tmpRoot = path.join(os.tmpdir(), `hd-restore-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  process.env.DATA_DIR = tmpRoot;
});

afterEach(() => {
  if (ORIGINAL_DATADIR === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = ORIGINAL_DATADIR;
  if (tmpRoot && existsSync(tmpRoot)) rmSync(tmpRoot, { recursive: true, force: true });
});

/** 造一个包含 db + uploads + kb 的备份 tar.gz，返回路径 */
function makeBackup(srcRoot: string): string {
  const dbDir = path.join(srcRoot, "db");
  const uploadsRoot = path.join(srcRoot, "uploads");
  const kbRoot = path.join(srcRoot, "kb");
  mkdirSync(dbDir, { recursive: true });
  mkdirSync(uploadsRoot, { recursive: true });
  mkdirSync(kbRoot, { recursive: true });
  writeFileSync(path.join(dbDir, "dev.db"), Buffer.from("sqlite-magic-0123456789"));
  writeFileSync(path.join(uploadsRoot, "a.jpg"), Buffer.from("jpg-bytes"));
  mkdirSync(path.join(kbRoot, "1"), { recursive: true });
  writeFileSync(path.join(kbRoot, "1", "abc.md"), "kb content");

  const entries = [
    { rel: "db/dev.db", abs: path.join(dbDir, "dev.db"), type: "file" as const },
    ...collectDirEntries(uploadsRoot, "uploads"),
    ...collectDirEntries(kbRoot, "kb"),
  ];
  const backupsRoot = path.join(tmpRoot, "backups", "20261020");
  mkdirSync(backupsRoot, { recursive: true });
  const archive = path.join(backupsRoot, "dev.tar.gz");
  // buildTarGz 是异步流式：直接 await
  return archive;
}

describe("D-14 restore.mjs", () => {
  it("完整还原：db + uploads + kb 三类条目回到目标目录", async () => {
    const srcRoot = path.join(tmpRoot, "src");
    const archive = makeBackup(srcRoot);
    await buildTarGz(archive, [
      { rel: "db/dev.db", abs: path.join(srcRoot, "db", "dev.db"), type: "file" },
      ...collectDirEntries(path.join(srcRoot, "uploads"), "uploads"),
      ...collectDirEntries(path.join(srcRoot, "kb"), "kb"),
    ]);
    expect(existsSync(archive)).toBe(true);

    const r = runRestore(["--apply"]);
    expect(r.status).toBe(0);
    // db 副本
    expect(existsSync(path.join(tmpRoot, "data", "db", "dev.db"))).toBe(true);
    // uploads
    expect(existsSync(path.join(tmpRoot, "uploads", "a.jpg"))).toBe(true);
    // kb
    expect(existsSync(path.join(tmpRoot, "data", "kb", "1", "abc.md"))).toBe(true);
    expect(readFileSync(path.join(tmpRoot, "data", "kb", "1", "abc.md"), "utf8")).toBe("kb content");
    // restore.log
    expect(existsSync(path.join(tmpRoot, "data", "restore.log"))).toBe(true);
  });

  it("dry-run 不落盘", async () => {
    const srcRoot = path.join(tmpRoot, "src2");
    const archive = makeBackup(srcRoot);
    await buildTarGz(archive, [
      { rel: "db/dev.db", abs: path.join(srcRoot, "db", "dev.db"), type: "file" },
      ...collectDirEntries(path.join(srcRoot, "uploads"), "uploads"),
      ...collectDirEntries(path.join(srcRoot, "kb"), "kb"),
    ]);
    const r = runRestore([]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("DRY-RUN");
    expect(existsSync(path.join(tmpRoot, "data", "db", "dev.db"))).toBe(false);
  });

  it("拒绝覆盖非空 uploads/kb；--force 可越过", async () => {
    const srcRoot = path.join(tmpRoot, "src3");
    const archive = makeBackup(srcRoot);
    await buildTarGz(archive, [
      { rel: "db/dev.db", abs: path.join(srcRoot, "db", "dev.db"), type: "file" },
      ...collectDirEntries(path.join(srcRoot, "uploads"), "uploads"),
      ...collectDirEntries(path.join(srcRoot, "kb"), "kb"),
    ]);
    // 预置非空 uploads
    mkdirSync(path.join(tmpRoot, "uploads"), { recursive: true });
    writeFileSync(path.join(tmpRoot, "uploads", "existing.txt"), "keep");

    const r1 = runRestore(["--apply"]);
    expect(r1.status).not.toBe(0);
    expect(r1.stderr + r1.stdout).toMatch(/拒绝覆盖|非空/);
    expect(existsSync(path.join(tmpRoot, "uploads", "existing.txt"))).toBe(true);

    const r2 = runRestore(["--apply", "--force"]);
    expect(r2.status).toBe(0);
    // 原有 existing.txt 被清空
    expect(existsSync(path.join(tmpRoot, "uploads", "existing.txt"))).toBe(false);
    expect(existsSync(path.join(tmpRoot, "uploads", "a.jpg"))).toBe(true);
  });

  it("备份缺少 db/ 时报错", async () => {
    const archive = path.join(tmpRoot, "bad.tar.gz");
    const srcRoot = path.join(tmpRoot, "src4");
    mkdirSync(path.join(srcRoot, "uploads"), { recursive: true });
    writeFileSync(path.join(srcRoot, "uploads", "x.png"), "x");
    await buildTarGz(archive, collectDirEntries(path.join(srcRoot, "uploads"), "uploads"));
    const r = runRestore([archive]);
    expect(r.status).not.toBe(0);
    expect(r.stderr + r.stdout).toMatch(/缺少 db\/|格式异常/);
  });
});