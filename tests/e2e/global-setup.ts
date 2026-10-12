/**
 * E2E 全局准备（P05）
 * 1. 重建独立数据库 prisma/e2e.db：prisma migrate deploy + seed（dev.db 不受影响）
 * 2. 启动 mock 上游（LLM + 采集站点）
 * 3. 以 e2e.db 启动被测应用（.next/standalone/server.js，端口 E2E_PORT），等待就绪
 *    不经 scripts/start-next.mjs：其"构建过期"判断监视 prisma/ 目录，e2e.db 重建会触发整站重新构建并干扰
 *    同机运行的其他服务；这里改为要求先 `npm run build`（src 比 BUILD_ID 新则直接报错，避免测到旧代码）。
 * 返回的 teardown 关闭两个服务（按 PID 结束进程组，不使用 pkill）。
 */
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { cpSync, existsSync, mkdirSync, openSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { E2E_BASE_URL, E2E_DB_FILE, E2E_PORT, MOCK_PORT, ROOT } from "./fixtures/env";
import { startMockServer } from "./fixtures/mock-llm";

const JWT_SECRET = "e2e-jwt-secret-0123456789abcdef-0123456789abcdef";

function run(cmd: string, args: string[], env: NodeJS.ProcessEnv) {
  const r = spawnSync(cmd, args, { cwd: ROOT, env, stdio: "pipe", encoding: "utf8" });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} 失败：\n${r.stdout}\n${r.stderr}`);
}

async function waitReady(url: string, timeoutMs: number, child: ChildProcess) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (child.exitCode !== null) throw new Error(`被测应用提前退出（code ${child.exitCode}），见 .cache/e2e/app.log`);
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* 未就绪 */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`被测应用 ${timeoutMs}ms 内未就绪：${url}`);
}

function latestMtime(p: string): number {
  if (!existsSync(p)) return 0;
  const st = statSync(p);
  if (!st.isDirectory()) return st.mtimeMs;
  return readdirSync(p).reduce((m, c) => Math.max(m, latestMtime(path.join(p, c))), st.mtimeMs);
}

/** 校验构建新鲜度并把 static/public 同步进 standalone（与 start-next 相同的产物布局） */
function prepareStandalone(): string {
  const buildId = path.join(ROOT, ".next", "BUILD_ID");
  const server = path.join(ROOT, ".next", "standalone", "server.js");
  if (!existsSync(buildId) || !existsSync(server)) throw new Error("缺少生产构建：请先运行 npm run build");
  const builtAt = statSync(buildId).mtimeMs;
  if (latestMtime(path.join(ROOT, "src")) > builtAt) throw new Error("构建已过期（src 比 .next/BUILD_ID 新）：请先运行 npm run build");
  const staticDst = path.join(ROOT, ".next", "standalone", ".next", "static");
  if (!existsSync(staticDst) || statSync(staticDst).mtimeMs < builtAt) {
    rmSync(staticDst, { recursive: true, force: true });
    cpSync(path.join(ROOT, ".next", "static"), staticDst, { recursive: true });
  }
  const publicDst = path.join(ROOT, ".next", "standalone", "public");
  if (!existsSync(publicDst)) cpSync(path.join(ROOT, "public"), publicDst, { recursive: true });
  return server;
}

export default async function globalSetup() {
  const serverJs = prepareStandalone();
  const dbUrl = pathToFileURL(E2E_DB_FILE).href;
  for (const suffix of ["", "-journal", "-wal", "-shm"]) rmSync(E2E_DB_FILE + suffix, { force: true });
  const env = { ...process.env, DATABASE_URL: dbUrl, JWT_SECRET };
  run("npx", ["prisma", "migrate", "deploy"], env);
  run("npx", ["ts-node", "prisma/seed.ts"], env);

  const mock = await startMockServer(MOCK_PORT);

  const cacheDir = path.join(ROOT, ".cache", "e2e");
  if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
  const log = openSync(path.join(cacheDir, "app.log"), "w");
  const app = spawn(process.execPath, [serverJs], {
    cwd: ROOT,
    env: { ...env, PORT: String(E2E_PORT), HOSTNAME: "127.0.0.1", NODE_ENV: "production" },
    stdio: ["ignore", log, log],
    detached: true,
  });
  try {
    await waitReady(`${E2E_BASE_URL}/api/health`, 600_000, app);
  } catch (err) {
    if (app.pid) process.kill(-app.pid, "SIGTERM");
    mock.close();
    throw err;
  }

  return async () => {
    mock.close();
    if (app.pid) {
      try {
        process.kill(-app.pid, "SIGTERM");
      } catch {
        /* 已退出 */
      }
    }
  };
}
