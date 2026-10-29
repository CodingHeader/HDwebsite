import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { shouldRunBuild } from "./start-next-utils.mjs";
// V22-ENV-01：复用 src/lib/env.ts 的校验规则（Node v24 原生 strip-types 可 import .ts，
// 该模块为纯函数、不依赖 Next 运行时）；另引入 DB 迁移检测。
import { assertProductionEnv } from "../src/lib/env.ts";
import { checkDbReady, printDbGuidance } from "./check-db.mjs";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
const buildIdFile = path.resolve(process.cwd(), ".next", "BUILD_ID");
const standaloneServer = path.resolve(process.cwd(), ".next", "standalone", "server.js");
const rootStaticDir = path.resolve(process.cwd(), ".next", "static");
const standaloneStaticDir = path.resolve(process.cwd(), ".next", "standalone", ".next", "static");
const publicDir = path.resolve(process.cwd(), "public");
const standalonePublicDir = path.resolve(process.cwd(), ".next", "standalone", "public");
const databaseFile = path.resolve(process.cwd(), "prisma", "dev.db");
const port = process.env.PORT || "6789";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const resolvedDatabaseUrl = process.env.DATABASE_URL || pathToFileURL(databaseFile).href;
const useStandalone = process.platform !== "win32";
// D-02：监视面精确化——不再监视整个 prisma/ 目录（数据库写入 dev.db/备份不再触发整站重建），
// 只监视 schema 与 migrations；scripts 变化不触发重建（构建产物不含 scripts 运行时）。
const watchedBuildEntries = [
  "src",
  "public",
  "prisma/schema.prisma",
  "prisma/migrations",
  "package.json",
  "package-lock.json",
  "next.config.ts",
  "tsconfig.json",
];

// D-02：启动前按 Next 优先级加载 env 文件（.env.production.local > .env.local > .env.production > .env），
// 使 npm start / node scripts/start-next.mjs 的生产启动读得到 .env.local（与 next dev 行为对齐）。
// 注意：@next/env 是 CommonJS 模块，ESM 命名导入不可用——经默认导出解构。
import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd(), process.env.NODE_ENV === "production", { info: () => {}, error: console.error });
loadEnvConfig(process.cwd(), process.env.NODE_ENV === "production", { info: () => {}, error: console.error });

// V22-ENV-01：前置门禁——env 校验 + DB 迁移检测，均在 spawn next 之前、监听端口之前。
// 原实况：FATAL 发生在 Next instrumentation 内（端口已监听但服务不可用），此处提前到进程入口，
// 保证「缺条件 → 未监听端口 → exit != 0」。
assertProductionEnv(process.env);

const dbState = await checkDbReady(process.env);
if (!dbState.ok) {
  printDbGuidance(dbState.missing);
  process.exit(1);
}

function runBuildIfNeeded() {
  if (!shouldRunBuild({
    projectRoot: process.cwd(),
    buildIdPath: buildIdFile,
    watchEntries: watchedBuildEntries,
  })) {
    return;
  }

  console.log("[start-next] Build missing or stale. Running next build...");

  const result = spawnSync(process.execPath, [nextBin, "build"], {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: resolvedDatabaseUrl,
    },
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function copyDirectory(source, target) {
  if (!existsSync(source)) {
    console.warn(`[start-next] Source not found, skipping copy: ${source}`);
    return;
  }

  try {
    const targetDir = path.dirname(target);
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }
    rmSync(target, { recursive: true, force: true });
    cpSync(source, target, { recursive: true });
    console.log(`[start-next] Copied ${source} → ${target}`);
  } catch (err) {
    console.error(`[start-next] Failed to copy ${source} → ${target}:`, err.message);
    throw err;
  }
}

function syncStandaloneAssets() {
  if (!useStandalone || !existsSync(standaloneServer)) {
    return;
  }

  copyDirectory(rootStaticDir, standaloneStaticDir);
  copyDirectory(publicDir, standalonePublicDir);
}

runBuildIfNeeded();
syncStandaloneAssets();

const commandArgs = useStandalone && existsSync(standaloneServer)
  ? [standaloneServer]
  : [nextBin, "start", "-p", port, "-H", hostname];

const child = spawn(process.execPath, commandArgs, {
  stdio: "inherit",
  env: {
    ...process.env,
    PORT: port,
    HOSTNAME: hostname,
    DATABASE_URL: resolvedDatabaseUrl,
  },
});

// V22-ENV-02：启动身份块——一条日志即可确认启动的是 HDwebsite（app）与其端口，避免被其它项目误导
console.log("────────────────────────────────────────────");
console.log("弘道教育 HDwebsite 启动中");
console.log("  应用标识: hdwebsite");
console.log("  端口: " + port + " | 环境: " + (process.env.NODE_ENV || "development"));
console.log("  数据库: " + resolvedDatabaseUrl);
console.log("────────────────────────────────────────────");

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});