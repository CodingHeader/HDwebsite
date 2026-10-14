"use client";

/**
 * SchemaForm / ResourceForm（P07，Q10-D8）：字段规格驱动的标准表单。
 * - 字段类型：text/textarea/number/switch/select/multiselect/date(datetime)/image/tags/markdown/richtext/json/secret
 * - 每个字段：标签 + 必填标记 + 帮助说明（help）+ 字段级错误（前端必填校验 & 后端 400 data.fieldErrors 逐项映射）
 * - 分区：section 相同的字段归入同一分区（分区标题 + 说明）；advanced=true 的字段收进可折叠的「高级设置」
 * - 条件显示/只读：hidden(values) / disabled(values)
 * - richtext 提交前统一 sanitizeRichContent；json 提交前校验格式
 */
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { FormField } from "@/components/manager/ui/form-field";
import { Input, Select, Switch, Textarea, Checkbox } from "@/components/manager/ui/input";
import { SectionTitle } from "@/components/manager/ui/misc";
import { ImageField } from "@/components/manager/fields/ImageField";
import { MarkdownField } from "@/components/manager/fields/MarkdownField";
import { RichTextField } from "@/components/manager/fields/RichTextField";
import { sanitizeRichContent } from "@/lib/markdown";
import { cn } from "@/lib/utils";

export type FieldType =
  | "text" | "textarea" | "number" | "switch" | "select" | "multiselect" | "date" | "datetime"
  | "image" | "tags" | "markdown" | "richtext" | "json" | "secret";

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
};

export type FormValues = Record<string, unknown>;

function isEmpty(v: unknown) {
  return v === undefined || v === null || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && v.length === 0);
}

/** 必填 + JSON 格式校验：返回 { fieldKey: 错误文案 }，空对象表示通过 */
export function validateRequired(fields: FieldSpec[], values: FormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of fields) {
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
  errors?: Record<string, string>;
  onFieldChange?: (key: string) => void;
}) {
  const [advancedOpen, setAdvancedOpen] = useState(() => fields.some((f) => f.advanced && errors[f.key]));
  const set = (key: string, value: unknown) => {
    onFieldChange?.(key);
    onChange({ ...values, [key]: value });
  };
  const visible = fields.filter((f) => !f.hidden?.(values));
  const main = visible.filter((f) => !f.advanced);
  const advanced = visible.filter((f) => f.advanced);
  const advancedHasError = advanced.some((f) => errors[f.key]);

  function renderGroup(list: FieldSpec[]) {
    const out: React.ReactNode[] = [];
    let lastSection: string | undefined;
    for (const f of list) {
      if (f.section && f.section !== lastSection) {
        out.push(<SectionTitle key={`s-${f.section}`} title={f.section} description={f.sectionDescription} />);
      }
      lastSection = f.section ?? lastSection;
      out.push(<Field key={f.key} f={f} values={values} set={set} error={errors[f.key]} />);
    }
    return out;
  }

  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2" data-testid="schema-form">
      {renderGroup(main)}
      {advanced.length > 0 && (
        <div className="sm:col-span-2">
          <button
            type="button"
            aria-expanded={advancedOpen || advancedHasError}
            onClick={() => setAdvancedOpen((v) => !v)}
            className="flex w-full items-center gap-1.5 border-t border-mgr-border pt-4 text-left text-[13px] font-semibold text-mgr-fg"
          >
            <ChevronRight className={cn("h-4 w-4 transition-transform", (advancedOpen || advancedHasError) && "rotate-90")} aria-hidden="true" />
            高级设置
            <span className="font-normal text-mgr-muted-fg">（{advanced.length} 项，一般无需修改）</span>
          </button>
          {(advancedOpen || advancedHasError) && <div className="mt-5 grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">{renderGroup(advanced)}</div>}
        </div>
      )}
    </div>
  );
}

function Field({ f, values, set, error }: { f: FieldSpec; values: FormValues; set: (k: string, v: unknown) => void; error?: string }) {
  const type = f.type ?? "text";
  const wide = f.colSpan === 2 || ["markdown", "richtext", "json", "multiselect"].includes(type);
  const span = wide ? "sm:col-span-2" : "sm:col-span-1";
  const disabled = typeof f.disabled === "function" ? f.disabled(values) : !!f.disabled;
  const raw = values[f.key];
  const str = raw === null || raw === undefined ? "" : String(raw);

  if (type === "switch") {
    return (
      <FormField className={span} label={f.label} help={f.help} error={error} inline>
        {(a) => <Switch {...a} checked={raw === true || raw === "true"} disabled={disabled} onCheckedChange={(v) => set(f.key, v)} />}
      </FormField>
    );
  }

  if (type === "multiselect") {
    const selected: string[] = Array.isArray(raw) ? (raw as unknown[]).map(String) : typeof raw === "string" && raw ? raw.split(/[,，]/).map((s) => s.trim()) : [];
    return (
      <fieldset className={span} aria-describedby={f.help ? `${f.key}-help` : undefined}>
        <legend className="mb-1.5 text-[13px] font-medium text-mgr-fg">
          {f.label}
          {f.required && <span className="ml-0.5 text-mgr-danger" aria-hidden="true">*</span>}
        </legend>
        <div className="flex flex-wrap gap-2">
          {(f.options ?? []).map((o) => {
            const v = String(o.value);
            const on = selected.includes(v);
            return (
              <label
                key={v}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-mgr-control border px-3 py-1.5 text-[13px] transition-colors",
                  on ? "border-mgr-primary bg-mgr-primary-soft text-mgr-fg" : "border-mgr-border bg-mgr-surface text-mgr-fg hover:bg-mgr-subtle",
                  disabled && "cursor-not-allowed opacity-60"
                )}
                title={o.description}
              >
                <Checkbox
                  checked={on}
                  disabled={disabled}
                  onChange={(e) => set(f.key, e.target.checked ? [...selected, v] : selected.filter((s) => s !== v))}
                />
                {o.label}
              </label>
            );
          })}
          {(f.options ?? []).length === 0 && <span className="text-[13px] text-mgr-muted-fg">暂无可选项</span>}
        </div>
        {f.help && <p id={`${f.key}-help`} className="mt-1.5 text-[12px] text-mgr-muted-fg">{f.help}</p>}
        {error && <p role="alert" className="mt-1.5 text-[12px] text-mgr-danger" data-testid="field-error">{error}</p>}
      </fieldset>
    );
  }

  return (
    <FormField className={span} label={f.label} required={f.required} help={f.help} error={error}>
      {(a) => {
        switch (type) {
          case "textarea":
          case "json":
            return (
              <Textarea
                {...a}
                rows={f.rows ?? (type === "json" ? 6 : 3)}
                value={str}
                disabled={disabled}
                placeholder={f.placeholder ?? (type === "json" ? '{ "key": "value" }' : undefined)}
                className={type === "json" ? "font-mono text-[12px]" : undefined}
                onChange={(e) => set(f.key, e.target.value)}
              />
            );
          case "markdown":
            return <MarkdownField a11y={a} value={str} rows={f.rows} placeholder={f.placeholder} onChange={(v) => set(f.key, v)} />;
          case "richtext":
            return (
              <RichTextField
                id={a.id}
                value={str}
                invalid={!!a["aria-invalid"]}
                describedBy={a["aria-describedby"]}
                placeholder={f.placeholder}
                onChange={(v) => set(f.key, v)}
              />
            );
          case "number":
            return (
              <Input
                {...a}
                type="number"
                inputMode="decimal"
                value={str}
                disabled={disabled}
                placeholder={f.placeholder}
                onChange={(e) => set(f.key, e.target.value === "" ? null : Number(e.target.value))}
              />
            );
          case "select":
            return (
              <Select
                {...a}
                value={str}
                disabled={disabled}
                placeholder={f.placeholder ?? "请选择"}
                options={f.options ?? []}
                onChange={(e) => {
                  const opt = f.options?.find((o) => String(o.value) === e.target.value);
                  set(f.key, opt ? opt.value : e.target.value);
                }}
              />
            );
          case "date":
          case "datetime":
            return (
              <Input
                {...a}
                type="datetime-local"
                disabled={disabled}
                value={raw ? toLocalInput(String(raw)) : ""}
                onChange={(e) => set(f.key, e.target.value ? new Date(e.target.value).toISOString() : null)}
              />
            );
          case "image":
            return <ImageField a11y={a} value={str} placeholder={f.placeholder} onChange={(v) => set(f.key, v)} />;
          case "secret":
            return (
              <Input
                {...a}
                type="password"
                autoComplete="new-password"
                value={str}
                disabled={disabled}
                placeholder={f.placeholder ?? "已设置则显示脱敏值；输入新值即替换"}
                onChange={(e) => set(f.key, e.target.value)}
              />
            );
          default:
            return (
              <Input
                {...a}
                value={type === "tags" && Array.isArray(raw) ? (raw as string[]).join(",") : str}
                disabled={disabled}
                placeholder={f.placeholder ?? (type === "tags" ? "多个用逗号分隔" : "")}
                onChange={(e) => set(f.key, e.target.value)}
              />
            );
        }
      }}
    </FormField>
  );
}

/** ISO → datetime-local（本地时区） */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 提交前转换：tags 逗号串 → 数组；select 空值删键（让 zod default 生效）；richtext 净化；隐藏字段不提交；其余空串 → null */
export function normalizeFormValues(fields: FieldSpec[], values: FormValues): FormValues {
  const out: FormValues = { ...values };
  for (const f of fields) {
    const type = f.type ?? "text";
    if (f.hidden?.(values)) {
      delete out[f.key];
      continue;
    }
    const v = out[f.key];
    if (type === "tags" && typeof v === "string") {
      out[f.key] = v.trim() ? v.split(/[,，]/).map((s) => s.trim()).filter(Boolean) : [];
    }
    if (type === "richtext" && typeof v === "string" && v) out[f.key] = sanitizeRichContent(v);
    if (v === "") {
      if (type === "select") delete out[f.key];
      else out[f.key] = null;
    }
  }
  return out;
}

/** ResourceForm = SchemaForm（P07 命名；保留旧名向后兼容） */
export const ResourceForm = SchemaForm;
