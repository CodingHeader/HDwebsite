#!/usr/bin/env node
/**
 * D-01 基线测量脚本（WPD.1 性能可测量）
 *
 * 一条命令输出 8 个指标：
 *   homeJsGzip            首页 JS gzip 合计（页面全部 <script src> 逐个下载后 gzip -9 求和，09-基线指标.md 方法）
 *   managerJsGzip         /manager（跳转后登录页）JS gzip 合计
 *   managerArticlesJsGzip /manager/articles JS gzip 合计
 *   homeTtfbColdMs        首页冷启动首字节（启动后首次请求）
 *   homeTtfbWarmMs        首页热 TTFB（连续 3 次中位数）
 *   apiArticlesTtfbMs     /api/articles?page=1 TTFB（3 次中位数）
 *   startToReadyNpmStartMs    npm start（start-next）到 /api/health 200
 *   startToReadyStandaloneMs  直接启动 .next/standalone/server.js 到 Ready（win32 无 standalone → null）
 *
 * - 自带临时库（DATABASE_URL 指向 os.tmpdir）与一次性 JWT_SECRET，均不写仓库
 * - 用法：node scripts/measure-baseline.mjs --out <path.json>
 */
import { spawn, spawnSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import process from "node:process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.MEASURE_PORT ?? 6795);
const BASE = `http://127.0.0.1:${PORT}`;
const JWT_SECRET = `measure-baseline-${Date.now()}-${Math.random().toString(36).slice(2)}-${Date.now()}`;
const IS_WIN = process.platform === "win32";
const SHELL = IS_WIN; // win32 上 npx 是 .cmd，spawnSync 必须 shell（Node ≥18.20.2）

function runNpx(args, env) {
  const r = spawnSync("npx", args, { cwd: ROOT, env, stdio: "pipe", encoding: "utf8", shell: SHELL });
  if (r.status !== 0) throw new Error(`npx ${args.join(" ")} 失败：\n${r.stdout?.slice(-2000)}\n${r.stderr?.slice(-2000)}`);
}

/** Prisma file URL 的平台分支（E-12 同根因）：win32 的 schema engine 打不开
 *  `file:///C:/...` 三斜线盘符 URL（os error 161 BAD_PATHNAME）；
 *  改用相对 ROOT 的形式（prisma.config.ts 的 url 以配置文件位置解析，与 dev 库 file:./prisma/dev.db 同款）。
 *  临时库因此必须与 ROOT 同盘（.cache/ 已 gitignore，不入仓库）；Linux/macOS 保持绝对 file URL。 */
function prismaUrl(dbFile) {
  if (IS_WIN) {
    const rel = path.relative(ROOT, dbFile).replace(/\\/g, "/");
    return `file:./${rel}`;
  }
  return pathToFileURL(dbFile).href;
}

function killTree(pid) {
  if (IS_WIN) spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore" });
  else {
    try { process.kill(-pid, "SIGTERM"); } catch { /* 已退出 */ }
  }
}

async function waitReady(url, timeoutMs, child) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (child.exitCode !== null) throw new Error(`服务提前退出（code ${child.exitCode}）`);
    try {
      const res = await fetch(url);
      if (res.ok) return Date.now() - start;
    } catch { /* 未就绪 */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`${url} ${timeoutMs}ms 内未就绪`);
}

/** 页面 HTML 中全部 <script src> 逐个下载后 gzip -9 求和（09-基线指标.md 方法） */
async function jsGzipSum(route) {
  const res = await fetch(`${BASE}${route}`, { redirect: "follow" });
  const html = await res.text();
  const srcs = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]).filter((s) => s.startsWith("/"));
  let total = 0;
  for (const src of srcs) {
    const r = await fetch(`${BASE}${src}`);
    const buf = Buffer.from(await r.arrayBuffer());
    total += gzipSync(buf, { level: 9 }).length;
  }
  return { total, scripts: srcs.length };
}

/** TTFB（time 首字节近似：fetch 响应头到达），取 n 次结果 */
async function ttfb(route, n = 3) {
  const times = [];
  for (let i = 0; i < n; i++) {
    const t0 = Date.now();
    const res = await fetch(`${BASE}${route}`);
    await res.arrayBuffer();
    times.push(Date.now() - t0);
  }
  return times;
}

const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};

async function main() {
  const outIdx = process.argv.indexOf("--out");
  const outPath = outIdx > -1 ? path.resolve(process.argv[outIdx + 1]) : path.join(ROOT, "baseline.json");
  const result = {
    measuredAt: new Date().toISOString(),
    sha: (() => { const r = spawnSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }); return r.stdout.trim(); })(),
    platform: process.platform,
    port: PORT,
    notes: [],
  };

  // 1) 临时库 + seed（不写仓库：.cache/ 已 gitignore；win32 下临时库必须与 ROOT 同盘——
  //    跨盘符的相对 file URL 非法（os error 123），os.tmpdir 可能在不同盘）
  const tmp = mkdtempSync(path.join(ROOT, ".cache", "baseline-"));
  const dbFile = path.join(tmp, "baseline.db");
  const env = { ...process.env, DATABASE_URL: prismaUrl(dbFile), JWT_SECRET };
  try {
    runNpx(["prisma", "migrate", "deploy"], env);
    runNpx(["ts-node", "prisma/seed.ts"], env);

    // 2) startToReady（standalone；win32 无 standalone → null）
    const standaloneServer = path.join(ROOT, ".next", "standalone", "server.js");
    if (IS_WIN || !existsSync(standaloneServer)) {
      result.startToReadyStandaloneMs = null;
      result.notes.push(IS_WIN ? "win32 无 standalone（next.config.ts 有意关闭，E-12 同口径）→ standalone 启动未测" : "缺少 .next/standalone/server.js");
    } else {
      const child = spawn(process.execPath, [standaloneServer], {
        cwd: path.dirname(standaloneServer),
        env: { ...env, PORT: String(PORT), HOSTNAME: "127.0.0.1", NODE_ENV: "production" },
        stdio: "ignore", detached: true,
      });
      try { result.startToReadyStandaloneMs = await waitReady(`${BASE}/api/health`, 60_000, child); }
      finally { killTree(child.pid); }
      await new Promise((r) => setTimeout(r, 1500)); // 释放端口
    }

    // 3) startToReady（npm start → start-next.mjs）：
    //    win32 上 spawn("npm.cmd") 无 shell 会 EINVAL（Node ≥18.20.2 起 .cmd 必须 shell）——
    //    直接用 node 跑 scripts/start-next.mjs（= package.json start 脚本的原始命令，无需 shell）
    const child2 = spawn(process.execPath, [path.join(ROOT, "scripts", "start-next.mjs")], {
      cwd: ROOT,
      env: { ...env, PORT: String(PORT), HOSTNAME: "127.0.0.1", NODE_ENV: "production" },
      stdio: "ignore", detached: true,
    });
    let serverUp = false;
    try {
      result.startToReadyNpmStartMs = await waitReady(`${BASE}/api/health`, 300_000, child2);
      serverUp = true;
    } catch (err) {
      result.notes.push(`npm start 未就绪：${err.message}`);
    }

    if (serverUp) {
      // 4) TTFB：首页冷 + 热（3 次中位数）、API 列表
      const homeTimes = await ttfb("/", 3);
      result.homeTtfbColdMs = homeTimes[0];
      result.homeTtfbWarmMs = median(homeTimes);
      const apiTimes = await ttfb("/api/articles?page=1", 3);
      result.apiArticlesTtfbMs = median(apiTimes);

      // 5) JS gzip 合计（3 路由）
      const home = await jsGzipSum("/");
      result.homeJsGzip = home.total;
      const mgr = await jsGzipSum("/manager");
      result.managerJsGzip = mgr.total;
      const mgrArticles = await jsGzipSum("/manager/articles");
      result.managerArticlesJsGzip = mgrArticles.total;
      result.notes.push(`script 数：home=${home.scripts} manager=${mgr.scripts} manager/articles=${mgrArticles.scripts}；/manager 按跳转后登录页计量`);
    }
  } finally {
    if (typeof child2 !== "undefined" && child2.pid) killTree(child2.pid);
    try { rmSync(tmp, { recursive: true, force: true }); } catch { /* Windows 文件占用时由系统清理 */ }
  }

  const { writeFileSync, mkdirSync } = await import("node:fs");
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  // start-next.mjs 的孙进程树在 Windows 上可能未被 taskkill 完全回收而挂住事件循环——
  // 测量已完成、产物已落盘，显式退出保证 exit 0（D-01 验收）
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
