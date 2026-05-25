import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { shouldRunBuild } from "./start-next-utils.mjs";

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
const watchedBuildEntries = [
  "src",
  "public",
  "prisma",
  "scripts",
  "package.json",
  "package-lock.json",
  "next.config.ts",
  "tsconfig.json",
];

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

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
