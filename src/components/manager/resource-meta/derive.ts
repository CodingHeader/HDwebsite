/**
 * E-07：管理端规格从契约派生（P08 目标 1）
 * - 字段键 = zod schema `.shape` 键；枚举 options = ZodEnum `.options`——手写只剩 label、控件提示与特殊行为
 * - zod 4 元数据不足处（控件类型/文案）用并列 meta 覆盖（升级条件口径），不回手写字段键
 * - spec-drift（E-01）继续为绿：派生层是契约与 UI 的唯一通道，天然不漂移
 */
import { z } from "zod";
import type { FieldSpec, FieldType } from "@/components/manager/SchemaForm";

/** 每个字段的手写 meta（label 必填；其余可省略由派生决定） */
export type FieldMeta = {
  label: string;
  /** 覆盖派生控件类型（image/json/richtext/secret/relation 等无 zod 语义） */
  type?: FieldType;
  options?: { label: string; value: string | number }[];
  required?: boolean;
  placeholder?: string;
  help?: string;
  colSpan?: 1 | 2;
  rows?: number;
  section?: string;
  advanced?: boolean;
  visibleTo?: "super";
  hidden?: (values: Record<string, unknown>) => boolean;
};

type AnySchema = z.ZodType;

/** 循环剥开 ZodOptional/ZodNullable/ZodDefault，返回核心类型并标记可空 */
function unwrap(t: AnySchema): { core: AnySchema; nullable: boolean } {
  let core = t as AnySchema;
  let nullable = false;
  for (let i = 0; i < 6; i++) {
    if (core instanceof z.ZodNullable) {
      nullable = true;
      core = core.unwrap() as AnySchema;
    } else if (core instanceof z.ZodOptional) {
      core = core.unwrap() as AnySchema;
    } else if (core instanceof z.ZodDefault) {
      core = core.def.innerType as unknown as AnySchema;
    } else break;
  }
  return { core, nullable };
}

/** 枚举 options：ZodEnum 值 + label 映射（缺省用值本身） */
function enumOptions(core: AnySchema, labels?: Record<string, string>): { label: string; value: string }[] | undefined {
  const values = (core as { options?: readonly string[] }).options;
  if (!Array.isArray(values)) return undefined;
  return values.map((v) => ({ label: labels?.[v] ?? v, value: v }));
}

/** 单字段派生：type 映射（number/boolean/enum→select/string→text）+ meta 覆盖 */
export function deriveField(key: string, t: AnySchema, meta: FieldMeta): FieldSpec {
  const { core, nullable } = unwrap(t);
  let derived: FieldType = "text";
  let options = meta.options;
  if (!options && core instanceof z.ZodEnum) {
    options = enumOptions(core);
  }
  if (core instanceof z.ZodNumber) derived = "number";
  else if (core instanceof z.ZodBoolean) derived = "switch";
  else if (options) derived = meta.type ?? "select";
  else if (core instanceof z.ZodString) derived = meta.type ?? "text";
  // meta.type 优先（image/json/richtext/textarea/tags 等特殊控件）
  const type = meta.type ?? derived;
  const spec: FieldSpec = { key, label: meta.label, type };
  if (options) spec.options = options;
  // required：字段在 schema 中非 optional（unwrap 后仍必有值——ZodString/ZodNumber/ZodBoolean/enum 本体）
  const isOptional = t instanceof z.ZodOptional || t instanceof z.ZodDefault || t instanceof z.ZodNullable;
  if (meta.required ?? (!isOptional && !nullable)) spec.required = true;
  for (const k of ["placeholder", "help", "colSpan", "rows", "section", "advanced", "visibleTo", "hidden"] as const) {
    if (meta[k] !== undefined) (spec as Record<string, unknown>)[k] = meta[k];
  }
  return spec;
}

/**
 * 从 schema 派生全部字段（shape 键序 = 派生序；meta 缺键 = 该键隐藏，不渲染）
 * @param schema   冻结契约的 Create/Update schema（z.object）
 * @param metas    key → 手写 meta（label 等）
 */
export function deriveFields(schema: z.ZodObject, metas: Record<string, FieldMeta>): FieldSpec[] {
  const out: FieldSpec[] = [];
  for (const [key, t] of Object.entries(schema.shape as Record<string, AnySchema>)) {
    const meta = metas[key];
    if (!meta) continue; // 无 meta = 有意省略（如 id/createdAt/slug 自动生成）
    out.push(deriveField(key, t, meta));
  }
  return out;
}

/** 枚举独立派生（状态列渲染/自定义页复用） */
export function enumValues(core: AnySchema): readonly string[] {
  return (unwrap(core).core as { options?: readonly string[] }).options ?? [];
}
