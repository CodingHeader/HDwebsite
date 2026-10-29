"use client";

/**
 * RelationField（A-03）：远程搜索关联选择——输入关键词防抖搜索 /api/{path}，下拉点选回填。
 * 替代"limit=100 一次拉取"的旧行为（数据量增长后不可持续）。
 * - 值形态：选中行的 valueKey（默认 id）；显示 labelKey（默认 name/title）
 * - 纯客户端组件；调用方经 FieldSpec.relation 提供端点与键名
 */
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

export interface RelationConfig {
  /** 列表端点（如 /api/categories、/api/roles；响应 { data: { list } }） */
  path: string;
  /** 显示键（默认 name，回落 title/label/username） */
  labelKey?: string;
  /** 值键（默认 id） */
  valueKey?: string;
  /** 额外查询参数（如 type=image） */
  params?: string;
}

type Row = Record<string, unknown>;

function labelOf(row: Row, labelKey?: string): string {
  const keys = labelKey ? [labelKey] : ["name", "title", "label", "username"];
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "string" && v) return v;
  }
  return String(row.id ?? "");
}

function valueOf(row: Row, valueKey?: string): string {
  const k = valueKey ?? "id";
  const v = row[k];
  return v === null || v === undefined ? "" : String(v);
}

export function RelationField({
  a11y,
  config,
  value,
  onChange,
  disabled,
}: {
  /** FormField 透传的 a11y 属性（id/aria-invalid/aria-describedby） */
  a11y: Record<string, unknown>;
  config: RelationConfig;
  /** 当前值（字符串化的 valueKey） */
  value: string;
  onChange: (value: string, label: string | null) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [chosenLabel, setChosenLabel] = useState<string | null>(null);
  const token = useAuthStore((s) => s.token);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 远程搜索（防抖 300ms）
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setErr(null);
      try {
        const kw = query.trim() ? `&keyword=${encodeURIComponent(query.trim())}` : "";
        const res = await fetch(`${config.path}?page=1&limit=20${config.params ?? ""}${kw}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const body = (await res.json()) as { code?: number; message?: string; data?: { list?: Row[] } };
        if (body.code === 200) setRows(body.data?.list ?? []);
        else setErr(body.message ?? "搜索失败");
      } catch (e) {
        setErr(e instanceof Error ? e.message : "搜索失败");
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open, config.path, config.params, token]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mgr-muted-fg" aria-hidden="true" />
        <input
          {...a11y}
          role="combobox"
          aria-expanded={open}
          aria-controls="relation-field-listbox"
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled}
          value={open ? query : chosenLabel ?? value}
          placeholder="输入关键词搜索…"
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          className={cn(
            "h-11 w-full rounded-mgr-control border border-mgr-border bg-mgr-surface pl-8 pr-8 text-[13px] text-mgr-fg shadow-mgr-sm transition-colors placeholder:text-mgr-muted-fg focus:border-mgr-primary focus:outline-none focus:ring-2 focus:ring-mgr-primary/20 aria-[invalid=true]:border-mgr-danger aria-[invalid=true]:ring-mgr-danger/20 disabled:cursor-not-allowed disabled:opacity-70"
          )}
        />
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mgr-muted-fg" aria-hidden="true" />
      </div>
      {open && (
        <div
          id="relation-field-listbox"
          role="listbox"
          aria-label="搜索结果"
          className="absolute left-0 right-0 top-10 z-30 max-h-56 overflow-auto rounded-mgr-card border border-mgr-border bg-mgr-surface p-1 shadow-mgr-lg"
        >
          {loading && <p className="px-3 py-2 text-[12px] text-mgr-muted-fg">搜索中…</p>}
          {!loading && err && <p className="px-3 py-2 text-[12px] text-mgr-danger" role="alert">{err}</p>}
          {!loading && !err && rows.length === 0 && (
            <p className="px-3 py-2 text-[12px] text-mgr-muted-fg">无匹配结果</p>
          )}
          {rows.map((row) => {
            const v = valueOf(row, config.valueKey);
            const label = labelOf(row, config.labelKey);
            return (
              <button
                key={v}
                type="button"
                role="option"
                aria-selected={v === value}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setChosenLabel(label);
                  setQuery("");
                  setOpen(false);
                  onChange(v, label);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded px-3 py-1.5 text-left text-[13px] hover:bg-mgr-subtle",
                  v === value && "bg-mgr-primary-soft text-mgr-fg"
                )}
              >
                <span className="truncate">{label}</span>
                <span className="ml-2 shrink-0 font-mono text-[11px] text-mgr-muted-fg">#{v}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
