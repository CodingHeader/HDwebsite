/**
 * 表单纯函数与类型（W2-04 减包：从 SchemaForm.tsx 拆出）
 *
 * 为什么单独成模块：
 *   `SchemaForm.tsx`（350+ 行组件）会静态引入 Input/Select/ImageField/MarkdownField/RelationField
 *   等一整套 UI 组件。而调用方需要用到的 `validateRequired` / `mapFieldErrors` /
 *   `normalizeFormValues` 是**零依赖纯函数**。
 *   原先它们与组件同文件 → 值导入纯函数会把整个组件模块拉进首屏 chunk
 *   （实测 articles 页最重 chunk 98,516 B gzip 就是它）。
 *   拆出后：纯函数进首屏（几 KB），组件走 next/dynamic 懒加载。
 *
 * 本文件**不得**引入任何 React 组件或 UI 依赖，只允许类型与纯函数。
 */

import { sanitizeRichContent } from "@/lib/markdown";

export type FieldType =
  | "text" | "textarea" | "number" | "switch" | "select" | "multiselect" | "date" | "datetime"
  | "image" | "tags" | "markdown" | "richtext" | "json" | "secret"
  /** A-03：远程搜索关联选择（FieldSpec.relation 提供端点；值=valueKey，显示=labelKey） */
  | "relation";

export type FormValues = Record<string, unknown>;

export type FieldSpec = {
  key: string;
  label: string;
  type?: FieldType;
  options?: { label: string; value: string | number; description?: string }[];
  required?: boolean;
  placeholder?: string;
  /** 帮助说明：告诉使用者这个字段做什么、填什么 */
  help?: string;
  colSpan?: 1 | 2;
  rows?: number;
  /** 分区名（同名字段归入一组） */
  section?: string;
  sectionDescription?: string;
  /** 收进「高级设置」折叠区 */
  advanced?: boolean;
  hidden?: (values: FormValues) => boolean;
  disabled?: boolean | ((values: FormValues) => boolean);
  /** 可见性（ADR-028/W0-04）：`"super"` = 仅超级管理员可见/可编辑（非超管整块不渲染，也不参与必填校验） */
  visibleTo?: "super";
  /** A-03：type="relation" 时的远程搜索配置（端点 + 显示/值键 + 额外参数） */
  relation?: { path: string; labelKey?: string; valueKey?: string; params?: string };
};

function isEmpty(v: unknown): boolean {
  return v === undefined || v === null || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && v.length === 0);
}

/**
 * 按可见性过滤字段（ADR-028/W0-04）：`visibleTo: "super"` 的字段在非超管下整块不渲染。
 * 供 SchemaForm 与调用方的校验共用（避免"隐藏字段仍触发必填错误"）。
 */
export function visibleFields(fields: FieldSpec[], isSuper: boolean): FieldSpec[] {
  return fields.filter((f) => f.visibleTo !== "super" || isSuper);
}

/**
 * 必填 + JSON 格式校验：返回 { fieldKey: 错误文案 }，空对象表示通过。
 * 先做 visibleTo 过滤（非超管不校验 super 字段），再做 hidden(values) 过滤。
 */
export function validateRequired(fields: FieldSpec[], values: FormValues, isSuper = true): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of visibleFields(fields, isSuper)) {
    if (f.hidden?.(values)) continue;
    const v = values[f.key];
    if (f.required && isEmpty(v)) {
      errors[f.key] = `请填写「${f.label.replace(/（.*?）/g, "")}」`;
      continue;
    }
    if (f.type === "json" && typeof v === "string" && v.trim()) {
      try {
        JSON.parse(v);
      } catch {
        errors[f.key] = "JSON 格式不正确，请检查括号与引号";
      }
    }
  }
  return errors;
}

/** 后端 400 的 data.fieldErrors（{ "a.b": "说明" }）→ 表单字段错误（按顶层键归并） */
export function mapFieldErrors(err: unknown): Record<string, string> {
  const raw = (err as { fieldErrors?: Record<string, string> } | null)?.fieldErrors;
  if (!raw) return {};
  const out: Record<string, string> = {};
  for (const [path, msg] of Object.entries(raw)) {
    const key = path.split(".")[0] || path;
    if (!out[key]) out[key] = msg;
  }
  return out;
}

/**
 * 提交前转换：tags 逗号串 → 数组；select 空值删键（让 zod default 生效）；richtext 净化；
 * W0-04（ADR-028）visibleTo="super" 且非超管的字段不提交；隐藏字段不提交；其余空串 → null。
 *
 * @param sanitize 可注入的富文本净化器。**默认使用内置 sanitizeRichContent**，
 *   即与拆分前行为完全一致（richtext 提交前必定净化）。
 *   独立复核曾指出：拆分后若默认不净化，6 个调用方会静默丢掉这一层纵深防御——
 *   故此处保持默认净化；xss-filter 是零第三方依赖的自研实现（gzip ≈3.6 KB），
 *   引入代价远小于「静默削弱安全层」。传 `() => html` 可显式关闭（仅测试用）。
 */
export function normalizeFormValues(
  fields: FieldSpec[],
  values: FormValues,
  isSuper = true,
  sanitize: (html: string) => string = sanitizeRichContent
): FormValues {
  const out: FormValues = { ...values };
  for (const f of visibleFields(fields, isSuper)) {
    const type = f.type ?? "text";
    if (f.hidden?.(values)) {
      delete out[f.key];
      continue;
    }
    const v = out[f.key];
    if (type === "tags" && typeof v === "string") {
      out[f.key] = v.trim() ? v.split(/[,，]/).map((s) => s.trim()).filter(Boolean) : [];
    }
    if (type === "richtext" && typeof v === "string" && v) {
      out[f.key] = sanitize(v);
    }
    if (v === "") {
      if (type === "select") delete out[f.key];
      else out[f.key] = null;
    }
  }
  return out;
}
