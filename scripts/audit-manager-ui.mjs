#!/usr/bin/env node
/**
 * V14-UI-CONSIST-01 · 管理端一致性审计（42 页，5 项自动化 + 3 项人工待核）。
 */
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const MANAGER_PAGES = join(ROOT, "src/app/manager");
const UI_DIR = join(ROOT, "src/components/ui");

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name === "page.tsx") out.push(p);
  }
  return out;
}
const pages = walk(MANAGER_PAGES).sort();
const rel = (p) => relative(ROOT, p).replace(/\\/g, "/");
const isUi = (p) => p.startsWith(UI_DIR + "\\") || p.startsWith(UI_DIR + "/");

const NATIVE = /<button\b|<input\b|<select\b|<table\b|<textarea\b/;
const NATIVE_FEEDBACK = /\bwindow\.confirm\s*\(|\balert\s*\(/;
const HARDCOLOR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsl\(|\b(?:black|white|red|blue|green|gray|grey|orange|purple|teal|pink|brown)\b/;
const PAGEHEADER = /<PageHeader\b/;
const CRUDPAGE = /\bCrudPage\b/;
// V15-AUDIT-FIX-01: known exceptions without PageHeader but legitimate
// news = pure redirect entry (redirect to /manager/articles, never renders content)
// login = login page pattern using <h1> (REQ-F-015)
const PAGEHEADER_EXCEPTIONS = new Set([
  "src/app/manager/news/page.tsx",
  "src/app/manager/login/page.tsx",
]);

function stripComments(s) {
  return s
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");
}

const rows = [];
const summary = { pages: pages.length, native: 0, feedback: 0, token: 0, pageheader: 0, frontend: 0 };
let frontendChanged = [];
try {
  const diff = execFileSync("git", ["diff", "--name-only", "--", "src/app/(web)", "src/components/web", "public", "src/app/globals.css", "src/app/layout.tsx"], { encoding: "utf8" });
  frontendChanged = diff.split(/\r?\n/).filter(Boolean);
} catch { /* 忽略 */ }

for (const p of pages) {
  const relPath = rel(p);
  const src = readFileSync(p, "utf8");
  const stripped = stripComments(src);
  const native = NATIVE.test(stripped);
  const feedback = NATIVE_FEEDBACK.test(stripped);
  const token = HARDCOLOR.test(stripped);
  const hasDirectHeader = PAGEHEADER.test(src);
  const hasCrudPage = CRUDPAGE.test(src);
  const isHeaderException = PAGEHEADER_EXCEPTIONS.has(relPath);
  const headerOk = hasDirectHeader || hasCrudPage || isHeaderException;
  const cell = (v) => (v ? "FAIL" : "PASS");
  const nativeV = isUi(p) ? false : native;
  rows.push({
    page: relPath, native: cell(nativeV), feedback: cell(feedback), token: cell(token),
    pageheader: hasDirectHeader ? "PASS(direct)" : (hasCrudPage ? "PASS(CrudPage 间接)" : (isHeaderException ? "PASS(例外)" : "FAIL")), frontend: "N-A(本卡仅 manager)",
    manual: "待主控复核（五态/键盘/375px）", conclusion: "",
  });
  if (nativeV) summary.native++;
  if (feedback) summary.feedback++;
  if (token) summary.token++;
  if (!headerOk) summary.pageheader++;
}
summary.frontend = frontendChanged.length;

const header = [
  "# V14-UI-CONSIST-01 管理端一致性审计矩阵",
  "",
  "> 审计时间：2026-10-27 · 执行者：external-assistant · 范围：42 个 `src/app/manager/**/page.tsx`",
  "> 5 项自动化判定 + 3 项人工待核（五态覆盖 / 键盘可达 / 375px 可用，由主控复核，不伪造判定）。",
  "",
  "## 汇总", "",
  "| 项 | 数值 |", "|---|---|",
  `| 审计页数 | ${summary.pages} |`,
  `| 原生控件 FAIL | ${summary.native} |`,
  `| 原生反馈 FAIL | ${summary.feedback} |`,
  `| 令牌作用域 FAIL | ${summary.token} |`,
  `| PageHeader 缺失 | ${summary.pageheader} |`,
  `| 前台零改动 | ${summary.frontend} |`,
  "",
  "## 矩阵（42 行 × 8 列 + 结论）", "",
  "| 页面 | 原生控件 | 原生反馈 | 令牌作用域 | PageHeader | 前台零改动 | 五态覆盖 | 键盘可达 | 375px 可用 | 结论 |",
  "|---|---|---|---|---|---|---|---|---|---|",
];
for (const r of rows) {
  const concl = [];
  if (r.native === "FAIL") concl.push("原生控件待修");
  if (r.token === "FAIL") concl.push("硬编码色值待修");
  if (r.pageheader === "FAIL") concl.push("缺 PageHeader");
  r.conclusion = concl.length ? concl.join("；") : "待主控复核人工项";
  header.push(`| ${r.page} | ${r.native} | ${r.feedback} | ${r.token} | ${r.pageheader} | ${r.frontend} | 待核 | 待核 | 待核 | ${r.conclusion} |`);
}
const md = header.join("\n") + "\n";
const outDir = join(ROOT, "docs/design/06_validation/evidence/V14/UI-CONSIST-01");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "audit-matrix.md"), md, "utf8");
console.log(JSON.stringify({ summary, rows }, null, 2));