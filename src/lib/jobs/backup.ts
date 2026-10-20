/**
 * backup 任务：每日 03:00 备份 SQLite 数据库 + uploads + kb 三类到 backups/yyyymmdd/，保留最近 14 份。
 *
 * - 数据库用 VACUUM INTO 生成一致性快照（直接 cpSync 活跃库文件可能撕裂）。
 * - 全部归档为一个 tar.gz（`<dbname>.tar.gz`），用 jobs/tar.ts 手写 ustar（不新增依赖，package.json 冻结）。
 * - 归档内容：`db/<basename>`、`uploads/…`、`kb/…`。
 * - 保留策略：按天目录排序，只保留最近 KEEP_COUNT 份。
 */
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import type { JobContext } from "@/lib/scheduler";
import { backupsDir, kbDir, uploadsDir } from "@/lib/storage";
import { buildTarGz, collectDirEntries, type TarEntry } from "./tar";

const KEEP_COUNT = 14;

function resolveDbPath(): string {
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const raw = url.replace(/^file:/, "");
  // turbopackIgnore：process.cwd() 是运行时动态值，Turbopack 无法静态分析会过度追踪整个项目根
  return path.isAbsolute(raw) ? raw : path.resolve(/* turbopackIgnore: true */ process.cwd(), raw);
}

function pruneOldBackups(backupRoot: string): void {
  if (!existsSync(backupRoot)) return;
  const dirs = readdirSync(backupRoot)
    .filter((d) => /^\d{8}$/.test(d))
    .map((d) => ({
      name: d,
      time: statSync(path.join(backupRoot, d)).mtimeMs,
    }))
    .sort((a, b) => b.time - a.time);
  for (const old of dirs.slice(KEEP_COUNT)) {
    rmSync(path.join(backupRoot, old.name), { recursive: true, force: true });
  }
}

export async function backupJob(_ctx: JobContext): Promise<void> {
  const dbPath = resolveDbPath();
  if (!existsSync(dbPath)) {
    console.warn("[backup] 数据库文件不存在，跳过：", dbPath);
    return;
  }
  const now = new Date();
  const yyyymmdd = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const backupRoot = backupsDir();
  // turbopackIgnore：`backupRoot` 由 storage.ts 运行时解析（DATA_DIR 或 cwd），Turbopack 无法静态分析，
  // 会过度追踪整个项目根；fs 目录操作为运行时行为，构建期无需追踪。
  const targetDir = path.join(/* turbopackIgnore: true */ backupRoot, yyyymmdd);
  mkdirSync(targetDir, { recursive: true });
  const dbName = path.basename(dbPath);
  const dbCopyPath = path.join(targetDir, dbName);

  try {
    // VACUUM INTO 输出目标必须不存在
    const client = createClient({ url: `file:${dbPath}` });
    if (existsSync(dbCopyPath)) rmSync(dbCopyPath, { force: true });
    await client.execute({ sql: "VACUUM INTO ?", args: [dbCopyPath] });
    client.close();
  } catch (err) {
    console.error("[backup] VACUUM INTO 失败，回退文件复制：", err);
    const { copyFileSync } = await import("node:fs");
    copyFileSync(dbPath, dbCopyPath);
  }

  // 组装归档条目：db 副本（用已产出的 dbCopyPath 覆盖占位）+ uploads + kb
  const entries: TarEntry[] = [{ rel: `db/${dbName}`, abs: dbCopyPath, type: "file" }];
  const uploadsRoot = uploadsDir();
  if (existsSync(uploadsRoot)) entries.push(...collectDirEntries(uploadsRoot, "uploads"));
  const kbRoot = kbDir();
  if (existsSync(kbRoot)) entries.push(...collectDirEntries(kbRoot, "kb"));

  const archiveName = `${dbName.replace(/\.[^.]+$/, "")}.tar.gz`;
  const archivePath = path.join(targetDir, archiveName);
  await buildTarGz(archivePath, entries);

  pruneOldBackups(backupRoot);
  console.log(
    `[backup] 已归档 ${dbName} + uploads(${entries.filter((e) => e.rel.startsWith("uploads/")).length} 项) + kb(${entries.filter((e) => e.rel.startsWith("kb/")).length} 项) → backups/${yyyymmdd}/${archiveName}`,
  );
}