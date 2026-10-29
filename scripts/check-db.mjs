/**
 * DB 迁移状态检测（V22-ENV-01）
 *
 * 目标：在监听端口之前确认数据库已迁移（存在 CronJob / Setting / User 三表）。
 * 若缺表 → 打印可复制的修复命令并 exit 1，避免「端口已监听但运行时才
 * no such table: main.CronJob」的假成功。
 *
 * 设计：
 * - 纯函数 `checkDbReady(env)` 可被 start-next.mjs import 复用；
 * - 直接运行时（node scripts/check-db.mjs）作为独立门禁退出。
 * - 本地 file: URL 用 node:sqlite（零依赖）；libsql:/http: 用 @libsql/client。
 * - 只检测表存在性，不写库、不改数据。
 *
 * 注意：不 import src/lib/env.ts 之外的任何运行时；本脚本与 start-next.mjs
 * 均在 spawn next 之前执行，属启动链路而非 Next 运行时。
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/** 启动所需的业务表（缺任一即视为未迁移/迁移不完整） */
export const REQUIRED_TABLES = ["CronJob", "Setting", "User"];

/** 默认数据库文件（与 start-next.mjs 的默认值一致：prisma/dev.db） */
export function defaultDbUrl() {
  return pathToFileURL(path.resolve(process.cwd(), "prisma", "dev.db")).href;
}

/**
 * 将 DATABASE_URL 规范化为 { kind: 'file'|'libsql', location }
 * - file:./x → 解析为相对 cwd 的文件路径
 * - 纯路径（无 scheme）→ 视为文件路径
 * - libsql:/http: → 交给 @libsql/client
 */
export function parseDbUrl(url) {
  if (typeof url !== "string" || url.length === 0) {
    return { kind: "file", location: path.resolve(process.cwd(), "prisma", "dev.db") };
  }
  if (url.startsWith("file:")) {
    let p = url.slice(5);
    if (p.startsWith("//")) p = p.slice(2); // file:///abs → /abs
    // 相对路径按 cwd 解析（与 start-next.mjs 的默认 DATABASE_URL 口径一致）
    if (!path.isAbsolute(p)) p = path.resolve(process.cwd(), p);
    return { kind: "file", location: p };
  }
  if (/^(libsql|http|https):/.test(url)) {
    return { kind: "libsql", location: url };
  }
  // 无 scheme：视为文件路径
  return { kind: "file", location: path.resolve(process.cwd(), url) };
}

/** 列出 SQLite 文件内的表名 */
function listTablesFromFile(filePath) {
  if (!existsSync(filePath)) return [];
  // node:sqlite 为实验特性，但 Node 22.5+/24 可用；仅用于只读探测
  const { DatabaseSync } = require("node:sqlite");
  const db = new DatabaseSync(filePath, { readOnly: true });
  try {
    const rows = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    return rows.map((r) => r.name);
  } finally {
    db.close();
  }
}

/** 列出 libsql/远程库内的表名 */
async function listTablesFromLibsql(url) {
  const { createClient } = require("@libsql/client");
  const client = createClient({ url });
  try {
    const rows = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
    return rows.rows.map((r) => String(r.name));
  } finally {
    client.close();
  }
}

/**
 * 检测 DB 是否已迁移。
 * @returns {{ ok: boolean, missing: string[], tables: string[], error?: string }}
 */
export async function checkDbReady(env = process.env) {
  const url = env.DATABASE_URL || defaultDbUrl();
  const parsed = parseDbUrl(url);
  try {
    const tables = parsed.kind === "file"
      ? listTablesFromFile(parsed.location)
      : await listTablesFromLibsql(parsed.location);
    const missing = REQUIRED_TABLES.filter((t) => !tables.includes(t));
    return { ok: missing.length === 0, missing, tables };
  } catch (e) {
    return { ok: false, missing: REQUIRED_TABLES.slice(), tables: [], error: e.message };
  }
}

/** 打印修复指引（含可复制命令） */
export function printDbGuidance(missing) {
  console.error("[check-db] 数据库未就绪：缺少表 " + missing.join(", "));
  console.error("[check-db] 请先执行迁移与种子（本地开发，勿在生产手动执行）：");
  console.error("  npm run db:deploy && npm run db:seed");
  console.error("[check-db] 若已有数据且只想补迁移：npm run db:deploy");
}

// 直接运行：node scripts/check-db.mjs
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const res = await checkDbReady();
  if (res.ok) {
    console.log("[check-db] PASS 已迁移，必需表齐全：" + REQUIRED_TABLES.join(", "));
    process.exit(0);
  }
  printDbGuidance(res.missing);
  if (res.error) console.error("[check-db] 探测错误：" + res.error);
  process.exit(1);
}