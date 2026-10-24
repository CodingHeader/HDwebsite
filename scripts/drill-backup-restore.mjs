/**
 * V11-OPS-01 备份恢复演练脚本（可复跑；exit 0 = 演练闭环全部通过）
 *
 * 流程（全部在 os.tmpdir() 沙箱内，不触碰项目数据）：
 *  1. 建沙箱：source/（模拟 DATA_DIR）+ restore/（还原目标）
 *  2. 用真实 prisma/migrations 建库 + 种子数据，写入 uploads/、data/kb/ 样本文件
 *  3. 备份：VACUUM INTO 快照 + 真实 src/lib/jobs/tar.ts（buildTarGz/collectDirEntries，
 *     条目组装与 src/lib/jobs/backup.ts 的 backupJob 一致：db/<name> + uploads/** + kb/**）
 *  4. 还原：真实 scripts/restore.mjs（先默认 dry-run 校验，再 --apply 落盘）
 *  5. 校验：
 *     - 源库/恢复库用户表行数矩阵逐表相等
 *     - 恢复库 PRAGMA integrity_check = ok + 种子值抽查
 *     - uploads/kb 文件数与 sha256 逐文件一致
 *     - 应用栈（PrismaClient + PrismaLibSql 适配器，与 seed.ts 同装配）读取恢复库成功
 *
 * 用法：node scripts/drill-backup-restore.mjs
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function fail(msg) {
  console.error(`[drill] FAIL：${msg}`);
  process.exit(1);
}
function ok(msg) {
  console.log(`[drill] ✓ ${msg}`);
}

// 真实 tar 实现（node 24 默认类型剥离加载 .ts；本文件为 .mjs，不进 tsc include）
const tarModule = await import(pathToFileURL(path.join(repoRoot, "src/lib/jobs/tar.ts")).href);
const { buildTarGz, collectDirEntries } = tarModule;

// ── 1. 沙箱 ────────────────────────────────────────────────
const sandbox = mkdtempSync(path.join(tmpdir(), "hdw-ops01-drill-"));
const source = path.join(sandbox, "source");
const restore = path.join(sandbox, "restore");
mkdirSync(source, { recursive: true });
mkdirSync(restore, { recursive: true });
console.log(`[drill] 沙箱：${sandbox}`);

try {
  // 清理历史失败运行残留的沙箱（忽略清理失败）
  for (const d of readdirSync(tmpdir()).filter((n) => n.startsWith("hdw-ops01-drill-"))) {
    try {
      rmSync(path.join(tmpdir(), d), { recursive: true, force: true });
    } catch {
      // ignore（可能被占用）
    }
  }

  // ── 2. 真实迁移建库 + 种子 ────────────────────────────────
  const dbPath = path.join(source, "prisma", "drill.db").replaceAll("\\", "/");
  mkdirSync(path.dirname(dbPath), { recursive: true });
  const migDir = path.join(repoRoot, "prisma", "migrations");
  const migrations = readdirSync(migDir)
    .filter((d) => existsSync(path.join(migDir, d, "migration.sql")))
    .sort();
  const client = createClient({ url: `file:${dbPath}` });
  for (const m of migrations) {
    await client.executeMultiple(readFileSync(path.join(migDir, m, "migration.sql"), "utf8"));
  }
  await client.executeMultiple(
    `INSERT INTO "Role" ("name","slug","permissions","createdAt","updatedAt") VALUES
       ('管理员','admin','[]',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
       ('编辑','editor','["content:list"]',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
     INSERT INTO "Setting" ("key","value","group","createdAt","updatedAt") VALUES
       ('siteName','演练站点','site',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
       ('siteIcp','京ICP-0000000号','site',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);`
  );
  client.close();
  ok(`源库就绪（${migrations.length} 个迁移已应用，种子 Role×2 + Setting×2）`);

  // 样本文件：uploads（嵌套目录 + 二进制）与 kb
  const uploadsDir = path.join(source, "uploads", "media", "2026", "10");
  mkdirSync(uploadsDir, { recursive: true });
  writeFileSync(path.join(uploadsDir, "hello.txt"), "hello backup 演练样本");
  writeFileSync(path.join(uploadsDir, "logo.bin"), Buffer.from(Array.from({ length: 4096 }, (_, i) => i % 251)));
  const kbDir = path.join(source, "data", "kb", "default");
  mkdirSync(kbDir, { recursive: true });
  writeFileSync(path.join(kbDir, "sample-doc.md"), "# 知识库样本\n\n演练用正文段落。\n");

  // ── 3. 备份（与 backupJob 相同机制与条目组装）────────────
  const now = new Date();
  const yyyymmdd = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("");
  const targetDir = path.join(source, "backups", yyyymmdd);
  mkdirSync(targetDir, { recursive: true });
  const dbCopy = path.join(targetDir, "drill.db").replaceAll("\\", "/");
  const backupClient = createClient({ url: `file:${dbPath}` });
  await backupClient.execute({ sql: "VACUUM INTO ?", args: [dbCopy] });
  backupClient.close();
  const entries = [{ rel: "db/drill.db", abs: dbCopy, type: "file" }];
  entries.push(...collectDirEntries(path.join(source, "uploads"), "uploads"));
  entries.push(...collectDirEntries(path.join(source, "data", "kb"), "kb"));
  const archive = path.join(targetDir, "drill.tar.gz");
  await buildTarGz(archive, entries);
  const archiveSize = statSync(archive).size;
  ok(
    `备份完成：backups/${yyyymmdd}/drill.tar.gz（${archiveSize} 字节；db=1 + uploads=${entries.filter((e) => e.rel.startsWith("uploads/")).length} + kb=${entries.filter((e) => e.rel.startsWith("kb/")).length} 项）`
  );

  // ── 4. 还原（真实 restore.mjs：dry-run → --apply）────────
  const restoreScript = path.join(repoRoot, "scripts", "restore.mjs");
  const env = { ...process.env, DATA_DIR: restore };
  const dry = spawnSync(process.execPath, [restoreScript, archive], { env, encoding: "utf8", cwd: repoRoot });
  if (dry.status !== 0 || !dry.stdout.includes("DRY-RUN")) fail(`dry-run 异常：${dry.stderr || dry.stdout}`);
  ok(`dry-run 校验通过：${dry.stdout.split("\n").find((l) => l.includes("条目"))?.trim()}`);
  const apply = spawnSync(process.execPath, [restoreScript, archive, "--apply"], { env, encoding: "utf8", cwd: repoRoot });
  if (apply.status !== 0) fail(`--apply 异常：${apply.stderr || apply.stdout}`);
  ok(`--apply 还原完成：${apply.stdout.split("\n").find((l) => l.includes("还原完成"))?.trim()}`);

  const restoredDb = path.join(restore, "data", "db", "drill.db");
  for (const p of [restoredDb, path.join(restore, "uploads", "media", "2026", "10", "hello.txt"), path.join(restore, "data", "kb", "default", "sample-doc.md"), path.join(restore, "data", "restore.log")]) {
    if (!existsSync(p)) fail(`还原产物缺失：${p}`);
  }

  // ── 5a. 行数矩阵一致性 ────────────────────────────────────
  async function tableCounts(dbFile) {
    const c = createClient({ url: `file:${dbFile.replaceAll("\\", "/")}` });
    // 注：ESCAPE 子句在 libsql 下返回空集，prisma 内部表改在 JS 侧过滤（下划线开头）
    const tables = (
      await c.execute(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`)
    ).rows
      .map((r) => String(r.name))
      .filter((t) => !t.startsWith("_"));
    const counts = {};
    for (const t of tables) {
      counts[t] = Number((await c.execute(`SELECT COUNT(*) AS n FROM "${t}"`)).rows[0].n);
    }
    c.close();
    return counts;
  }
  const srcCounts = await tableCounts(dbPath);
  const rstCounts = await tableCounts(restoredDb);
  const tableNames = Object.keys(srcCounts);
  if (tableNames.length !== Object.keys(rstCounts).length) fail(`表数量不一致：源 ${tableNames.length} vs 恢复 ${Object.keys(rstCounts).length}`);
  const mismatch = tableNames.filter((t) => srcCounts[t] !== rstCounts[t]);
  if (mismatch.length) fail(`行数不一致：${mismatch.map((t) => `${t}(${srcCounts[t]}→${rstCounts[t]})`).join(", ")}`);
  const nonEmpty = tableNames.filter((t) => srcCounts[t] > 0);
  console.log(`[drill] ✓ 行数矩阵一致（${tableNames.length} 张表；非空：${nonEmpty.map((t) => `${t}=${srcCounts[t]}`).join(", ")}）`);

  // ── 5b. 完整性 + 抽查 ────────────────────────────────────
  const chk = createClient({ url: `file:${restoredDb.replaceAll("\\", "/")}` });
  const integrity = String((await chk.execute("PRAGMA integrity_check")).rows[0][0] ?? (await chk.execute("PRAGMA integrity_check")).rows[0].integrity_check);
  if (integrity !== "ok") fail(`integrity_check：${integrity}`);
  const siteName = (await chk.execute(`SELECT value FROM "Setting" WHERE key='siteName'`)).rows[0].value;
  const roleN = Number((await chk.execute(`SELECT COUNT(*) AS n FROM "Role"`)).rows[0].n);
  chk.close();
  if (siteName !== "演练站点" || roleN !== 2) fail(`抽查值不一致：siteName=${siteName} roles=${roleN}`);
  ok(`integrity_check=ok；抽查 siteName='${siteName}'、Role=${roleN} 行`);

  // ── 5c. 文件 sha256 一致性 ───────────────────────────────
  function walkHashes(root) {
    const out = {};
    const stack = [root];
    while (stack.length) {
      const dir = stack.pop();
      for (const name of readdirSync(dir)) {
        const p = path.join(dir, name);
        if (statSync(p).isDirectory()) stack.push(p);
        else out[path.relative(root, p).replaceAll("\\", "/")] = createHash("sha256").update(readFileSync(p)).digest("hex");
      }
    }
    return out;
  }
  for (const [label, s, r] of [
    ["uploads", path.join(source, "uploads"), path.join(restore, "uploads")],
    ["kb", path.join(source, "data", "kb"), path.join(restore, "data", "kb")],
  ]) {
    const a = walkHashes(s);
    const b = walkHashes(r);
    const keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length) fail(`${label} 文件数不一致：${keys.length} vs ${Object.keys(b).length}`);
    const diff = keys.filter((k) => a[k] !== b[k]);
    if (diff.length) fail(`${label} 内容不一致：${diff.join(", ")}`);
    ok(`${label} 一致（${keys.length} 个文件 sha256 全等）`);
  }

  // ── 5d. 应用栈读取恢复库 ─────────────────────────────────
  process.env.DATABASE_URL = `file:${restoredDb.replaceAll("\\", "/")}`;
  const prismaMod = await import("@prisma/client");
  const adapterMod = await import("@prisma/adapter-libsql");
  const PrismaClient = prismaMod.PrismaClient ?? prismaMod.default?.PrismaClient;
  const PrismaLibSql = adapterMod.PrismaLibSql ?? adapterMod.default?.PrismaLibSql;
  const prisma = new PrismaClient({ adapter: new PrismaLibSql({ url: process.env.DATABASE_URL }) });
  const settings = await prisma.setting.count();
  const roles = await prisma.role.count();
  await prisma.$disconnect();
  if (settings !== 2 || roles !== 2) fail(`应用栈读取异常：setting=${settings} role=${roles}`);
  ok(`应用栈（PrismaClient+PrismaLibSql）读取恢复库成功：Setting=${settings}、Role=${roles}`);

  console.log("[drill] 演练闭环全部通过（备份→还原→校验→应用栈读取）。沙箱将清理。");
} finally {
  // Windows 下偶发句柄释放延迟（杀软扫描/适配器收尾）：尽力清理，失败不判失败（临时目录由系统回收）
  let cleaned = false;
  for (let i = 0; i < 5 && !cleaned; i++) {
    try {
      rmSync(sandbox, { recursive: true, force: true });
      cleaned = true;
    } catch {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
    }
  }
  console.log(cleaned ? "[drill] 沙箱已清理。" : `[drill] WARN：沙箱清理被占用（可稍后手动删除）：${sandbox}`);
}
