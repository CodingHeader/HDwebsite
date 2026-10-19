/**
 * V7-SEC-01 单测：越权收口纯函数
 * 覆盖 E1~E5 越权路径 + 超管正常路径（回归不破坏）
 */
import { describe, expect, it } from "vitest";
import {
  assertRoleWriteAllowed,
  assertUserWriteAllowed,
  canGrantPermissions,
  type CallerClaims,
} from "@/lib/authz/escalation";

const superCaller: CallerClaims = { isSuper: true, permissions: [], callerRoleId: 1 };
const normalCaller = (perms: string[], roleId = 3, userId = 10): CallerClaims => ({
  isSuper: false,
  permissions: perms,
  callerRoleId: roleId,
  callerUserId: userId,
});

describe("canGrantPermissions", () => {
  it("超管可授予任意权限", () => {
    expect(canGrantPermissions(superCaller, ["role:create", "user:delete"])).toBe(true);
  });
  it("非超管只能授予自身有的权限", () => {
    const c = normalCaller(["role:edit"]);
    expect(canGrantPermissions(c, ["role:edit"])).toBe(true);
    expect(canGrantPermissions(c, ["role:create"])).toBe(false);
    expect(canGrantPermissions(c, ["user:delete"])).toBe(false);
  });
  it("module:* 通配覆盖 module:action", () => {
    const c = normalCaller(["role:*"]);
    expect(canGrantPermissions(c, ["role:edit", "role:delete"])).toBe(true);
    expect(canGrantPermissions(c, ["user:edit"])).toBe(false);
  });
  it("* 通配覆盖一切", () => {
    const c = normalCaller(["*"]);
    expect(canGrantPermissions(c, ["llm:edit", "review:edit"])).toBe(true);
  });
});

describe("assertRoleWriteAllowed（E1/E2）", () => {
  it("非超管改自己所属角色 → 403", () => {
    const r = assertRoleWriteAllowed(normalCaller(["role:edit"], 3), {
      targetRoleId: 3,
      isSuper: false,
      permissions: ["role:list"],
    });
    expect(r?.code).toBe(403);
  });
  it("非超管设置 isSuper=true → 403（E1）", () => {
    const r = assertRoleWriteAllowed(normalCaller(["role:edit"]), {
      targetRoleId: 5,
      isSuper: true,
    });
    expect(r?.code).toBe(403);
  });
  it("非超管授予自身没有的权限 → 403（E2）", () => {
    const r = assertRoleWriteAllowed(normalCaller(["role:edit"]), {
      targetRoleId: 5,
      permissions: ["user:delete"],
    });
    expect(r?.code).toBe(403);
  });
  it("非超管授予自身有的权限（自身同时持有），其他角色 → 通过", () => {
    const r = assertRoleWriteAllowed(normalCaller(["role:edit", "role:list"]), {
      targetRoleId: 5,
      isSuper: false,
      permissions: ["role:edit", "role:list"],
    });
    expect(r).toBeNull();
  });
  it("非超管授予自身缺项权限（如只有 role:edit 却给 role:list）→ 403", () => {
    const r = assertRoleWriteAllowed(normalCaller(["role:edit"]), {
      targetRoleId: 5,
      permissions: ["role:edit", "role:list"],
    });
    expect(r?.code).toBe(403);
  });
  it("超管修改任意角色含 isSuper → 通过（不回归）", () => {
    const r = assertRoleWriteAllowed(superCaller, {
      targetRoleId: 5,
      isSuper: true,
      permissions: ["role:create", "user:delete"],
    });
    expect(r).toBeNull();
  });
  it("非超管只改描述不带 permissions/isSuper → 通过", () => {
    const r = assertRoleWriteAllowed(normalCaller(["role:edit"]), { targetRoleId: 5 });
    expect(r).toBeNull();
  });
});

describe("assertUserWriteAllowed（E3/E4/E5）", () => {
  it("非超管指派超管角色 → 403（E3 POST）", () => {
    const r = assertUserWriteAllowed(
      normalCaller(["user:create"]),
      { targetUserId: 20, targetRoleIsSuper: false, requestedRoleId: 1, requestedRoleIsSuper: true },
      { isLastActiveSuperAdmin: false },
    );
    expect(r?.code).toBe(403);
  });
  it("E3 PUT 变体：非超管把普通用户改为超管角色 → 403", () => {
    const r = assertUserWriteAllowed(
      normalCaller(["user:edit"]),
      { targetUserId: 20, targetRoleIsSuper: false, requestedRoleId: 1, requestedRoleIsSuper: true },
      { isLastActiveSuperAdmin: false },
    );
    expect(r?.code).toBe(403);
  });
  it("非超管重置超管密码 → 403（E4）", () => {
    const r = assertUserWriteAllowed(
      normalCaller(["user:edit"]),
      { targetUserId: 1, targetRoleIsSuper: true, requestedRoleId: null, requestedRoleIsSuper: false, resetsPassword: true },
      { isLastActiveSuperAdmin: false },
    );
    expect(r?.code).toBe(403);
  });
  it("非超管改超管账号（非密码、非角色）→ 403", () => {
    const r = assertUserWriteAllowed(
      normalCaller(["user:edit"]),
      { targetUserId: 1, targetRoleIsSuper: true, requestedRoleId: null, requestedRoleIsSuper: false },
      { isLastActiveSuperAdmin: false },
    );
    expect(r?.code).toBe(403);
  });
  it("非超管改自己的角色 → 403（自升）", () => {
    const r = assertUserWriteAllowed(
      normalCaller(["user:edit"], 3, 10),
      { targetUserId: 10, targetRoleIsSuper: false, requestedRoleId: 1, requestedRoleIsSuper: true },
      { isLastActiveSuperAdmin: false },
    );
    expect(r?.code).toBe(403);
  });
  it("最后一名超管被改离超管角色 → 400（E5）", () => {
    const r = assertUserWriteAllowed(
      superCaller,
      { targetUserId: 1, targetRoleIsSuper: true, requestedRoleId: 3, requestedRoleIsSuper: false },
      { isLastActiveSuperAdmin: true },
    );
    expect(r?.code).toBe(400);
  });
  it("最后一名超管仅改密码（角色未变）→ 放行（防 B1 回归）", () => {
    const r = assertUserWriteAllowed(
      superCaller,
      { targetUserId: 1, targetRoleIsSuper: true, requestedRoleId: 1, requestedRoleIsSuper: true, resetsPassword: true },
      { isLastActiveSuperAdmin: true },
    );
    expect(r).toBeNull();
  });
  it("最后一名超管仅改昵称（未提交 roleId）→ 放行（防 B1 回归）", () => {
    const r = assertUserWriteAllowed(
      superCaller,
      { targetUserId: 1, targetRoleIsSuper: true, requestedRoleId: null, requestedRoleIsSuper: false },
      { isLastActiveSuperAdmin: true },
    );
    expect(r).toBeNull();
  });
  it("超管把超管改角色但非最后一名 → 通过（不回归）", () => {
    const r = assertUserWriteAllowed(
      superCaller,
      { targetUserId: 2, targetRoleIsSuper: true, requestedRoleId: 3, requestedRoleIsSuper: false },
      { isLastActiveSuperAdmin: false },
    );
    expect(r).toBeNull();
  });
  it("非超管创建普通用户 → 通过", () => {
    const r = assertUserWriteAllowed(
      normalCaller(["user:create"]),
      { targetUserId: 20, targetRoleIsSuper: false, requestedRoleId: 3, requestedRoleIsSuper: false },
      { isLastActiveSuperAdmin: false },
    );
    expect(r).toBeNull();
  });
});