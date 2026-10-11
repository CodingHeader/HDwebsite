/**
 * Setting 键迁移（ADR-009 / C9）：旧点分 key → Registry 扁平 key
 * 用法：
 *   node scripts/migrate-setting-keys.mjs --db <旧库路径>              # dry-run（默认）
 *   node scripts/migrate-setting-keys.mjs --db <旧库路径> --apply
 * 映射表依据 04292309 seed 旧键（group=basic/school/contact/seo/social）与
 * 新 Registry（src/lib/settings-registry.ts）对照；无映射键仅报告不改动。
 */
import { createClient } from "@libsql/client";
import { copyFileSync, existsSync } from "node:fs";
import path from "node:path";

const KEY_MAP = {
  "site.title": "siteName",
  "site.description": "siteDescription",
  "site.logo": "siteLogo",
  "school.full_name": "schoolFullName",
  "school.full-name": "schoolFullName",
  "school.short_name": "schoolShortName",
  "school.short-name": "schoolShortName",
  "contact.phone": "contactPhone",
  "contact.phone1": "contactPhone1",
  "contact.phone2": "contactPhone2",
  "contact.email": "contactEmail",
  "contact.address": "address",
  "seo.title": "seoTitle",
  "seo.keywords": "seoKeywords",
  "seo.description": "seoDescription",
};

function parseArgs() {
  const args = process.argv.slice(2);
  const i = args.indexOf("--db");
  return { db: i >= 0 ? args[i + 1] : null, apply: args.includes("--apply") };
}

const { db: dbArg, apply } = parseArgs();
if (!dbArg) {
  console.log("用法：node scripts/migrate-setting-keys.mjs --db <旧库路径> [--apply]");
  process.exit(1);
}
const abs = path.isAbsolute(dbArg) ? dbArg : path.resolve(process.cwd(), dbArg);
if (!existsSync(abs)) {
  console.error(`数据库文件不存在：${abs}`);
  process.exit(1);
}
const db = createClient({ url: `file:${abs}` });

if (apply) {
  const backupPath = `${abs}.pre-key-migrate`;
  copyFileSync(abs, backupPath);
  console.log(`已备份数据库 → ${backupPath}`);
}

const rows = await db.execute("SELECT key, value, type, `group`, isPublic FROM Setting");
let migrated = 0;
const unmapped = [];
for (const row of rows.rows) {
  const oldKey = String(row.key);
  const newKey = KEY_MAP[oldKey];
  if (!newKey) {
    unmapped.push(oldKey);
    continue;
  }
  if (!apply) {
    console.log(`[dry-run] ${oldKey} → ${newKey}`);
    migrated++;
    continue;
  }
  const exists = await db.execute({ sql: "SELECT id FROM Setting WHERE key=?", args: [newKey] });
  if (exists.rows.length === 0) {
    await db.execute({
      sql: "INSERT INTO Setting (key, value, type, `group`, isPublic) VALUES (?, ?, ?, ?, ?)",
      args: [newKey, String(row.value ?? ""), String(row.type ?? "string"), "site", row.isPublic],
    });
  }
  // 旧键删除（统一体系后废弃点分 key）
  await db.execute({ sql: "DELETE FROM Setting WHERE key=?", args: [oldKey] });
  migrated++;
}
console.log(`${apply ? "迁移" : " dry-run 检查"} ${migrated} 个键。`);
if (unmapped.length) {
  console.log("无映射键（保留待人工核对）：", unmapped.join(", "));
}
