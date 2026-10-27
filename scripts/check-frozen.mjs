#!/usr/bin/env node
/**
 * V14-FROZEN-GUARD-01 · check-frozen：冻结面守卫（AGENTS.md §4「冻结面只读」）。
 *
 * 背景：AGENTS.md §4 声明 `src/contracts/**`、`prisma/schema.prisma`、迁移、依赖、
 * 测试配置为冻结面，但此前**没有任何自动化检查**；827646b 曾把跨所有权改动
 * 一次性提交进 upgrade。本脚本把该规则变成可执行门禁。
 *
 * 判定逻辑（三段，任一失败即 exit 1）：
 *   1) 变更集：`git diff --name-only <baseline> -- <冻结路径>` 是否为空。
 *   2) CCR 豁免**双条件**（缺一即失败，防止「自己改契约、自己写 commit、自己放行」）：
 *      ① baseline..HEAD 中触及冻结路径的提交，message 含 `CCR-<数字>`；
 *      ② 仓库内确实存在 `docs/…/CCR-<数字>.md` 文件（git 已跟踪）。
 *   3) 浅克隆兜底：baseline 对象不存在（checkout 默认 depth=1）时无法取变更集，
 *      打印 SKIP 并 exit 0 —— 由 CI 侧显式 fetch 深度保证；本地全量仓库正常判定。
 *
 * 用法：node scripts/check-frozen.mjs
 * 退出码：0 = 通过 / 跳过；1 = 冻结面被改动且不满足 CCR 双条件。
 *
 * 注意：本脚本**故意**用裸 `node` 在 CI 中调用，而不是 package.json 里的 npm script ——
 * package.json 本身是冻结文件，为其加 script 需要走 CCR 流程，属于自我指涉。
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

/** 冻结面路径（与 AGENTS.md §4 对齐；glob 直接交给 git 的 pathspec） */
const FROZEN_PATHS = [
  "src/contracts",
  "prisma/schema.prisma",
  "prisma/migrations",
  "package.json",
  "package-lock.json",
  "vitest.config.ts",
  "playwright.config.ts",
];

const BASELINE_FILE = ".frozen-baseline";

/** 执行 git 并返回 stdout；失败抛错（由调用方决定如何处理） */
function git(args) {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

/** 执行 git，失败返回 null（用于「对象是否存在」这类探测） */
function gitTry(args) {
  try {
    return git(args);
  } catch {
    return null;
  }
}

function readBaseline() {
  if (!existsSync(BASELINE_FILE)) {
    console.error(`check-frozen FAIL：缺少 ${BASELINE_FILE}（应包含一行基线 commit sha）。`);
    process.exit(1);
  }
  const sha = readFileSync(BASELINE_FILE, "utf8").split(/\r?\n/)[0].trim();
  if (!/^[0-9a-f]{7,40}$/.test(sha)) {
    console.error(`check-frozen FAIL：${BASELINE_FILE} 内容不是合法 commit sha：${JSON.stringify(sha)}`);
    process.exit(1);
  }
  return sha;
}

const baseline = readBaseline();

// ── 3) 浅克隆兜底 ────────────────────────────────────────────────
// actions/checkout@v4 默认 fetch-depth=1，只含最新一个 commit，
// 基线对象通常不存在。此时无法计算变更集，宁可 SKIP 也不能误报失败。
if (gitTry(["cat-file", "-e", `${baseline}^{commit}`]) === null) {
  console.log(`SKIP: baseline unavailable (shallow clone) — 无法取出 ${baseline}，跳过冻结面比对。`);
  process.exit(0);
}

// ── 1) 变更集 ────────────────────────────────────────────────────
const changed = git(["diff", "--name-only", baseline, "--", ...FROZEN_PATHS])
  .split(/\r?\n/)
  .filter(Boolean);

if (changed.length === 0) {
  console.log(`check-frozen PASS：冻结面自 ${baseline} 起无改动（冻结路径 ${FROZEN_PATHS.length} 条）。`);
  process.exit(0);
}

console.error(`check-frozen：检测到冻结面改动 ${changed.length} 个文件（基线 ${baseline}）：`);
for (const f of changed) console.error(`  ✗ ${f}`);

// ── 2) CCR 豁免：双条件，两个独立检查 ────────────────────────────
// 检查①：触及冻结路径的提交，message 中是否声明了 CCR 编号。
//   --no-merges：合并提交不携带实质改动声明；只认真正改文件的提交。
//   --full-history 不需要：范围限 baseline..HEAD。
const logRaw =
  gitTry(["log", "--no-merges", "--format=%H%x00%B%x01", `${baseline}..HEAD`, "--", ...FROZEN_PATHS]) ?? "";

const conditional = [];
for (const record of logRaw.split("\x01")) {
  const text = record.trim();
  if (!text) continue;
  const [sha, message = ""] = text.split("\x00");
  const ids = [...message.matchAll(/CCR-(\d+)/g)].map((m) => m[1]);
  if (ids.length > 0) conditional.push({ sha: sha.slice(0, 8), ids: [...new Set(ids)] });
}

if (conditional.length === 0) {
  console.error("\n✗ 检查①失败：baseline..HEAD 中触及冻结面的提交，没有任何一条 message 含 `CCR-<数字>`。");
  console.error("\n需 CCR 流程：冻结面改动必须先在 docs/V1.7-*/ 或 docs/design/… 写《契约变更请求》，");
  console.error("由契约员在 upgrade 上最小提交并记录 `V7-CCR-<n>`。详见 AGENTS.md §4 与");
  console.error("docs/design/04_planning/parallel-w1/11-验收与审查规程.md §4。");
  process.exit(1);
}

// 检查②：仓库内必须真实存在对应的 CCR 文档。
//   用 git ls-files 列出全部被跟踪的 docs 文件（含历史 CCR），逐个比对 basename。
//   这是独立于 commit message 的第二道检查 —— commit message 可以被任何人随手写上，
//   但 docs/**/CCR-<n>.md 必须真实存在于仓库才能放行。
const docsFiles = (gitTry(["ls-files", "docs"]) ?? "").split(/\r?\n/).filter(Boolean);

const ccrIds = [...new Set(conditional.flatMap((c) => c.ids))];
const resolved = [];
const unresolved = [];
for (const id of ccrIds) {
  const fileName = `CCR-${id}.md`;
  const match = docsFiles.find((f) => f.split("/").pop() === fileName);
  if (match) resolved.push(`${fileName} → ${match}`);
  else unresolved.push(fileName);
}

if (unresolved.length > 0) {
  console.error(`\n✗ 检查②失败：commit message 声称的 CCR 文档在仓库中不存在：`);
  for (const f of unresolved) console.error(`  ✗ docs/**/${f}（git ls-files docs 无匹配）`);
  console.error("\ncommit message 可随意书写，因此仅凭 message 不能放行；必须先落地 CCR 文档。");
  process.exit(1);
}

// 两个条件都满足 → 豁免
console.log(`check-frozen PASS（CCR 豁免）：冻结面改动 ${changed.length} 个文件，已由以下 CCR 放行：`);
for (const r of resolved) console.log(`  ✓ ${r}`);
console.log("  commit：" + conditional.map((c) => `${c.sha}[CCR-${c.ids.join(",")}]`).join(" "));
process.exit(0);
