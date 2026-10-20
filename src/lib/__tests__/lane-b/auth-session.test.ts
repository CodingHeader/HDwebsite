/**
 * B-04 回归：`toSessionUser` 解析 `role.permissions` 的回落语义
 * - 独立复审 P1：B-04 首次迁移把可能为 null 的 `permissions` 传给 `sessionUserSchema.parse()`，
 *   坏 JSON 时运行时抛 ZodError（`roleSummarySchema.permissions` 是 `z.array(z.string())` 非 nullable）。
 * - 修复后必须传给 schema 的是 `safePerms`（数组，失败回落 []）。
 */
import { describe, expect, it } from "vitest";
import { toSessionUser } from "@/lib/auth";

describe("B-04 toSessionUser permissions 回落", () => {
  const baseRole = { id: 1, name: "角色", slug: "role", isSuper: false };
  const baseUser = {
    id: 1, username: "u", nickname: null, email: null, phone: null, realName: null,
    avatar: null, isActive: true, status: "active",
    passwordHash: "x", roleId: 1, lastLoginAt: null, lastLoginIp: null, loginCount: 0,
    createdAt: new Date(), updatedAt: new Date(),
  } as never;

  it("正常 JSON 数组 → 权限原样", () => {
    const s = toSessionUser(baseUser, { ...baseRole, permissions: JSON.stringify(["a", "b"]) } as never);
    expect(s.role.permissions).toEqual(["a", "b"]);
  });

  it("非法 JSON → 回落 []（不抛异常）", () => {
    const s = toSessionUser(baseUser, { ...baseRole, permissions: "{not-json" } as never);
    expect(s.role.permissions).toEqual([]);
  });

  it("null → 回落 []", () => {
    const s = toSessionUser(baseUser, { ...baseRole, permissions: null } as never);
    expect(s.role.permissions).toEqual([]);
  });

  it("非数组 JSON（如对象）→ 回落 []", () => {
    const s = toSessionUser(baseUser, { ...baseRole, permissions: JSON.stringify({ a: 1 }) } as never);
    expect(s.role.permissions).toEqual([]);
  });

  it("含非 string 元素 → 过滤保留 string", () => {
    const s = toSessionUser(baseUser, { ...baseRole, permissions: JSON.stringify(["a", 1, "b"]) } as never);
    expect(s.role.permissions).toEqual(["a", "b"]);
  });
});