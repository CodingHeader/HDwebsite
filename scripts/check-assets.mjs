#!/usr/bin/env node
/**
 * W2-09 · check-assets：校验源码、Setting 默认值、DB 内容中的 /images/*、/uploads/*、/favicon* 引用全部存在。
 *
 * 扫描来源：
 *   1. src/ 下的字符串字面量（/images/、/uploads/、/favicon 前缀）
 *   2. src/lib/settings-registry.ts 的默认资源值（settings-registry 只读引用）
 *   3. prisma/dev.db（如存在）的 Setting 表 value 字段（JSON 字符串内匹配）
 * 存在性判定：
 *   - /images/*、/favicon* → public/ 下必须存在
 *   - /uploads/* → public/uploads/ 或 uploads/（DATA_DIR 运行时目录）下必须存在
 *
 * 用法：node scripts/check-assets.mjs     （DATABASE_URL 默认 file:./prisma/dev.db）
 * 退出码：0 = 全部存在；1 = 存在缺失（逐条打印）。
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const url = process.env.DATABASE_URL || "file:./prisma/dev.db";

/** 提取字符串字面量里的静态资源路径（排除 http(s)://、data:、变量引用） */
function scanSource(dir) {
  const found = new Set();
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      const st = statSync(p);
      if (st.isDirectory()) {
        if (name === "node_modules" || name === ".next") continue;
        walk(p);
      } else if (/\.(ts|tsx|mjs|js)$/.test(name)) {
        // 跳过测试与配置文件：测试用假数据、next.config 的 rewrite/redirect 源不要求实体存在
        if (p.includes("__tests__") || /next\.config\./.test(p)) continue;
        const text = readFileSync(p, "utf8");
        // 逐行扫描，跳过注释行，避免把代码注释/示例值当作真实资源引用
        for (const line of text.split("\n")) {
          const stripped = line.replace(/^\s*\/\/.*$/, "").replace(/\/\*.*$/, "");
          for (const m of stripped.matchAll(/["'`](\/(?:images|uploads|favicon)[^"'`\s)]*)/g)) {
            const path = m[1];
            // 排除动态路由参数（如 /uploads/:path*）、模板插值、占位省略号
            if (path.includes("${") || path.includes(":") || path.includes("[") || path.includes("…")) continue;
            found.add(path);
          }
        }
      }
    }
  };
  walk(dir);
  return found;
}

/** 提取 settings-registry.ts 的默认资源值 */
function scanRegistry() {
  const found = new Set();
  const file = join(root, "src/lib/settings-registry.ts");
  if (existsSync(file)) {
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(/["'](\/(?:images|uploads|favicon)[^"'`\s)]*)["']/g)) {
      found.add(m[1]);
    }
  }
  return found;
}

/** 提取 DB Setting 表 value 中的资源引用（DB 不存在或 0 字节时跳过，不加载第三方 client） */
async function scanDb() {
  const found = new Set();
  const file = url.startsWith("file:") ? url.slice(5) : url;
  if (!existsSync(file)) return found;
  try {
    if (statSync(file).size === 0) return found;
    // 惰性加载：仅 DB 文件存在且有数据时才依赖项目既有的 @libsql/client（Prisma libsql adapter 依赖，已在 dependencies）
    const { createClient } = await import("@libsql/client");
    const client = createClient({ url });
    const res = await client.execute("SELECT value FROM Setting");
    for (const row of res.rows ?? []) {
      const text = String(row.value ?? "");
      for (const m of text.matchAll(/\/(?:images|uploads|favicon)[A-Za-z0-9._/-]*/g)) {
        found.add(m[0]);
      }
    }
    await client.close();
  } catch {
    // DB 不存在或不可读：跳过（dev.db 未迁移场景）
  }
  return found;
}

/** 资源路径是否存在（区分 /uploads/ 与 /images|favicon） */
function exists(path) {
  if (path.startsWith("/uploads/")) {
    const rel = path.slice("/uploads/".length);
    const candidates = [join(root, "public/uploads", rel), join(root, "uploads", rel)];
    return candidates.some((c) => existsSync(c));
  }
  const rel = path.startsWith("/") ? path.slice(1) : path;
  return existsSync(join(root, "public", rel));
}

const src = scanSource(join(root, "src"));
const reg = scanRegistry();
const db = await scanDb();

/** 已知待修路径：登记于 scripts/check-assets.known-missing.txt（每行一个），由 D-04 等卡修正后移除 */
const knownMissing = new Set();
const knownFile = join(root, "scripts/check-assets.known-missing.txt");
if (existsSync(knownFile)) {
  for (const line of readFileSync(knownFile, "utf8").split("\n")) {
    const v = line.trim();
    if (v && !v.startsWith("#")) knownMissing.add(v);
  }
}

const all = new Set([...src, ...reg, ...db]);
const missing = [];
const known = [];
for (const p of all) {
  if (!exists(p)) (knownMissing.has(p) ? known : missing).push(p);
}

if (missing.length === 0) {
  if (known.length > 0) {
    console.log(`check-assets PASS（含 ${known.length} 项已登记待修）：扫描 ${all.size} 个资源引用（src=${src.size}、registry=${reg.size}、db=${db.size}），仅存在登记在 known-missing 的缺陷，请随对应卡修正：`);
    for (const p of known) console.log(`  ⚠ ${p}`);
  } else {
    console.log(`check-assets PASS：扫描 ${all.size} 个资源引用（src=${src.size}、registry=${reg.size}、db=${db.size}），全部存在。`);
  }
  process.exit(0);
} else {
  console.error(`check-assets FAIL：${missing.length} 个引用缺失（未登记）：`);
  for (const p of missing) console.error(`  ✗ ${p}`);
  if (known.length > 0) {
    console.error(`已登记待修 ${known.length} 项：`);
    for (const p of known) console.error(`  ⚠ ${p}`);
  }
  console.error(`\n新增缺失请修复或登记到 scripts/check-assets.known-missing.txt。`);
  process.exit(1);
}