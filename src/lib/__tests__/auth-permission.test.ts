import { describe, expect, it } from "vitest";
import { hasPermission } from "@/lib/auth";

describe("权限匹配（原项目顺序：isSuper → 精确 → module:* → *）", () => {
  it("isSuper 全通过", () => {
    expect(hasPermission({ isSuper: true, permissions: [] }, "article:create")).toBe(true);
  });

  it("通配 *", () => {
    expect(hasPermission({ isSuper: false, permissions: ["*"] }, "article:create")).toBe(true);
  });

  it("精确匹配", () => {
    expect(
      hasPermission({ isSuper: false, permissions: ["article:create"] }, "article:create")
    ).toBe(true);
    expect(
      hasPermission({ isSuper: false, permissions: ["article:list"] }, "article:create")
    ).toBe(false);
  });

  it("模块级通配 module:*", () => {
    expect(hasPermission({ isSuper: false, permissions: ["article:*"] }, "article:delete")).toBe(
      true
    );
    expect(hasPermission({ isSuper: false, permissions: ["course:*"] }, "article:delete")).toBe(
      false
    );
  });
});
