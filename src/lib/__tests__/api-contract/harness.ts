/**
 * 契约测试夹具：用 prisma/migrations 在临时 SQLite 文件上建库（不依赖 gitignored 的 dev.db），
 * 写入最小角色/用户，签发 token，直接调用路由 handler。
 * 用法：测试文件顶部 vi.hoisted 设置 process.env.DATABASE_URL = tempDbUrl()（须早于 prisma 导入），
 * 再在 beforeAll 中 await initTestDb()。
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { signToken } from "@/lib/jwt";

export async function initTestDb(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url || !url.startsWith("file:") || !url.includes("hdw-contract-")) {
    throw new Error("契约测试必须使用临时库（DATABASE_URL=file:...hdw-contract-*.db）");
  }
  const file = url.slice("file:".length);
  if (fs.existsSync(file)) fs.rmSync(file);
  const client = createClient({ url });
  const dir = path.resolve(process.cwd(), "prisma/migrations");
  const migrations = fs
    .readdirSync(dir)
    .filter((d) => fs.existsSync(path.join(dir, d, "migration.sql")))
    .sort();
  for (const m of migrations) {
    await client.executeMultiple(fs.readFileSync(path.join(dir, m, "migration.sql"), "utf8"));
  }
  client.close();
}

export function cleanupTestDb(): void {
  const url = process.env.DATABASE_URL ?? "";
  const file = url.slice("file:".length);
  for (const f of [file, `${file}-journal`, `${file}-wal`, `${file}-shm`]) {
    try {
      if (f.includes("hdw-contract-") && fs.existsSync(f)) fs.rmSync(f);
    } catch {
      // ignore
    }
  }
}

type Actor = { id: number; username: string; roleId: number; isSuper: boolean; permissions: string[] };

/** 建角色 + 用户，返回 Bearer token */
export async function createActor(
  prisma: { role: { create: (a: unknown) => Promise<{ id: number }> }; user: { create: (a: unknown) => Promise<{ id: number }> } },
  username: string,
  permissions: string[],
  isSuper = false
): Promise<{ token: string; actor: Actor }> {
  const role = await prisma.role.create({
    data: { name: `role-${username}`, slug: `role-${username}`, permissions: JSON.stringify(permissions), isSuper },
  });
  const user = await prisma.user.create({
    data: { username, passwordHash: "x", roleId: role.id },
  });
  const actor = { id: user.id, username, roleId: role.id, isSuper, permissions };
  const token = signToken({ uid: user.id, username, roleId: role.id, isSuper, permissions });
  return { token, actor };
}

export function req(
  url: string,
  init: { method?: string; token?: string; body?: unknown } = {}
): Request {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (init.token) headers.authorization = `Bearer ${init.token}`;
  return new Request(`http://localhost${url}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : typeof init.body === "string" ? init.body : JSON.stringify(init.body),
  });
}

export function ctx<P extends Record<string, string>>(params: P = {} as P) {
  return { params: Promise.resolve(params) };
}

export async function json(res: Response): Promise<{ code: number; data: any; message: string }> { // eslint-disable-line @typescript-eslint/no-explicit-any
  return (await res.json()) as { code: number; data: any; message: string }; // eslint-disable-line @typescript-eslint/no-explicit-any
}
