/**
 * W0-07：tests/contract 目录占位测试 —— 验证 vitest 能收集该目录的契约测试。
 * Wave 1 各线会在此新增契约测试（如 kb-api / chat / blocks 的路由契约 harness）。
 * 这里只用 1 条最小用例证明收集链路可用，不引入任何业务断言。
 */
import { describe, expect, it } from "vitest";

describe("W0-07 tests/contract 收集冒烟", () => {
  it("vitest 已收集到 tests/contract 目录", () => {
    expect(1 + 1).toBe(2);
  });
});