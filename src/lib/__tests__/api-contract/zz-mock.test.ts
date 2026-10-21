import { describe, it, expect } from "vitest";
import { z } from "zod";
import { contentItemCreateSchema } from "@/contracts/resources";

/**
 * 临时探针（保留但不再影响门禁）：验证 zod4 的枚举字段可被逐字段 safeParse。
 * 用途：为 rules.ts 的 mockBody2「字段级独立判定」提供实现依据。
 * 说明：不使用 any——改用 unknown 收窄，避免 @typescript-eslint/no-explicit-any 破坏 lint 门禁。
 */
const enumSchema = z.enum(["draft", "pending_review", "offline"]);
const statusField: unknown = contentItemCreateSchema.shape.status;

type ZodLike = { safeParse: (v: unknown) => { success: boolean } };

describe("zod 内省（W2-02 规则表推导依据）", () => {
  it("枚举字段可单独 safeParse，可用于逐字段构造合法值", () => {
    expect(enumSchema.safeParse("draft").success).toBe(true);
    expect(enumSchema.safeParse("bad").success).toBe(false);
    expect(typeof (statusField as ZodLike).safeParse).toBe("function");
  });
});
