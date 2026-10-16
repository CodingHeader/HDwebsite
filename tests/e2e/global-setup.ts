/**
 * E2E 全局准备（P05）
 * 1. 重建独立数据库 prisma/e2e.db：prisma migrate deploy + seed（dev.db 不受影响）
 * 2. 启动 mock 上游（LLM + 采集站点）
 * 3. 以 e2e.db 启动被测应用（standalone：.next/standalone/server.js；win32：回退 `next start`，E-12），
 *    端口 E2E_PORT，等待就绪
 *    不经 scripts/start-next.mjs：其"构建过期"判断监视 prisma/ 目录，e2e.db 重建会触发整站重新构建并干扰
 *    同机运行的其他服务；这里改为要求先 `npm run build`（src 比 BUILD_ID 新则直接报错，避免测到旧代码）。
 * 返回的 teardown 关闭两个服务（进程树按平台结束，kill-tree.ts；不使用 pkill）。
 *
 * E-12（跨平台）：Linux 代码路径与 827646b 字节级一致（仍走 standalone）；
 * win32 的差异仅限：①无 standalone → 回退 next start；②spawnSync 加 shell（Node ≥18.20.2 起
 * Windows 上 .cmd 必须 shell）；③进程树结束用 taskkill /T /F（负 PID 进程组在 Windows 不存在）。
 * 不改 next.config.ts 与 scripts/start-next.mjs。
 */
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { cpSync, existsSync, mkdirSync, openSync, readdirSync, rmSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { ADMIN, E2E_BASE_URL, E2E_DB_FILE, E2E_PORT, MOCK_PORT, ROOT, VIEWER } from "./fixtures/env";
import { startMockServer } from "./fixtures/mock-llm";
import { appSpawnArgs, killTree } from "./fixtures/kill-tree";

/** E-12：standalone 仅在非 win32 平台使用（next.config.ts 有意在 win32 关闭 standalone 产出） */
const useStandalone = process.platform !== "win32";

const JWT_SECRET = "e2e-jwt-secret-0123456789abcdef-0123456789abcdef";
/** CCR-1（W0-11）：生产 env 校验（D-03）所需的测试密钥值（仅 e2e.db 使用，非真实凭据） */
const ENCRYPTION_KEY = "e2e-encryption-key-0123456789abcdef-0123456789abcdef";

/** admin/viewer 的 storageState 落盘路径（helpers.ts 的 useAdmin/useViewer 读取） */
export const ADMIN_STATE = path.join(ROOT, ".cache", "e2e", "state-admin.json");
export const VIEWER_STATE = path.join(ROOT, ".cache", "e2e", "state-viewer.json");

/** E-12：win32 上 npx 是 .cmd，Node ≥18.20.2 起 spawnSync 必须带 shell；Linux 行为不变（shell=false 等价缺省） */
function runNpx(args: string[], env: NodeJS.ProcessEnv) {
  const r = spawnSync("npx", args, { cwd: ROOT, env, stdio: "pipe", encoding: "utf8", shell: process.platform === "win32" });
  if (r.status !== 0) throw new Error(`npx ${args.join(" ")} 失败：\n${r.stdout}\n${r.stderr}`);
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

/** 校验构建新鲜度；standalone 环境下把 static/public 同步进 standalone（与 start-next 相同的产物布局）。
 * E-12：win32 无 standalone（next.config.ts 有意关闭），返回 null 并回退 `next start`；新鲜度仍以 BUILD_ID 校验。 */
function prepareStandalone(): string | null {
  const buildId = path.join(ROOT, ".next", "BUILD_ID");
  if (!existsSync(buildId)) throw new Error("缺少生产构建：请先运行 npm run build");
  if (!useStandalone) return null; // E-12：win32 回退 next start
  const server = path.join(ROOT, ".next", "standalone", "server.js");
  if (!existsSync(server)) throw new Error("缺少生产构建：请先运行 npm run build");
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
  // E-12：dbUrl 平台分支——Linux 保持绝对 file URL（与 827646b 字节级一致）；
  // win32 的 Prisma schema engine 打不开 `file:///E:/...` 三斜线绝对 URL（os error 161 BAD_PATHNAME），
  // 改用与 dev 库（prisma.config.ts 默认 `file:./prisma/dev.db`）同款的相对形式，从 cwd=ROOT 解析。
  const dbUrl = useStandalone
    ? pathToFileURL(E2E_DB_FILE).href
    : `file:${path.relative(ROOT, E2E_DB_FILE).replace(/\\/g, "/")}`;
  for (const suffix of ["", "-journal", "-wal", "-shm"]) rmSync(E2E_DB_FILE + suffix, { force: true });
  const env = { ...process.env, DATABASE_URL: dbUrl, JWT_SECRET };
  // E-12：npx 走 runNpx（win32 加 shell）；prisma migrate deploy + seed
  runNpx(["prisma", "migrate", "deploy"], env);
  runNpx(["ts-node", "prisma/seed.ts"], env);

  const mock = await startMockServer(MOCK_PORT);

  const cacheDir = path.join(ROOT, ".cache", "e2e");
  if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
  const log = openSync(path.join(cacheDir, "app.log"), "w");
  // E-12：启动命令按平台分支（standalone：[node, server.js]；win32：[node, next, start, ...]）
  const { cmd, args } = appSpawnArgs(ROOT, serverJs, E2E_PORT);
  const app = spawn(cmd, args, {
    cwd: ROOT,
    env: {
      ...env,
      PORT: String(E2E_PORT),
      HOSTNAME: "127.0.0.1",
      NODE_ENV: "production",
      // CCR-1（W0-11）：生产 env 校验（D-03）所需的测试值——standalone 启动不因缺 env 失败
      ENCRYPTION_KEY,
      APP_ORIGIN: `http://127.0.0.1:${E2E_PORT}`,
      DATA_DIR: path.join(os.tmpdir(), `hd-e2e-${process.pid}`),
    },
    stdio: ["ignore", log, log],
    detached: true,
  });
  try {
    await waitReady(`${E2E_BASE_URL}/api/health`, 600_000, app);
  } catch (err) {
    if (app.pid) killTree(app.pid, "SIGTERM");
    mock.close();
    throw err;
  }

  try {
    await prepareAccountsAndStates();
  } catch (err) {
    if (app.pid) killTree(app.pid, "SIGTERM");
    mock.close();
    throw err;
  }

  return async () => {
    mock.close();
    if (app.pid) {
      try {
        killTree(app.pid, "SIGTERM");
      } catch {
        /* 已退出 */
      }
    }
  };
}

/**
 * CCR-1（W0-11）：幂等创建 e2e-viewer 并写 admin/viewer 的 storageState。
 * 目的：除 globalSetup（本函数 2 次）与 auth.spec（验证登录本身）外，其余用例调用登录接口 0 次，
 * 避免撞同 IP 60s≤10 次的登录限流（api/auth/login/route.ts）。
 */
async function prepareAccountsAndStates(): Promise<void> {
  const login = async (user: { username: string; password: string }): Promise<string> => {
    const res = await fetch(`${E2E_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });
    const body = (await res.json()) as { code: number; message?: string; data?: { token?: string } };
    if (body.code !== 200 || !body.data?.token) throw new Error(`登录 ${user.username} 失败：${body.message ?? res.status}`);
    return body.data.token;
  };

  const adminToken = await login(ADMIN);

  // 幂等创建 e2e-viewer（VIEWER 账号，viewer 角色）；已存在（400/409"已存在"）则忽略
  const rolesRes = await fetch(`${E2E_BASE_URL}/api/roles?keyword=viewer&limit=50`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const rolesBody = (await rolesRes.json()) as { code: number; data?: { list?: { id: number; slug?: string }[] } };
  const viewerRole = rolesBody.data?.list?.find((r) => r.slug === "viewer");
  if (!viewerRole) throw new Error("seed 未产出 viewer 角色（slug=viewer）");
  const createRes = await fetch(`${E2E_BASE_URL}/api/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ username: VIEWER.username, password: VIEWER.password, roleId: viewerRole.id, isActive: true }),
  });
  if (createRes.status !== 200) {
    const body = (await createRes.json().catch(() => ({}))) as { message?: string };
    // 幂等（W0-13 修正）：创建成功（200/201，如"创建用户成功"）或已存在（400/409 带"已存在"）均放行；仅其他错误抛出
    const created = createRes.status === 201 || /成功/i.test(body.message ?? "");
    const exists = createRes.status === 409 || /已存在|exists/i.test(body.message ?? "");
    if (!created && !exists) {
      throw new Error(`创建 ${VIEWER.username} 失败：${body.message ?? createRes.status}`);
    }
  }

  // admin 与 viewer 各登录一次，写 storageState（context 级 cookie 注入）
  const writeState = async (user: { username: string; password: string }, statePath: string) => {
    const browser = await chromium.launch();
    try {
      const ctx = await browser.newContext({ baseURL: E2E_BASE_URL });
      const page = await ctx.newPage();
      await page.goto("/manager/login");
      await page.locator("#login-username").fill(user.username);
      await page.locator("#login-password").fill(user.password);
      await page.locator("#login-password").press("Enter");
      await page.waitForURL(/\/manager\/?$/, { timeout: 30_000 });
      await ctx.storageState({ path: statePath });
      await ctx.close();
    } finally {
      await browser.close();
    }
  };
  await writeState(ADMIN, ADMIN_STATE);
  await writeState(VIEWER, VIEWER_STATE);
}
