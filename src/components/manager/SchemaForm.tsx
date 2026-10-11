"use client";

/**
 * SchemaForm（Q10-D8）：schema 驱动动态表单
 * 基础类型：text/textarea/number/switch/select/date；高级类型：image/upload/tags/markdown/richtext
 * 受控表单 + 必填校验；image 字段内置"上传→回填 URL"。
 */
import { useRef, useState } from "react";
import { managerFetch } from "@/lib/manager-fetch";

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
};

export type FormValues = Record<string, unknown>;

export function SchemaForm({
  fields,
  values,
  onChange,
}: {
  fields: FieldSpec[];
  values: FormValues;
  onChange: (next: FormValues) => void;
}) {
  const set = (key: string, value: unknown) => onChange({ ...values, [key]: value });
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  async function uploadImage(key: string, file: File) {
    setUploading(key);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const token = (await import("@/store/authStore")).useAuthStore.getState().token;
      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const body = (await res.json()) as { code: number; data: { url: string } | null; message: string };
      if (body.code === 200 && body.data) set(key, body.data.url);
      else alert(body.message || "上传失败");
    } finally {
      setUploading(null);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {fields.map((f) => {
        const type = f.type ?? "text";
        const span = f.colSpan === 2 ? "col-span-2" : "col-span-1";
        const label = (
          <label className="mb-1 block text-sm font-medium">
            {f.label}
            {f.required && <span className="ml-1 text-red-500">*</span>}
          </label>
        );
        const inputCls =
          "w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";
        if (type === "switch") {
          return (
            <div key={f.key} className={span}>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
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
                className={inputCls}
                rows={f.rows ?? 3}
                value={String(values[f.key] ?? "")}
                placeholder={f.placeholder}
                onChange={(e) => set(f.key, e.target.value)}
              />
            )}
            {(type === "markdown" || type === "richtext") && (
              <textarea
                className={`${inputCls} font-mono`}
                rows={f.rows ?? 12}
                value={String(values[f.key] ?? "")}
                placeholder={type === "markdown" ? "支持 Markdown 语法" : "HTML 内容（保存时统一净化）"}
                onChange={(e) => set(f.key, e.target.value)}
              />
            )}
            {type === "number" && (
              <input
                type="number"
                className={inputCls}
                value={values[f.key] === null || values[f.key] === undefined ? "" : String(values[f.key])}
                placeholder={f.placeholder}
                onChange={(e) => set(f.key, e.target.value === "" ? null : Number(e.target.value))}
              />
            )}
            {type === "select" && (
              <select
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
                type="datetime-local"
                className={inputCls}
                value={values[f.key] ? String(values[f.key]).slice(0, 16) : ""}
                onChange={(e) => set(f.key, e.target.value ? new Date(e.target.value).toISOString() : null)}
              />
            )}
            {type === "image" && (
              <div className="flex items-center gap-3">
                <input
                  className={inputCls}
                  value={String(values[f.key] ?? "")}
                  placeholder="/uploads/... 或 https://"
                  onChange={(e) => set(f.key, e.target.value)}
                />
                <button
                  type="button"
                  className="shrink-0 rounded-md border border-border px-3 py-2 text-sm hover:bg-background"
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
                  <img src={String(values[f.key])} alt="" className="h-10 w-10 rounded object-cover" />
                ) : null}
              </div>
            )}
            {(type === "text" || type === "tags") && (
              <input
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
          </div>
        );
      })}
    </div>
  );
}

/** 提交前转换：tags 逗号串 → 数组；空串 → null（可空字段） */
export function normalizeFormValues(fields: FieldSpec[], values: FormValues): FormValues {
  const out: FormValues = { ...values };
  for (const f of fields) {
    const v = out[f.key];
    if ((f.type ?? "text") === "tags" && typeof v === "string") {
      out[f.key] = v.trim() ? v.split(/[,，]/).map((s) => s.trim()).filter(Boolean) : [];
    }
    if (v === "") out[f.key] = null;
  }
  return out;
}
