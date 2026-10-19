/**
 * V7-SEC-02 单测：用户写入越权收口（users POST/PUT/DELETE 路由层）
 * 复用 SEC-01 的纯函数 assertUserWriteAllowed（只读引用），验证路由在写库前正确拦截。
 * 覆盖：
 *   E3 非超管指派超管角色（POST/PUT）
 *   E4 非超管重置/修改超管账号、非超管删超管账号（DELETE 变体）
 *   E5 最后一名超管被改离超管角色
 *   超管正常路径回归（建用户/改角色/删普通用户）
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock 工厂被 hoist 到文件顶部，不能引用外部 top-level 变量；用 vi.hoisted 构造共享实例。
const m = vi.hoisted(() => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    role: { findUnique: vi.fn() },
  },
  requireAuth: vi.fn(async () => ({ ok: true, session: { id: 1, username: "admin", role: { id: 1, isSuper: true, permissions: ["*"] } } })),
}));
const prismaMock = m.prisma;
vi.mock("@/lib/prisma", () => ({ prisma: m.prisma, createPrismaClient: vi.fn(), SQLITE_BUSY_TIMEOUT_MS: 5000 }));
vi.mock("@/lib/api-auth", () => ({ requireAuth: m.requireAuth }));

const superSession = {
  id: 1,
  username: "admin",
  role: { id: 1, isSuper: true, permissions: ["*"] },
};
const normalSession = {
  id: 10,
  username: "editor",
  role: { id: 3, isSuper: false, permissions: ["user:create", "user:edit", "user:delete"] },
};

import { POST } from "@/app/api/users/route";
import { PUT, DELETE } from "@/app/api/users/[id]/route";

// 让 hashPassword 走真实 bcrypt（慢但正确）——改为 spy 以加速
vi.mock("@/lib/auth", async (orig) => ({
  ...(await orig<typeof import("@/lib/auth")>()),
  hashPassword: vi.fn(async () => "hashed"),
}));

const superRole = { id: 1, name: "超管", isSuper: true, permissions: [] };
const normalRole = { id: 3, name: "编辑", isSuper: false, permissions: ["user:edit"] };

function req(method: string, body?: unknown): Request {
  return new Request("http://localhost/api/users", {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function asSuper() {
  m.requireAuth.mockResolvedValue({ ok: true, session: { ...superSession } });
}
function asNormal() {
  m.requireAuth.mockResolvedValue({ ok: true, session: { ...normalSession } });
}

beforeEach(() => {
  vi.clearAllMocks();
  asSuper();
  prismaMock.role.findUnique.mockResolvedValue(normalRole);
});

describe("POST /api/users（E3）", () => {
  it("非超管指派超管角色 → 403，且不写库", async () => {
    asNormal();
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.role.findUnique.mockResolvedValue(superRole);
    const res = await POST(req("POST", { username: "newuser", password: "pass1234", roleId: 1 }));
    expect(res.status).toBe(403);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });
  it("超管指派超管角色 → 通过（不回归）", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.role.findUnique.mockResolvedValue(superRole);
    prismaMock.user.create.mockResolvedValue({ id: 99, role: superRole });
    const res = await POST(req("POST", { username: "newuser", password: "pass1234", roleId: 1 }));
    expect(res.status).toBe(201);
    expect(prismaMock.user.create).toHaveBeenCalledTimes(1);
  });
  it("非超管指派普通角色 → 通过", async () => {
    asNormal();
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.role.findUnique.mockResolvedValue(normalRole);
    prismaMock.user.create.mockResolvedValue({ id: 99, role: normalRole });
    const res = await POST(req("POST", { username: "newuser", password: "pass1234", roleId: 3 }));
    expect(res.status).toBe(201);
  });
});

describe("PUT /api/users/[id]（E4/E5）", () => {
  const params = { params: Promise.resolve({ id: "1" }) };
  const existingSuper = { id: 1, username: "admin", roleId: 1, role: superRole, isActive: true };
  const existingNormal = { id: 5, username: "editor", roleId: 3, role: normalRole, isActive: true };

  it("非超管修改超管账号（改昵称）→ 403", async () => {
    asNormal();
    prismaMock.user.findUnique.mockResolvedValue(existingSuper);
    const res = await PUT(req("PUT", { nickname: "hack" }), params);
    expect(res.status).toBe(403);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });
  it("非超管重置超管密码 → 403", async () => {
    asNormal();
    prismaMock.user.findUnique.mockResolvedValue(existingSuper);
    const res = await PUT(req("PUT", { password: "new-pass" }), params);
    expect(res.status).toBe(403);
  });
  it("非超管把普通用户改成超管角色 → 403（E3 PUT）", async () => {
    asNormal();
    prismaMock.user.findUnique.mockResolvedValue(existingNormal);
    prismaMock.role.findUnique.mockResolvedValue(superRole);
    const res = await PUT(req("PUT", { roleId: 1 }), params);
    expect(res.status).toBe(403);
  });
  it("非超管改自己的角色 → 403（自升）", async () => {
    asNormal();
    prismaMock.user.findUnique.mockResolvedValue(existingNormal);
    prismaMock.role.findUnique.mockResolvedValue(superRole);
    const res = await PUT(req("PUT", { roleId: 1 }), { params: Promise.resolve({ id: "10" }) });
    expect(res.status).toBe(403);
  });
  it("最后一名超管被改离超管角色 → 400（E5）", async () => {
    asSuper();
    prismaMock.user.findUnique.mockResolvedValue(existingSuper);
    prismaMock.role.findUnique.mockResolvedValue(normalRole);
    prismaMock.user.count.mockResolvedValue(1);
    const res = await PUT(req("PUT", { roleId: 3 }), params);
    expect(res.status).toBe(400);
  });
  it("超管改非最后一名超管角色 → 通过", async () => {
    asSuper();
    prismaMock.user.findUnique.mockResolvedValue(existingSuper);
    prismaMock.role.findUnique.mockResolvedValue(normalRole);
    prismaMock.user.count.mockResolvedValue(2);
    prismaMock.user.update.mockResolvedValue({ ...existingSuper, roleId: 3 });
    const res = await PUT(req("PUT", { roleId: 3 }), params);
    expect(res.status).toBe(200);
  });
  it("超管重置普通用户密码 → 通过（不回归）", async () => {
    asSuper();
    prismaMock.user.findUnique.mockResolvedValue(existingNormal);
    prismaMock.user.update.mockResolvedValue({ ...existingNormal, passwordHash: "hashed" });
    const res = await PUT(req("PUT", { password: "newpass1" }), { params: Promise.resolve({ id: "5" }) });
    expect(res.status).toBe(200);
    expect(prismaMock.user.update).toHaveBeenCalledTimes(1);
  });
});

describe("DELETE /api/users/[id]（E4 变体）", () => {
  const params = { params: Promise.resolve({ id: "1" }) };

  it("非超管删除超管账号 → 403", async () => {
    asNormal();
    prismaMock.user.findUnique.mockResolvedValue({ id: 1, username: "admin", roleId: 1, role: superRole, isActive: true });
    const res = await DELETE(req("DELETE"), params);
    expect(res.status).toBe(403);
    expect(prismaMock.user.delete).not.toHaveBeenCalled();
  });
  it("非超管删除普通用户 → 通过", async () => {
    asNormal();
    prismaMock.user.findUnique.mockResolvedValue({ id: 5, username: "editor", roleId: 3, role: normalRole, isActive: true });
    prismaMock.user.delete.mockResolvedValue({ id: 5 });
    const res = await DELETE(req("DELETE"), { params: Promise.resolve({ id: "5" }) });
    expect(res.status).toBe(200);
  });
  it("删除最后一名超管 → 400（保留原有保护）", async () => {
    asSuper();
    prismaMock.user.findUnique.mockResolvedValue({ id: 1, username: "admin", roleId: 1, role: superRole, isActive: true });
    prismaMock.user.count.mockResolvedValue(1);
    const res = await DELETE(req("DELETE"), params);
    expect(res.status).toBe(400);
  });
});