/**
 * E-07 derive 派生层测试：
 * - 机制：shape 键序、枚举 options 派生、required 推断（ZodString.min → required；default → 非必填）、type 映射与 meta 覆盖
 * - 全资源防漂移（spec-drift 的派生版）：meta 键 ⊆ 契约 shape 键；手写 options 值 ∈ 契约枚举值——契约改动立即红
 */
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { deriveField, deriveFields, enumValues } from "@/components/manager/resource-meta/derive";
import type { FieldMeta } from "@/components/manager/resource-meta/derive";
import { resourceMetas } from "@/components/manager/resource-meta/specs";
import { crudPageSpecs } from "@/components/manager/crud-specs";

describe("E-07 deriveField 派生机制", () => {
  const schema = z.object({
    name: z.string().min(1),
    status: z.enum(["active", "draft"]).default("active"),
    count: z.coerce.number().int().min(0).default(0),
    on: z.boolean().default(false),
    desc: z.string().nullable().optional(),
  });

  it("ZodString.min → required；label 来自 meta", () => {
    const f = deriveField("name", schema.shape.name, { label: "名称" });
    expect(f.required).toBe(true);
    expect(f.label).toBe("名称");
    expect(f.type).toBe("text");
  });

  it("枚举 options 由契约派生（值序一致）", () => {
    const f = deriveField("status", schema.shape.status, { label: "状态" });
    expect(f.type).toBe("select");
    expect(f.options).toEqual([
      { label: "active", value: "active" },
      { label: "draft", value: "draft" },
    ]);
    expect(f.required).toBeUndefined(); // default → 非必填
  });

  it("ZodNumber → number；ZodBoolean → switch；nullable optional → 非必填", () => {
    const count = deriveField("count", schema.shape.count, { label: "数量" });
    expect(count.type).toBe("number");
    expect(count.required).toBeUndefined();
    const on = deriveField("on", schema.shape.on, { label: "开关" });
    expect(on.type).toBe("switch");
    const desc = deriveField("desc", schema.shape.desc, { label: "描述", type: "textarea" });
    expect(desc.required).toBeUndefined();
    expect(desc.type).toBe("textarea"); // meta.type 覆盖
  });

  it("meta 无 key 的 shape 键不渲染（有意省略）；顺序 = shape 键序", () => {
    const fields = deriveFields(schema, { name: { label: "名称" }, on: { label: "开关" } });
    expect(fields.map((f) => f.key)).toEqual(["name", "on"]);
  });

  it("enumValues 独立派生", () => {
    expect(enumValues(schema.shape.status)).toEqual(["active", "draft"]);
  });
});

describe("E-07 全资源防漂移（契约 → meta → spec）", () => {
  for (const [key, meta] of Object.entries(resourceMetas)) {
    it(`${key}：meta 键 ⊆ 契约 shape 键（无幽灵字段）`, () => {
      const shapeKeys = Object.keys(meta.schema.shape as Record<string, unknown>);
      const ghost = Object.keys(meta.labels).filter((k) => !shapeKeys.includes(k));
      expect(ghost, `${key} 的 meta 键不在契约 schema 中：${ghost.join(",")}`).toHaveLength(0);
    });

    it(`${key}：手写 options 值 ⊆ 契约枚举值`, () => {
      for (const [k, fm] of Object.entries(meta.labels as Record<string, FieldMeta>)) {
        const opts = "options" in fm ? (fm.options as { label: string; value: string | number }[] | undefined) : undefined;
        if (!opts) continue;
        const contractEnum = enumValues((meta.schema.shape as Record<string, z.ZodType>)[k]);
        if (contractEnum.length === 0) continue; // 非 enum 字段的手写 options（如 channel 白名单）无契约枚举可比
        const drift = opts.map((o) => String(o.value)).filter((v) => !(contractEnum as readonly string[]).includes(v));
        expect(drift, `${key}.${k} 的 options 漂移（契约枚举：${contractEnum.join("/")}）：${drift.join(",")}`).toHaveLength(0);
      }
    });

    it(`${key}：crudPageSpecs 的 fields 键 ⊆ 契约 shape 键`, () => {
      const spec = crudPageSpecs[key];
      expect(spec, `${key} spec 存在`).toBeDefined();
      const shapeKeys = Object.keys(meta.schema.shape as Record<string, unknown>);
      const specKeys = spec.fields.map((f) => f.key);
      const ghost = specKeys.filter((k) => !shapeKeys.includes(k));
      expect(ghost, `${key} 的 spec 字段不在契约 schema 中：${ghost.join(",")}`).toHaveLength(0);
    });
  }
});

describe("E-07 crud-specs 组装完整性", () => {
  it("26 个资源 spec 全部存在（22 派生 + 4 只读）", () => {
    const keys = Object.keys(crudPageSpecs);
    expect(keys.length).toBe(26);
    for (const k of ["categories", "chat-scenes", "collect-sources", "users", "logs", "collect-tasks"]) {
      expect(crudPageSpecs[k], `${k} 存在`).toBeDefined();
    }
  });

  it("关键 e2e 依赖字段保真（getByLabel 锚点）", () => {
    // a-form-errors：/manager/categories 新建 → getByLabel(/^名称/) 必填、/^Slug/ 可填
    const cat = crudPageSpecs["categories"];
    expect(cat.fields.find((f) => f.key === "name")).toMatchObject({ label: "名称", required: true });
    expect(cat.fields.find((f) => f.key === "slug")?.label).toMatch(/^Slug/);
    // collect-publish：notify-recipients 姓名/邮箱必填、通知组 tags
    const rec = crudPageSpecs["notify-recipients"];
    expect(rec.fields.find((f) => f.key === "name")).toMatchObject({ label: "姓名", required: true });
    expect(rec.fields.find((f) => f.key === "groups")?.type).toBe("tags");
    // chat-scenes 三分区（E-04）
    const cs = crudPageSpecs["chat-scenes"].fields;
    expect(cs.find((f) => f.key === "systemPrompt")?.section).toBe("基础");
    expect(cs.find((f) => f.key === "temperature")?.section).toBe("模型与参数");
    expect(cs.find((f) => f.key === "baseIds")?.section).toBe("知识库");
    // collect-sources：autoApprove visibleTo super（ADR-028）+ content-items 状态枚举对齐冻结契约
    expect(crudPageSpecs["collect-sources"].fields.find((f) => f.key === "autoApprove")?.visibleTo).toBe("super");
    const ciStatus = crudPageSpecs["content-items"].fields.find((f) => f.key === "status")?.options ?? [];
    expect(ciStatus.map((o) => String(o.value))).toEqual(["draft", "pending_review", "offline"]);
  });
});
