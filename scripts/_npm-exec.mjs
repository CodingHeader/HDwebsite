/**
 * 跨平台 npm 调用的安全实现（V8-SEC-04 配套）
 *
 * 踩过的两个坑：
 *   1. Windows 上 `spawn("npm")` → EINVAL（npm 是 .cmd，Node ≥18.20.2 不许裸调用）
 *   2. 改用 `shell: true` 能跑，但参数不做转义（DEP0190 警告），且引入命令注入面
 *   3. 显式 spawn `npm.cmd` 仍然 EINVAL（.cmd 本质上仍需 cmd.exe 解析）
 *
 * 最终方案：**用当前 node 直接执行 npm-cli.js**，完全绕开 shell。
 *   `process.execPath` = 当前 node；`npm_execpath` = .../npm-cli.js（由 npm 注入）
 *   若 npm_execpath 不可用（例如脚本被 node 直接调用而非 npm run），退化为
 *   `node <npm 安装目录>/bin/npm-cli.js` 的常见路径探测。
 *
 * 优点：无 shell、无注入面、跨平台一致。
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const IS_WIN = process.platform === "win32";

/** 探测 npm-cli.js 的绝对路径；找不到返回 null */
function findNpmCliJs() {
  const candidates = [];

  // ① npm 运行时注入（`npm run xxx` 场景一定有）
  if (process.env.npm_execpath && process.env.npm_execpath.endsWith(".js")) {
    candidates.push(process.env.npm_execpath);
  }

  // ② 从当前 node 可执行文件推断（.../node_modules/npm/bin/npm-cli.js 的常见布局）
  const nodeDir = path.dirname(process.execPath);
  candidates.push(
    path.join(nodeDir, "node_modules", "npm", "bin", "npm-cli.js"),
    path.join(nodeDir, "..", "lib", "node_modules", "npm", "bin", "npm-cli.js")
  );

  for (const c of candidates) {
    try {
      if (c && existsSync(c)) return c;
    } catch {
      /* ignore */
    }
  }
  return null;
}

/**
 * 执行 npm 子命令，返回 stdout（失败时抛错，err.stdout 保留）。
 * @param {string[]} args 例如 ["audit", "--json"]
 * @param {{maxBuffer?: number, stdio?: any}} [opts]
 */
export function runNpm(args, opts = {}) {
  const cli = findNpmCliJs();
  const maxBuffer = opts.maxBuffer ?? 32 * 1024 * 1024;

  if (cli) {
    return execFileSync(process.execPath, [cli, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer,
    });
  }

  // 兜底：非 Windows 上 npm 是普通可执行文件，可安全直接调用
  if (!IS_WIN) {
    return execFileSync("npm", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer,
    });
  }

  throw new Error(
    "无法定位 npm-cli.js：请通过 `npm run <script>` 调用本脚本（npm 会注入 npm_execpath）"
  );
}
