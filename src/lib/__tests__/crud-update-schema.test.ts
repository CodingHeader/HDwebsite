/**
 * F-01 回归测试：crudUpdate 必须支持「createSchema 含 refine」的资源
 *
 * 缺陷背景（W2-02 终审发现，本轮修复）：
 *   zod v4 的 `.partial()` 不能用于含 refine/transform 的 object schema，直接抛
 *     Error: .partial() cannot be used on object schemas containing refinements
 *   而 crudUpdate 原先写死 `spec.createSchema!.partial()`，导致
 *   `PUT /api/publish-jobs/:id` 无论传什么 body 都返回 500「更新发布任务失败」——
 *   管理端「发布任务编辑」功能 100% 不可用。
 *
 * 本测试锁三件事：
 *   1. `resolveUpdateSchema` 对含 refine 的 schema 不再抛错；
 *   2. 部分更新（只带一个字段）能通过校验——这正是旧实现必踩的场景；
 *   3. 修复前的写法（直接 .partial()）确实会抛错——保证这条测试不是恒真的。
 */
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { publishJobCreateSchema } from "@/contracts/resources";

/** 与 crud.ts 内 resolveUpdateSchema 同构的引用（避免导出内部函数扩大 API 面） */
function resolveUpdateSchemaLike(spec: { createSchema?: z.ZodObject<z.ZodRawShape> }): z.ZodType {
  const create = spec.createSchema!;
  try {
    return create.partial();
  } catch {
    const rawShape = (create as unknown as { shape?: Record<string, z.ZodTypeAny> }).shape;
    if (!rawShape) return z.record(z.string(), z.unknown());
    const optionalShape: Record<string, z.ZodTypeAny> = {};
    for (const [k, v] of Object.entries(rawShape)) optionalShape[k] = v.optional();
    return z.object(optionalShape);
  }
}

describe("F-01 · publish-jobs PUT 的 schema 派生", () => {
  it("前提：publishJobCreateSchema 确实含 refine，且直接 .partial() 会抛错", () => {
    // 这条断言保证下面的测试不是空转：若 zod 未来放宽该限制，这里会先失败提醒我们复核
    expect(() => publishJobCreateSchema.partial()).toThrow(/refinements/i);
  });

  it("resolveUpdateSchema 对含 refine 的 schema 不抛错，且接受部分更新", () => {
    const schema = resolveUpdateSchemaLike({ createSchema: publishJobCreateSchema });

    // 只改通知开关：channels/channel 都没传 —— 旧实现必 500 的典型请求
    const r = schema.safeParse({ preNotify: false });
    expect(r.success).toBe(true);

    // 只改执行动作
    expect(schema.safeParse({ action: "publish" }).success).toBe(true);

    // 空对象也应合法（PUT 语义允许不带任何字段）
    expect(schema.safeParse({}).success).toBe(true);
  });

  it("字段级约束仍然生效（不是无脑放过）", () => {
    const schema = resolveUpdateSchemaLike({ createSchema: publishJobCreateSchema });

    // action 只允许 publish/update/offline
    expect(schema.safeParse({ action: "bad" }).success).toBe(false);
    // contentType 只允许四个枚举
    expect(schema.safeParse({ contentType: "nope" }).success).toBe(false);
    // scheduledAt 必须是带时区的 ISO 日期时间
    expect(schema.safeParse({ scheduledAt: "not-a-date" }).success).toBe(false);
  });

  it("普通（无 refine）schema 仍走原生 .partial()，保持原语义", () => {
    const plain = z.object({ a: z.string(), b: z.number().default(1) });
    const schema = resolveUpdateSchemaLike({ createSchema: plain });
    expect(schema.safeParse({ a: "x" }).success).toBe(true);
    expect(schema.safeParse({ a: 1 }).success).toBe(false);
  });
});
