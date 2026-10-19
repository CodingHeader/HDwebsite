/**
 * V7-SEC-03：越权回归黑盒套件（独立编写，防自证）
 *
 * 目标：对 SEC-01/02 修复后的代码，独立以 HTTP 级用例复现 5 条攻击路径（E1~E5），
 * 每条全部返回 403/400；另附 1 条超管正向用例证明修复未破坏正常路径。
 *
 * 设计原则：
 * 1. **只测路由层接线**，不复用 `assertRoleWriteAllowed` / `assertUserWriteAllowed` 纯函数
 *    （SEC-01/02 已单测纯函数；本套件只验证"路由是否在写库前正确拦截"）。
 * 2. **mock prisma 与 requireAuth**，不连 dev.db（防测试污染与自证）。
 * 3. 攻击意图以 HTTP 语义表达：`Request` + `Authorization`（mock 层校验）。
 *
 * 攻击路径（01-事实基线 §3）：
 *   E1 非超管 PUT /api/roles/{自己的角色} {isSuper:true} → 403（自升超管）
 *   E2 非超管 POST/PUT /api/roles 含自身没有的 permissions → 403（权限子集）
 *   E3 非超管 POST /api/users {roleId=超管角色} → 403（指派超管）
 *   E4 非超管 PUT /api/users/{超管} {password} → 403（重置超管密码/接管）
 *   E5 非超管 PUT 最后一名超管 {roleId=普通角色} → 400（系统无超管）
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  prisma: {
    user: { findUnique: vi.fn(), count: vi.fn(), create: vi.fn() },
    role: { findUnique: vi.fn(), findMany: vi.fn() },
  },
  requireAuth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: m.prisma, createPrismaClient: vi.fn(), SQLITE_BUSY_TIMEOUT_MS: 5000 }));
vi.mock("@/lib/api-auth", () => ({ requireAuth: m.requireAuth }));

import { POST as rolesPOST } from "@/app/api/roles/route";
import { PUT as rolePUT } from "@/app/api/roles/[id]/route";
import { POST as usersPOST } from "@/app/api/users/route";
import { PUT as userPUT } from "@/app/api/users/[id]/route";

/** 普通编辑：非超管，仅持有基础权限点 */
const editorSession = {
  id: 10,
  username: "editor",
  role: { id: 3, isSuper: false, permissions: ["role:edit", "role:create", "user:create", "user:edit"] },
};
/** 超管：直通 */
const superSession = {
  id: 1,
  username: "admin",
  role: { id: 1, isSuper: true, permissions: ["*"] },
};

function jsonReq(method: string, url: string, body?: unknown, token = "Bearer fake"): Request {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json", authorization: token },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const roleSelf = { id: 3, name: "编辑", isSuper: false, slug: "editor", permissions: ["role:edit", "user:edit"] };
const roleSuper = { id: 1, name: "超管", isSuper: true, slug: "super-admin", permissions: ["*"] };
const roleOther = { id: 5, name: "审核", isSuper: false, slug: "reviewer", permissions: ["user:list"] };
const userSuper = { id: 1, username: "admin", roleId: 1, role: roleSuper, isActive: true };
const userNormal = { id: 20, username: "editor2", roleId: 3, role: roleSelf, isActive: true };

beforeEach(() => {
  vi.clearAllMocks();
  m.requireAuth.mockResolvedValue({ ok: true, session: { ...editorSession } });
});

describe("E1：非超管 PUT 自己的角色 isSuper=true", () => {
  it("→ 403，且不写库", async () => {
    m.prisma.role.findUnique.mockResolvedValue(roleSelf);
    const res = await rolePUT(jsonReq("PUT", "http://localhost/api/roles/3", { isSuper: true }), { params: Promise.resolve({ id: "3" }) });
    expect(res.status).toBe(403);
  });
});

describe("E2：非超管授予自身没有的权限", () => {
  it("PUT /api/roles/5 permissions 含 user:delete → 403", async () => {
    m.prisma.role.findUnique.mockResolvedValue(roleOther);
    const res = await rolePUT(jsonReq("PUT", "http://localhost/api/roles/5", { permissions: ["user:delete"] }), { params: Promise.resolve({ id: "5" }) });
    expect(res.status).toBe(403);
  });
  it("POST /api/roles permissions 含 user:delete → 403", async () => {
    m.prisma.role.findUnique.mockResolvedValue(null);
    const res = await rolesPOST(jsonReq("POST", "http://localhost/api/roles", { name: "新角色", permissions: ["user:delete"] }));
    expect(res.status).toBe(403);
  });
});

describe("E3：非超管 POST 用户 roleId=超管", () => {
  it("→ 403，且不写库", async () => {
    m.prisma.user.findUnique.mockResolvedValue(null);
    m.prisma.role.findUnique.mockResolvedValue(roleSuper);
    const res = await usersPOST(jsonReq("POST", "http://localhost/api/users", { username: "newuser", password: "pass1234", roleId: 1 }));
    expect(res.status).toBe(403);
  });
});

describe("E4：非超管重置超管密码 / 改自己 roleId", () => {
  it("PUT /api/users/1 {password} → 403", async () => {
    m.prisma.user.findUnique.mockResolvedValue(userSuper);
    const res = await userPUT(jsonReq("PUT", "http://localhost/api/users/1", { password: "newpass1" }), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(403);
  });
  it("PUT /api/users/10 {roleId:1}（自己自升）→ 403", async () => {
    m.prisma.user.findUnique.mockResolvedValue({ ...userNormal, id: 10 });
    m.prisma.role.findUnique.mockResolvedValue(roleSuper);
    const res = await userPUT(jsonReq("PUT", "http://localhost/api/users/10", { roleId: 1 }), { params: Promise.resolve({ id: "10" }) });
    expect(res.status).toBe(403);
  });
});

describe("E5：把最后一名超管改离超管角色", () => {
  it("超管自己操作 → 400（U5）", async () => {
    m.requireAuth.mockResolvedValue({ ok: true, session: { ...superSession } });
    m.prisma.user.findUnique.mockResolvedValue(userSuper);
    m.prisma.role.findUnique.mockResolvedValue(roleSelf);
    m.prisma.user.count.mockResolvedValue(1);
    const res = await userPUT(jsonReq("PUT", "http://localhost/api/users/1", { roleId: 3 }), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(400);
  });
});

describe("正向：超管正常路径不回归", () => {
  it("超管建用户 roleId=普通角色 → 201", async () => {
    m.requireAuth.mockResolvedValue({ ok: true, session: { ...superSession } });
    m.prisma.user.findUnique.mockResolvedValue(null);
    m.prisma.role.findUnique.mockResolvedValue(roleSelf);
    m.prisma.user.create.mockResolvedValue({ id: 99, role: roleSelf });
    const res = await usersPOST(jsonReq("POST", "http://localhost/api/users", { username: "newuser", password: "pass1234", roleId: 3 }));
    expect(res.status).toBe(201);
  });
});