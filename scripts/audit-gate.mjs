#!/usr/bin/env node
/**
 * V8-SEC-04：安全审计门禁（CI 与本地共用）
 *
 * 为什么需要独立脚本而不是直接 `npm audit`：
 *   1. **镜像假阴性**：本机 registry 指向 npmmirror（淘宝镜像），该镜像不实现
 *      `/-/npm/v1/security/advisories/bulk`，返回 404；`npm audit --json` 会把该错误
 *      解析成「无漏洞」。V0.7 收尾时因此差点得出「0 漏洞」的错误结论。
 *      → 本脚本**强制使用官方 registry**，不依赖本机 .npmrc。
 *   2. **接口失败必须判失败**：npm audit 在接口异常时退出码不可靠且 JSON 为空，
 *      必须显式识别「返回体没有 metadata.vulnerabilities」并直接 fail，不能当成 0 漏洞。
 *   3. **只升不降**：`npm audit fix` 对「无可用修复版本」的包会建议一个"最近的安全点"，
 *      可能低于当前版本（例如建议 next 系包从 16.4.2 降到 14.2.35）。
 *      本脚本检测到「建议版本 < 当前版本」时**不视为必须修复**，而是单独列为
 *      "降级建议（按项目策略拒绝）"，不参与失败判定。
 *
 * 退出码：
 *   0 = 无 critical/high，或 high 全部属于「降级建议」
 *   1 = 存在可升级修复的 critical/high，或审计接口异常
 *
 * 用法：
 *   node scripts/audit-gate.mjs              # 门禁模式
 *   node scripts/audit-gate.mjs --verbose    # 打印全部条目
 */
import { runNpm } from "./_npm-exec.mjs";

const REGISTRY = "https://registry.npmjs.org";
const VERBOSE = process.argv.includes("--verbose");
/** 判定为失败的最高严重度（critical 与 high 都拦） */
const BLOCKING = new Set(["critical", "high"]);

function runAudit() {
  // --json 输出到 stdout；接口异常时 npm 仍可能 exit 0，故以「能否解析出 metadata」为准
  let raw = "";
  try {
    // 注意：Windows 上 shell:true 时参数会被拼成字符串，registry URL 里没有空格所以安全；
    // 但 npm 要求 --registry 与值分列（不能用 --registry=URL 之外的怪异形式），故用数组传参。
    raw = runNpm(["audit", "--json", `--registry=${REGISTRY}`, "--audit-level=none"]);
  } catch (err) {
    // npm audit 在「有漏洞」时退出码非 0，但 stdout 仍含完整 JSON；仅当没有 stdout 才算真失败
    raw = typeof err.stdout === "string" ? err.stdout : "";
    if (!raw.trim()) {
      console.error("✗ 审计命令失败且无输出（可能是网络/registry 不可达）：");
      console.error(err.stderr?.toString?.() ?? err.message);
      process.exit(1);
    }
  }
  return raw;
}

function parse(raw) {
  let json;
  try {
    json = JSON.parse(raw);
  } catch {
    console.error("✗ 审计输出不是合法 JSON —— 极可能是 registry 不支持审计接口（镜像假阴性）。");
    console.error(`  请确认使用官方源：${REGISTRY}`);
    console.error(`  原始输出前 400 字：${raw.slice(0, 400)}`);
    process.exit(1);
  }
  // 关键：镜像 404 时 JSON 里没有 metadata.vulnerabilities
  const vulns = json?.metadata?.vulnerabilities;
  if (!vulns) {
    console.error("✗ 审计结果缺少 metadata.vulnerabilities —— registry 未返回审计数据（假阴性）。");
    console.error(`  原始 JSON 顶层键：${Object.keys(json).join(", ") || "(空)"}`);
    process.exit(1);
  }
  if (json?.error) {
    console.error(`✗ 审计接口返回错误：${json.error}`);
    process.exit(1);
  }
  return { vulns, advisories: json.vulnerabilities ?? {} };
}

/** 从 fixAvailable 里取出建议版本号 */
function fixVersion(fixAvailable) {
  if (!fixAvailable) return null;
  if (typeof fixAvailable === "string") return fixAvailable;
  return fixAvailable.version ?? null;
}

function main() {
  console.log(`== 安全审计门禁（registry: ${REGISTRY}）==`);
  const { vulns, advisories } = parse(runAudit());

  console.log(
    `统计：critical ${vulns.critical ?? 0} / high ${vulns.high ?? 0} / ` +
      `moderate ${vulns.moderate ?? 0} / low ${vulns.low ?? 0} / total ${vulns.total ?? 0}`
  );

  const blocking = [];
  const downgradeSuggestions = [];
  const others = [];

  for (const [name, adv] of Object.entries(advisories)) {
    const severity = adv.severity ?? "unknown";
    if (!BLOCKING.has(severity)) {
      others.push({ name, severity, fix: fixVersion(adv.fixAvailable) });
      continue;
    }
    const fix = fixVersion(adv.fixAvailable);
    const installed = adv.range ?? "";
    // 「建议版本低于当前已装版本」→ 降级建议，按项目策略（Q1 只升不降）拒绝
    const isDowngrade = isDowngradeFix(name, adv);
    const fixTarget = adv.fixAvailable && typeof adv.fixAvailable === "object" ? adv.fixAvailable.name : null;
    if (isDowngrade) {
      downgradeSuggestions.push({ name, severity, fix, installed, target: fixTarget });
    } else {
      blocking.push({ name, severity, fix, installed, target: fixTarget });
    }
  }

  if (VERBOSE) {
    console.log("\n-- 全部非阻断条目 --");
    for (const o of others) console.log(`  ${o.severity.padEnd(9)} ${o.name}${o.fix ? ` (fix: ${o.fix})` : ""}`);
  }

  if (downgradeSuggestions.length) {
    console.log("\n-- 降级建议（按 Q1「只升不降」拒绝，不计入失败）--");
    for (const d of downgradeSuggestions) {
      console.log(`  ${d.severity} ${d.name}: 建议 ${d.fix} < 当前安装版本 → 拒绝降级`);
    }
  }

  if (blocking.length) {
    console.error("\n✗ 存在可通过升级修复的 critical/high：");
    for (const b of blocking) {
      console.error(`  ${b.severity.padEnd(9)} ${b.name}${b.fix ? ` → 升级到 ${b.fix}` : "（无可用修复版本）"}`);
    }
    console.error("\n处置：升级到建议版本（不得降级）；若确无升级路径，写入证据并申请豁免。");
    process.exit(1);
  }

  console.log("\n✓ 审计门禁通过：无「可升级修复」的 critical/high");
}

/** 缓存 `npm ls` 的解析结果：包名 → 已安装版本（取树里首个匹配） */
let installedCache = null;

function installedVersions() {
  if (installedCache) return installedCache;
  installedCache = new Map();
  let out = "";
  try {
    out = runNpm(["ls", "--all", "--json"]);
  } catch (err) {
    // 有漏洞/依赖树不完整时 npm ls 退出码可能非 0，但 stdout 通常仍完整
    out = typeof err.stdout === "string" ? err.stdout : "";
  }
  if (!out.trim()) return installedCache;
  let tree;
  try {
    tree = JSON.parse(out);
  } catch {
    return installedCache;
  }
  const walk = (deps) => {
    for (const [name, node] of Object.entries(deps ?? {})) {
      if (node?.version && !installedCache.has(name)) installedCache.set(name, node.version);
      if (node?.dependencies) walk(node.dependencies);
    }
  };
  walk(tree.dependencies);
  return installedCache;
}

/**
 * 判断「audit 建议的修复是否意味着降级」。
 *
 * 关键细节（踩过坑）：对**传递依赖**，audit 的 `fixAvailable.version` 给的是
 * **上游父包**的版本号，不是该包自身的版本。例如：
 *     braces(3.0.3) ← micromatch(4.0.8) ← fast-glob(3.3.1) ← @next/eslint-plugin-next(16.4.2)
 *   audit 对 braces 的建议是 `{ name: "eslint-config-next", version: "14.2.35" }`，
 *   即「把 eslint-config-next 降到 14.2.35」——用 14.2.35 去和 braces 的 3.0.3 比大小毫无意义。
 *
 * 因此判定要看 `fixAvailable.name`：
 *   - 有 name 且该包当前已装版本 > 建议版本 → 降级建议（拒绝）
 *   - 有 name 但该包未安装 → 保守当作需要修复
 *   - 无 name（建议针对该包自身）→ 直接比较该包当前版本
 */
function isDowngradeFix(pkg, adv) {
  const fix = adv.fixAvailable;
  if (!fix) return false;
  const target = typeof fix === "string" ? pkg : fix.name || pkg;
  const version = typeof fix === "string" ? fix : fix.version;
  if (!version) return false;
  const current = installedVersions().get(target);
  if (!current) return false; // 取不到版本 → 保守按「必须修复」处理
  return compareSemver(version, current) < 0;
}

/** 极简 semver 比较（只比较 major.minor.patch 数字，忽略 prerelease） */
function compareSemver(a, b) {
  const pa = String(a).split("-")[0].split(".").map(Number);
  const pb = String(b).split("-")[0].split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

main();
