/**
 * 备份还原脚本（D-14）：把 `backups/yyyymmdd/<name>.tar.gz` 还原回 DATA_DIR。
 *
 * 职责：
 * - 自包含解析 tar（内联 ustar 头解析，与 src/lib/jobs/tar.ts 同一格式：512 字节头 + 内容 512 对齐 + 两个零块结尾）。
 * - 默认 dry-run：只校验 + 打印将要执行的动作，不落盘。
 * - `--apply` 真正落盘：写入 uploads/、kb/，数据库副本落到 data/db/，并追加 restore.log。
 * - 拒绝覆盖非空目标目录（`--force` 覆盖时先清空 uploads/kb，仅限明确授权）。
 * - 不启动服务、不改 DATABASE_URL；还原后由外部（手册/Compose）决定如何启动与迁移。
 */
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import path from "node:path";

const BLOCK = 512;

/** 与 src/lib/jobs/tar.ts 一致的 ustar 解析：返回 {rel, size, offset} */
function parseTarEntries(buf) {
  const out = [];
  let off = 0;
  while (off + BLOCK <= buf.length) {
    const block = buf.subarray(off, off + BLOCK);
    if (block.every((b) => b === 0)) break;
    const sizeStr = block.subarray(124, 136).toString("ascii").replace(/\0.*$/, "").trim();
    const size = parseInt(sizeStr, 8) || 0;
    const typeflag = block.subarray(156, 157).toString("ascii");
    const nameBuf = block.subarray(0, 100).toString("utf8").replace(/\0.*$/, "");
    const prefixBuf = block.subarray(345, 500).toString("utf8").replace(/\0.*$/, "");
    const rel = prefixBuf ? `${prefixBuf}/${nameBuf}` : nameBuf;
    if (rel) out.push({ rel, size, offset: off + BLOCK, typeflag });
    off += BLOCK + Math.ceil(size / BLOCK) * BLOCK;
  }
  return out;
}

/** DATA_DIR 解析（与 src/lib/storage.ts 的 dataRoot 一致） */
function dataRoot() {
  if (process.env.DATA_DIR) return path.resolve(process.env.DATA_DIR);
  return process.cwd();
}

function findBackup(archiveArg) {
  const backupsRoot = path.join(dataRoot(), "backups");
  if (archiveArg) {
    const p = path.isAbsolute(archiveArg) ? archiveArg : path.resolve(archiveArg);
    if (!existsSync(p)) throw new Error(`备份文件不存在：${p}`);
    return p;
  }
  if (!existsSync(backupsRoot)) throw new Error(`备份目录不存在：${backupsRoot}（请先运行 backup）`);
  const dayDirs = readdirSync(backupsRoot)
    .filter((d) => /^\d{8}$/.test(d))
    .sort()
    .reverse();
  for (const d of dayDirs) {
    const dayDir = path.join(backupsRoot, d);
    const tar = readdirSync(dayDir).find((f) => f.endsWith(".tar.gz"));
    if (tar) return path.join(dayDir, tar);
  }
  throw new Error("备份目录下未找到任何 .tar.gz");
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const force = args.includes("--force");
  const archiveArg = args.find((a) => !a.startsWith("--"));

  const root = dataRoot();
  const archivePath = findBackup(archiveArg);
  const gz = readFileSync(archivePath);
  const tar = gunzipSync(gz);
  const entries = parseTarEntries(tar);

  const dbEntry = entries.find((e) => e.rel.startsWith("db/"));
  const uploadsEntries = entries.filter((e) => e.rel.startsWith("uploads/"));
  const kbEntries = entries.filter((e) => e.rel.startsWith("kb/"));
  if (!dbEntry) throw new Error(`备份缺少 db/ 目录，格式异常：${archivePath}`);
  if (!uploadsEntries.length && !kbEntries.length) {
    console.warn(`[restore] 备份不含 uploads/ 或 kb/（${entries.length} 项），将只还原数据库。`);
  }

  console.log(`[restore] ${apply ? "APPLY" : "DRY-RUN"} 备份：${archivePath}`);
  console.log(
    `[restore] 条目 ${entries.length} 项：db=${path.basename(dbEntry.rel)} uploads=${uploadsEntries.length} kb=${kbEntries.length}`,
  );

  if (!apply) {
    console.log("[restore] dry-run：未做任何修改。使用 --apply 执行还原；--force 允许覆盖非空 uploads/kb。");
    return;
  }

  const uploadsRoot = path.join(root, "uploads");
  const kbRoot = path.join(root, "data", "kb");
  const dbDir = path.join(root, "data", "db");
  const uploadsNonEmpty = existsSync(uploadsRoot) && statSync(uploadsRoot).isDirectory() && readdirSync(uploadsRoot).length > 0;
  const kbNonEmpty = existsSync(kbRoot) && statSync(kbRoot).isDirectory() && readdirSync(kbRoot).length > 0;
  if ((uploadsNonEmpty || kbNonEmpty) && !force) {
    throw new Error(
      `目标 uploads/ 或 data/kb/ 已非空（uploads=${uploadsNonEmpty} kb=${kbNonEmpty}）。拒绝覆盖，除非显式 --force。`,
    );
  }
  if (force) {
    if (uploadsNonEmpty) rmSync(uploadsRoot, { recursive: true, force: true });
    if (kbNonEmpty) rmSync(kbRoot, { recursive: true, force: true });
  }

  mkdirSync(uploadsRoot, { recursive: true });
  mkdirSync(kbRoot, { recursive: true });
  mkdirSync(dbDir, { recursive: true });

  for (const e of uploadsEntries) writeEntry(tar, e, path.join(root, e.rel));
  // kb 在备份内的 rel 前缀为 "kb"，但实际落盘是 dataRoot()/data/kb（kbDir()），须重映射
  for (const e of kbEntries) writeEntry(tar, e, path.join(kbRoot, e.rel.replace(/^kb\//, "")));
  writeEntry(tar, dbEntry, path.join(dbDir, path.basename(dbEntry.rel)));

  const restoreLog = path.join(root, "data", "restore.log");
  appendFileSync(restoreLog, `${new Date().toISOString()}\tAPPLY\t${archivePath}\n`);

  console.log("[restore] 还原完成。请按部署手册迁移/启动服务。");
}

function writeEntry(tar, entry, dest) {
  if (entry.typeflag === "5") {
    // 目录条目：仅确保存在（可能已在父目录递归创建）
    mkdirSync(dest, { recursive: true });
    return;
  }
  mkdirSync(path.dirname(dest), { recursive: true });
  const buf = tar.subarray(entry.offset, entry.offset + entry.size);
  writeFileSync(dest, buf);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("[restore] 失败：", err.message);
    process.exit(1);
  },
);