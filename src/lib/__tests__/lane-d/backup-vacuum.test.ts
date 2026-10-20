/**
 * D-10 备份 VACUUM 真实分支单测（不 mock @libsql/client）。
 *
 * 目的：补齐 backup.test.ts 因 vi.mock 而无法覆盖的 VACUUM INTO 路径——
 * 使用真实 libsql 客户端建临时库、写数据、执行 backupJob，验证：
 * - VACUUM 分支确实被走到（归档裸 db 副本存在且为有效 SQLite 文件）
 * - 归档 tar 包含 db/uploads/kb 三类
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createClient } from "@libsql/client";
import { backupJob } from "@/lib/jobs/backup";
import { listTar } from "@/lib/jobs/tar";

const ORIGINAL_DATADIR = process.env.DATA_DIR;
const ORIGINAL_DBURL = process.env.DATABASE_URL;

let tmpRoot: string;
let dbPath: string;

beforeEach(async () => {
  tmpRoot = path.join(os.tmpdir(), `hd-backup-vac-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(tmpRoot, { recursive: true });
  dbPath = path.join(tmpRoot, "dev.db");
  const c = createClient({ url: `file:${dbPath}` });
  await c.execute("CREATE TABLE t(a INTEGER)");
  await c.execute("INSERT INTO t VALUES (42)");
  c.close();
  process.env.DATA_DIR = tmpRoot;
  process.env.DATABASE_URL = `file:${dbPath}`;
});

afterEach(async () => {
  if (ORIGINAL_DATADIR === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = ORIGINAL_DATADIR;
  if (ORIGINAL_DBURL === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = ORIGINAL_DBURL;
  await cleanupTmp();
});

/** Windows 下 SQLite 句柄可能延迟释放，清理临时目录失败时重试 */
async function cleanupTmp() {
  if (!tmpRoot || !existsSync(tmpRoot)) return;
  for (let i = 0; i < 5; i++) {
    try {
      rmSync(tmpRoot, { recursive: true, force: true });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
}

function today(): string {
  const n = new Date();
  return [
    n.getFullYear(),
    String(n.getMonth() + 1).padStart(2, "0"),
    String(n.getDate()).padStart(2, "0"),
  ].join("");
}

describe("backup VACUUM 真实分支", () => {
  it("VACUUM INTO 成功产出有效 SQLite 副本并归档三类", async () => {
    // 准备 uploads 与 kb
    const uploadsRoot = path.join(tmpRoot, "uploads");
    const kbRoot = path.join(tmpRoot, "data", "kb");
    mkdirSync(uploadsRoot, { recursive: true });
    mkdirSync(kbRoot, { recursive: true });
    writeFileSync(path.join(uploadsRoot, "a.png"), "png");
    writeFileSync(path.join(kbRoot, "b.md"), "kb");

    await backupJob({} as never);

    const targetDir = path.join(tmpRoot, "backups", today());
    const files = readdirSync(targetDir);
    const archive = files.find((f) => f.endsWith(".tar.gz"));
    expect(archive).toBeDefined();

    // 裸 db 副本存在且为有效 SQLite 文件（魔数）
    const dbCopy = path.join(targetDir, "dev.db");
    expect(existsSync(dbCopy)).toBe(true);
    const head = readFileSync(dbCopy).subarray(0, 16).toString("latin1");
    expect(head.startsWith("SQLite format 3")).toBe(true);

    // 归档含三类
    const names = listTar(path.join(targetDir, archive!)).map((e) => e.name);
    expect(names).toContain("db/dev.db");
    expect(names).toContain("uploads/a.png");
    expect(names).toContain("kb/b.md");
  });
});