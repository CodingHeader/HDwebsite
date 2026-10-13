"use client";

/**
 * SchemaForm（Q10-D8）：schema 驱动动态表单
 * 基础类型：text/textarea/number/switch/select/date；高级类型：image/upload/tags/markdown/richtext
 * 受控表单 + 必填校验（行内错误 errors[key]，aria-invalid + aria-describedby）；image 字段内置"上传→回填 URL"。
 * P05：样式迁到 mgr-* 令牌；label 与控件以 htmlFor/id 关联（可点击聚焦、读屏可读、E2E getByLabel 可定位）。
 * W0-04（ADR-028）：`FieldSpec.visibleTo === "super"` 的字段对非超管整块不渲染，且不参与必填校验。
 */
import { useId, useRef, useState } from "react";
import { toast } from "@/components/manager/feedback/toast";
import { inputCls as baseInputCls } from "@/components/manager/feedback/styles";
import { useAuthStore } from "@/store/authStore";

export type FieldType =
  | "text" | "textarea" | "number" | "switch" | "select" | "date"
  | "image" | "tags" | "markdown" | "richtext";

export type FieldSpec = {
  key: string;
  label: string;
  type?: FieldType;
  options?: { label: string; value: string | number }[];
  required?: boolean;
  placeholder?: string;
  colSpan?: 1 | 2;
  /** tags 字段提交时按逗号拆分为数组 */
  rows?: number;
  /** 可见性：`"super"` = 仅超级管理员可见/可编辑（非超管整块不渲染，ADR-028） */
  visibleTo?: "super";
};

export type FormValues = Record<string, unknown>;

/**
 * 按可见性过滤字段（ADR-028）：`visibleTo: "super"` 的字段在非超管下整块不渲染。
 * 供 SchemaForm 与调用方的校验共用（避免"隐藏字段仍触发必填错误"）。
 */
export function visibleFields(fields: FieldSpec[], isSuper: boolean): FieldSpec[] {
  return fields.filter((f) => f.visibleTo !== "super" || isSuper);
}

/** 必填校验：返回 { fieldKey: 错误文案 }，空对象表示通过（`isSuper` 默认 true，保持既有调用方行为） */
export function validateRequired(fields: FieldSpec[], values: FormValues, isSuper = true): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of visibleFields(fields, isSuper)) {
    if (!f.required) continue;
    const v = values[f.key];
    const empty =
      v === undefined || v === null || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && v.length === 0);
    if (empty) errors[f.key] = `请填写「${f.label}」`;
  }
  return errors;
}

export function SchemaForm({
  fields,
  values,
  onChange,
  errors = {},
  onFieldChange,
}: {
  fields: FieldSpec[];
  values: FormValues;
  onChange: (next: FormValues) => void;
  /** 行内错误：fieldKey → 文案 */
  errors?: Record<string, string>;
  /** 字段被修改时回调（调用方据此清除该字段错误） */
  onFieldChange?: (key: string) => void;
}) {
  const isSuper = useAuthStore((s) => s.user?.role.isSuper ?? false);
  const shown = visibleFields(fields, isSuper);
  const uid = useId();
  const set = (key: string, value: unknown) => {
    onFieldChange?.(key);
    onChange({ ...values, [key]: value });
  };
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  async function uploadImage(key: string, file: File) {
    setUploading(key);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const token = useAuthStore.getState().token;
      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const body = (await res.json()) as { code: number; data: { url: string } | null; message: string };
      if (body.code === 200 && body.data) {
        set(key, body.data.url);
        toast.success("上传成功");
      } else toast.error(body.message || "上传失败");
    } catch {
      toast.error("上传失败，请检查网络后重试");
    } finally {
      setUploading(null);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
      {shown.map((f) => {
        const type = f.type ?? "text";
        const span = f.colSpan === 2 || type === "markdown" || type === "richtext" ? "sm:col-span-2" : "sm:col-span-1";
        const id = `${uid}-${f.key}`;
        const err = errors[f.key];
        const a11y = {
          id,
          "aria-invalid": err ? true : undefined,
          "aria-describedby": err ? `${id}-err` : undefined,
          "aria-required": f.required ? true : undefined,
        } as const;
        const label = (
          <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-mgr-fg">
            {f.label}
            {f.required && <span className="ml-0.5 text-mgr-danger" aria-hidden="true">*</span>}
          </label>
        );
        const errorNode = err ? (
          <p id={`${id}-err`} role="alert" className="mt-1.5 text-[12px] text-mgr-danger">
            {err}
          </p>
        ) : null;
        const inputCls = baseInputCls;
        const areaCls = baseInputCls.replace("h-9 ", "") + " py-2 leading-5";
        if (type === "switch") {
          return (
            <div key={f.key} className={span}>
              <label htmlFor={id} className="flex h-9 cursor-pointer items-center gap-2.5 text-[13px] text-mgr-fg">
                <input
                  id={id}
                  type="checkbox"
                  role="switch"
                  className="h-4 w-4 cursor-pointer accent-[var(--mgr-primary)]"
                  checked={values[f.key] === true || values[f.key] === "true"}
                  onChange={(e) => set(f.key, e.target.checked)}
                />
                {f.label}
              </label>
            </div>
          );
        }
        return (
          <div key={f.key} className={span}>
            {label}
            {type === "textarea" && (
              <textarea
                {...a11y}
                className={areaCls}
                rows={f.rows ?? 3}
                value={String(values[f.key] ?? "")}
                placeholder={f.placeholder}
                onChange={(e) => set(f.key, e.target.value)}
              />
            )}
            {(type === "markdown" || type === "richtext") && (
              <textarea
                {...a11y}
                className={`${areaCls} font-mono`}
                rows={f.rows ?? 12}
                value={String(values[f.key] ?? "")}
                placeholder={type === "markdown" ? "支持 Markdown 语法" : "HTML 内容（保存时统一净化）"}
                onChange={(e) => set(f.key, e.target.value)}
              />
            )}
            {type === "number" && (
              <input
                {...a11y}
                type="number"
                className={inputCls}
                value={values[f.key] === null || values[f.key] === undefined ? "" : String(values[f.key])}
                placeholder={f.placeholder}
                onChange={(e) => set(f.key, e.target.value === "" ? null : Number(e.target.value))}
              />
            )}
            {type === "select" && (
              <select
                {...a11y}
                className={inputCls}
                value={values[f.key] === null || values[f.key] === undefined ? "" : String(values[f.key])}
                onChange={(e) => {
                  const raw = e.target.value;
                  const opt = f.options?.find((o) => String(o.value) === raw);
                  set(f.key, opt ? opt.value : raw);
                }}
              >
                <option value="">请选择</option>
                {f.options?.map((o) => (
                  <option key={String(o.value)} value={String(o.value)}>
                    {o.label}
                  </option>
                ))}
              </select>
            )}
            {type === "date" && (
              <input
                {...a11y}
                type="datetime-local"
                className={inputCls}
                value={values[f.key] ? String(values[f.key]).slice(0, 16) : ""}
                onChange={(e) => set(f.key, e.target.value ? new Date(e.target.value).toISOString() : null)}
              />
            )}
            {type === "image" && (
              <div className="flex items-center gap-3">
                <input
                  {...a11y}
                  className={inputCls}
                  value={String(values[f.key] ?? "")}
                  placeholder="/uploads/... 或 https://"
                  onChange={(e) => set(f.key, e.target.value)}
                />
                <button
                  type="button"
                  className="inline-flex h-9 shrink-0 items-center rounded-mgr-control border border-mgr-border bg-mgr-surface px-3 text-[13px] font-medium text-mgr-fg shadow-mgr-sm hover:bg-mgr-subtle disabled:opacity-60"
                  disabled={uploading === f.key}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading === f.key ? "上传中…" : "上传"}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadImage(f.key, file);
                    e.target.value = "";
                  }}
                />
                {typeof values[f.key] === "string" && values[f.key] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={String(values[f.key])} alt="" className="h-9 w-9 shrink-0 rounded-mgr-control border border-mgr-border object-cover" />
                ) : null}
              </div>
            )}
            {(type === "text" || type === "tags") && (
              <input
                {...a11y}
                className={inputCls}
                value={
                  type === "tags" && Array.isArray(values[f.key])
                    ? (values[f.key] as string[]).join(",")
                    : String(values[f.key] ?? "")
                }
                placeholder={f.placeholder ?? (type === "tags" ? "多个用英文逗号分隔" : "")}
                onChange={(e) => set(f.key, e.target.value)}
              />
            )}
            {errorNode}
          </div>
        );
      })}
    </div>
  );
}

/** 提交前转换：tags 逗号串 → 数组；select 空值删键（让 zod default 生效）；其余空串 → null（可空字段） */
export function normalizeFormValues(fields: FieldSpec[], values: FormValues): FormValues {
  const out: FormValues = { ...values };
  for (const f of fields) {
    const v = out[f.key];
    if ((f.type ?? "text") === "tags" && typeof v === "string") {
      out[f.key] = v.trim() ? v.split(/[,，]/).map((s) => s.trim()).filter(Boolean) : [];
    }
    if (v === "") {
      if ((f.type ?? "text") === "select") delete out[f.key];
      else out[f.key] = null;
    }
  }
  return out;
}
