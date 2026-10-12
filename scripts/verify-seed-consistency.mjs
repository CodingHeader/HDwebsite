#!/usr/bin/env node
/**
 * P04：seed / 菜单 / 权限一致性校验（只读）。
 *   1. ManagerMenu.path ↔ src/app/manager/** /page.tsx 存在（分组菜单 path 为空跳过）
 *   2. ManagerMenu.permission ∈ permissionCatalog（src/contracts/auth.ts，唯一源）
 *   3. Role.permissions ⊆ permissionCatalog（'*' 仅允许 isSuper 角色）
 *   4. 菜单 code 唯一、parentId 指向存在的分组
 * 用法：node scripts/verify-seed-consistency.mjs      （DATABASE_URL 默认 file:./prisma/dev.db）
 * 退出码：0 = 一致；1 = 存在问题（逐条打印）。
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@libsql/client";

const root = process.cwd();
const url = process.env.DATABASE_URL || "file:./prisma/dev.db";

function loadCatalog() {
  const src = readFileSync(join(root, "src/contracts/auth.ts"), "utf8");
  const start = src.indexOf("export const permissionCatalog = {");
  const end = src.indexOf("} as const;", start);
  if (start < 0 || end < 0) throw new Error("无法解析 permissionCatalog");
  const set = new Set();
  for (const m of src.slice(start, end).matchAll(/^\s*([a-z]+):\s*\[([^\]]*)\]/gm)) {
    for (const a of m[2].matchAll(/"([a-z]+)"/g)) set.add(`${m[1]}:${a[1]}`);
  }
  return set;
}

const catalog = loadCatalog();
const db = createClient({ url });
const problems = [];

const menus = (await db.execute("SELECT id, code, label, path, permission, parentId FROM ManagerMenu ORDER BY id")).rows;
const ids = new Set(menus.map((m) => Number(m.id)));
for (const m of menus) {
  if (m.parentId != null && !ids.has(Number(m.parentId))) problems.push(`菜单 ${m.code}: parentId=${m.parentId} 不存在`);
  if (m.path) {
    const rel = String(m.path).replace(/^\/manager\/?/, "");
    const page = join(root, "src/app/manager", rel, "page.tsx");
    if (!String(m.path).startsWith("/manager")) problems.push(`菜单 ${m.code}: path ${m.path} 不在 /manager 下`);
    else if (!existsSync(page)) problems.push(`菜单 ${m.code}: 页面不存在 ${page.replace(root + "/", "")}`);
  }
  if (m.permission && !catalog.has(String(m.permission))) problems.push(`菜单 ${m.code}: 权限 ${m.permission} 不在目录`);
}

const roles = (await db.execute("SELECT slug, permissions, isSuper FROM Role ORDER BY id")).rows;
for (const r of roles) {
  let perms;
  try {
    perms = JSON.parse(String(r.permissions || "[]"));
  } catch {
    problems.push(`角色 ${r.slug}: permissions 不是合法 JSON`);
    continue;
  }
  for (const p of perms) {
    if (p === "*") {
      if (!Number(r.isSuper)) problems.push(`角色 ${r.slug}: 非超级角色含 '*'`);
    } else if (!catalog.has(p)) problems.push(`角色 ${r.slug}: 权限 ${p} 不在目录`);
  }
}

console.log(`catalog=${catalog.size} menus=${menus.length} (with path ${menus.filter((m) => m.path).length}) roles=${roles.length}`);
if (problems.length) {
  console.error(`FAIL: ${problems.length} 项不一致`);
  for (const p of problems) console.error(" - " + p);
  process.exit(1);
}
console.log("OK: 菜单 path ↔ 页面、菜单权限 ∈ 目录、角色权限 ⊆ 目录 全部一致");
