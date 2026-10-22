"use client";

/**
 * SchemaForm / ResourceForm（Q10-D8；P07 组件化重写 + W0-04 visibleTo 安全过滤融合）：
 * - 字段类型：text/textarea/number/switch/select/multiselect/date(datetime)/image/tags/markdown/richtext/json/secret
 * - 每个字段：标签 + 必填标记 + 帮助说明（help）+ 字段级错误（前端必填校验 & 后端 400 data.fieldErrors 逐项映射）
 * - 分区：section 相同的字段归入同一分区（分区标题 + 说明）；advanced=true 的字段收进可折叠的「高级设置」
 * - 条件显示/只读：hidden(values) / disabled(values)
 * - richtext 提交前统一 sanitizeRichContent；json 提交前校验格式
 * - W0-04（ADR-028）：`FieldSpec.visibleTo === "super"` 的字段对非超管整块不渲染，且不参与必填校验
 */
import { useState } from "react";
import dynamic from "next/dynamic";
import { ChevronRight } from "lucide-react";
import { FormField } from "@/components/manager/ui/form-field";
import { Input, Select, Switch, Textarea, Checkbox, DateTimeInput } from "@/components/manager/ui/input";
import { SectionTitle } from "@/components/manager/ui/misc";
import { ImageField } from "@/components/manager/fields/ImageField";
import { MarkdownField } from "@/components/manager/fields/MarkdownField";
import { RelationField } from "@/components/manager/fields/RelationField";
import { Skeleton } from "@/components/manager/ui/misc";
// A-05：RichTextField（TipTap 编辑器）经 next/dynamic 懒加载——/manager 首屏包体不因 TipTap 增长
const RichTextField = dynamic(() => import("@/components/manager/fields/RichTextField").then((m) => m.RichTextField), {
  ssr: false,
  loading: () => <Skeleton className="h-[240px]" />,
});
import { sanitizeRichContent } from "@/lib/markdown";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

// W2-04 减包：类型与纯函数已拆到 ./form-utils（零 UI 依赖），此处重新导出保持既有 import 路径可用。
// 调用方 `import { validateRequired } from "@/components/manager/SchemaForm"` 仍有效，
// 但只有真正需要 <SchemaForm> 组件时才会加载本文件（含一整套 UI 字段组件）。
import {
  visibleFields,
  validateRequired,
  mapFieldErrors,
  normalizeFormValues as normalizeFormValuesBase,
  type FieldSpec,
  type FormValues,
} from "./form-utils";

export type { FieldType, FieldSpec, FormValues } from "./form-utils";
export { visibleFields, validateRequired, mapFieldErrors } from "./form-utils";

// 组件内部还需要用到这几个符号的本地绑定（导出与本地使用分开写，避免 TS 同名冲突）
void visibleFields;
void validateRequired;
void mapFieldErrors;

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
  // W0-04（ADR-028）：visibleTo="super" 的字段对非超管整块不渲染
  const isSuper = useAuthStore((s) => s.user?.role.isSuper ?? false);
  const shown = visibleFields(fields, isSuper);
  const [advancedOpen, setAdvancedOpen] = useState(() => shown.some((f) => f.advanced && errors[f.key]));
  const set = (key: string, value: unknown) => {
    onFieldChange?.(key);
    onChange({ ...values, [key]: value });
  };
  const visible = shown.filter((f) => !f.hidden?.(values));
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
  }  return (
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
              <DateTimeInput
                {...a}
                disabled={disabled}
                value={raw ? toLocalInput(String(raw)) : ""}
                onChange={(e) => set(f.key, e.target.value ? new Date(e.target.value).toISOString() : null)}
              />
            );
          case "relation":
            return f.relation ? (
              <RelationField
                a11y={a}
                config={f.relation}
                value={str}
                disabled={disabled}
                onChange={(v) => set(f.key, v === "" ? null : v)}
              />
            ) : (
              <Input {...a} value={str} disabled={disabled} onChange={(e) => set(f.key, e.target.value)} />
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

// normalizeFormValues 已由 ./form-utils 提供。这里保留一个「带净化器」的默认包装：
// 调用方直接 import 本文件的 normalizeFormValues 时，richtext 仍会走 sanitizeRichContent 净化，
// 与拆分前行为一致；而只想做无副作用归一的调用方可改从 ./form-utils 引入。
function normalizeFormValuesWithSanitize(fields: FieldSpec[], values: FormValues, isSuper = true): FormValues {
  return normalizeFormValuesBase(fields, values, isSuper, sanitizeRichContent);
}

export { normalizeFormValuesWithSanitize as normalizeFormValues };

/** ResourceForm = SchemaForm（P07 命名；保留旧名向后兼容） */
export const ResourceForm = SchemaForm;