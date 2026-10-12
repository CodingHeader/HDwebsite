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
  // P04：main@94dbbbb dry-run 发现的可映射键（Registry 已有对应扁平 key）
  "site.icp": "icp",
  "contact.worktime": "workHours",
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
const conflicts = [];
for (const row of rows.rows) {
  const oldKey = String(row.key);
  const newKey = KEY_MAP[oldKey];
  if (!newKey) {
    unmapped.push(oldKey);
    continue;
  }
  // P04 修复：dry-run 也检查扁平 key 是否已存在、值是否不同（原实现 apply 时静默删除旧键，值不同会丢失）
  const exists = await db.execute({ sql: "SELECT id, value FROM Setting WHERE key=?", args: [newKey] });
  const flatExists = exists.rows.length > 0;
  const differs = flatExists && String(exists.rows[0].value ?? "") !== String(row.value ?? "");
  if (differs) conflicts.push({ oldKey, newKey, oldValue: String(row.value ?? ""), flatValue: String(exists.rows[0].value ?? "") });
  const action = flatExists ? (differs ? "保留扁平值（冲突，见报告）" : "扁平键已存在且值相同") : "新建扁平键";
  if (!apply) {
    console.log(`[dry-run] ${oldKey} → ${newKey}：${action}`);
    migrated++;
    continue;
  }
  if (!flatExists) {
    // P04 修复：Setting.updatedAt 为 NOT NULL（原 INSERT 缺列，main 库 apply 即失败）
    await db.execute({
      sql: "INSERT INTO Setting (key, value, type, `group`, isPublic, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      args: [newKey, String(row.value ?? ""), String(row.type ?? "string"), "site", row.isPublic],
    });
  }
  // 旧键删除（统一体系后废弃点分 key）；扁平值冲突时以扁平值为准（与 import-main-content.mjs 口径一致），旧值已在报告中列出
  await db.execute({ sql: "DELETE FROM Setting WHERE key=?", args: [oldKey] });
  migrated++;
}
console.log(`${apply ? "迁移" : " dry-run 检查"} ${migrated} 个键。`);
if (conflicts.length) {
  console.log("扁平键值冲突（以扁平值为准，旧值如下）：", JSON.stringify(conflicts, null, 2));
}
if (unmapped.length) {
  console.log("无映射键（保留待人工核对）：", unmapped.join(", "));
}
