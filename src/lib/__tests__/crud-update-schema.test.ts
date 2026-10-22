/**
 * F-01 回归测试：crudUpdate 必须支持「createSchema 含 refine」的资源
 *
 * 缺陷背景（W2-02 终审发现，本轮修复）：
 *   zod v4 的 `.partial()` 不能用于含 refine/transform 的 object schema，直接抛
 *     Error: .partial() cannot be used on object schemas containing refinements
 *   而 crudUpdate 原先写死 `spec.createSchema!.partial()`，导致
 *   `PUT /api/publish-jobs/:id` 无论传什么 body 都返回 500「更新发布任务失败」。
 *
 * 【独立复核意见已采纳】本测试直接 import 真实的 `resolveUpdateSchema`（已对外导出），
 * 不再是「复制一份同构实现」的自指测试——否则 crud.ts 里函数被改坏、被改回 `.partial()`，
 * 这些用例一条都不会红。
 */
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { resolveUpdateSchema } from "@/lib/crud";
import { publishJobCreateSchema } from "@/contracts/resources";
import type { CrudSpec } from "@/lib/crud";

function specWith(createSchema: z.ZodObject<z.ZodRawShape>): CrudSpec {
  return {
    model: "publishJob",
    permission: "publish",
    label: "发布任务",
    searchFields: [],
    createSchema,
  };
}

describe("F-01 · resolveUpdateSchema（测真实实现）", () => {
  it("前提：publishJobCreateSchema 确实含 refine，且直接 .partial() 会抛错", () => {
    // 若 zod 未来放宽该限制，这里先失败提醒复核
    expect(() => publishJobCreateSchema.partial()).toThrow(/refinements/i);
  });

  it("对含 refine 的 schema 不抛错，且接受部分更新", () => {
    const schema = resolveUpdateSchema(specWith(publishJobCreateSchema));

    // 只改通知开关：channels/channel 都没传 —— 旧实现必 500 的典型请求
    expect(schema.safeParse({ preNotify: false }).success).toBe(true);
    // 只改执行动作
    expect(schema.safeParse({ action: "publish" }).success).toBe(true);
    // 空对象也应合法（PUT 语义允许不带任何字段）
    expect(schema.safeParse({}).success).toBe(true);
  });

  it("字段级约束仍然生效（不是无脑放过）", () => {
    const schema = resolveUpdateSchema(specWith(publishJobCreateSchema));

    expect(schema.safeParse({ action: "bad" }).success).toBe(false);
    expect(schema.safeParse({ contentType: "nope" }).success).toBe(false);
    expect(schema.safeParse({ scheduledAt: "not-a-date" }).success).toBe(false);
  });

  it("显式给了 updateSchema 时优先使用它（不走 shape 重建）", () => {
    const custom = z.object({ only: z.string() });
    const schema = resolveUpdateSchema({
      ...specWith(publishJobCreateSchema),
      updateSchema: custom,
    });
    expect(schema.safeParse({ only: "x" }).success).toBe(true);
    // custom 里没有 action，故不应被接受（证明确实用了 custom 而非重建）
    expect(schema.safeParse({ action: "publish" }).success).toBe(false);
  });

  it("普通（无 refine）schema 仍走原生 .partial()，保持原语义", () => {
    const plain = z.object({ a: z.string(), b: z.number().default(1) });
    const schema = resolveUpdateSchema(specWith(plain));
    expect(schema.safeParse({ a: "x" }).success).toBe(true);
    expect(schema.safeParse({ a: 1 }).success).toBe(false);
  });
});
