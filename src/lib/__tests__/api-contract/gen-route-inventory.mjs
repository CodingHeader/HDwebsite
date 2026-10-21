/**
 * 生成 tests/contract/route-handlers.gen.ts 与 route-inventory.json。
 * 用法：node src/lib/__tests__/api-contract/gen-route-inventory.mjs
 * 输入：src/app/api 下全部 route.ts（119 个文件）
 * 输出：
 *   - tests/contract/route-inventory.json —— 供 routes.test.ts 遍历的清单
 *   - tests/contract/route-handlers.gen.ts —— 静态 import 全部路由 handler（TS 可解析）
 */
import fs from "node:fs";
import path from "node:path";

const API_ROOT = path.resolve("src/app/api");
const OUT_INV = path.resolve("tests/contract/route-inventory.json");
const OUT_HANDLERS = path.resolve("tests/contract/route-handlers.gen.ts");
const FROM_DIR = path.resolve("tests/contract");

// 收集全部 route.ts
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name === "route.ts") files.push(p);
  }
})(API_ROOT);
files.sort();

const METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];

const inventory = [];
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  const methods = METHODS.filter((m) => new RegExp(`export const ${m}\\s*=`).test(src));
  const perms = [...new Set((src.match(/permission:\s*["']([^"']+)["']/g) || []).map((s) => s.replace(/.*["']([^"']+)["']/, "$1")))];
  let rel = path.relative(API_ROOT, f).replace(/\\/g, "/").replace(/\/route\.ts$/, "");
  const route = "/" + rel.replace(/\[([^\]]+)\]/g, ":$1");
  inventory.push({ route, methods, perms });
}

// 生成静态 import 块
const importLines = [];
const handlerMapLines = [];
for (const f of files) {
  let rel = path.relative(API_ROOT, f).replace(/\\/g, "/").replace(/\/route\.ts$/, "");
  const route = "/" + rel.replace(/\[([^\]]+)\]/g, ":$1");
  const src = fs.readFileSync(f, "utf8");
  const methods = METHODS.filter((m) => new RegExp(`export const ${m}\\s*=`).test(src));
  if (!methods.length) continue;
  // 计算 import 路径：从 tests/contract/ 相对到该文件
  const absFile = path.resolve(f);
  const imp = path.relative(FROM_DIR, absFile).replace(/\\/g, "/").replace(/\.ts$/, "");
  const safe = route.replace(/[^a-zA-Z0-9]/g, "_");
  const imports = methods.map((m) => `${m} as ${safe}_${m}`).join(", ");
  importLines.push(`import { ${imports} } from "${imp}";`);
  handlerMapLines.push(
    `  "${route}": { ${methods.map((m) => `${m}: ${safe}_${m}`).join(", ")} },`
  );
}

const handlersTs = `/**
 * 自动生成（scripts/gen-route-inventory.mjs）—— 静态 import 全部路由 handler。
 * 目的：让 TS 静态解析路由模块，避免动态 import 造成的类型与打包问题。
 * 禁止手改；运行 npx node scripts/gen-route-inventory.mjs 重新生成。
 */
/* eslint-disable */
${importLines.join("\n")}

/** 路径 → { 方法: handler } 映射（仅包含导出了 HTTP 方法的 route） */
export const routeHandlers: Record<
  string,
  Partial<Record<"GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS", (...args: any[]) => Promise<Response> | Response>>
> = {
${handlerMapLines.join("\n")}
};
`;

fs.mkdirSync(path.dirname(OUT_HANDLERS), { recursive: true });
fs.writeFileSync(OUT_HANDLERS, handlersTs, "utf8");
fs.writeFileSync(OUT_INV, JSON.stringify(inventory, null, 1), "utf8");

console.log(`生成完成：${files.length} 个 route.ts → ${inventory.length} 个路径条目`);
console.log(`  方法总数：${inventory.reduce((s, r) => s + r.methods.length, 0)}`);
console.log(`  import 行数：${importLines.length}`);
console.log(`  输出：${OUT_HANDLERS}`);
console.log(`  输出：${OUT_INV}`);