"use client";

/**
 * CrudPage（R2/Q10-D6）：schema 驱动的通用管理页
 * 列表（搜索/分页）+ 新建/编辑弹窗（SchemaForm）+ 删除确认 + 可选只读模式
 */
import { useCallback, useEffect, useState } from "react";
import { managerFetch } from "@/lib/manager-fetch";
import { SchemaForm, normalizeFormValues } from "@/components/manager/SchemaForm";
import type { FieldSpec, FormValues } from "@/components/manager/SchemaForm";

export type ColumnSpec = {
  key: string;
  label: string;
  /** 简单渲染：image 缩略图 / boolean 是否 / 截断文本 */
  render?: "image" | "boolean" | "text";
  width?: string;
};

export type CrudPageSpec = {
  title: string;
  endpoint: string;
  columns: ColumnSpec[];
  fields: FieldSpec[];
  /** 关联下拉数据源：fieldKey → { endpoint, labelKey }，新建/编辑时拉取选项 */
  relations?: Record<string, { endpoint: string; labelKey: string }>;
  readOnly?: boolean;
  searchPlaceholder?: string;
  /** 额外的行操作按钮（特殊页扩展） */
  rowActions?: RowAction[];
};

export type RowAction = {
  label: string;
  danger?: boolean;
  /** 返回确认文案；返回 null 则不弹确认 */
  confirm?: (row: Record<string, unknown>) => string | null;
  run: (row: Record<string, unknown>, reload: () => void, fail: (msg: string) => void) => Promise<void>;
};

type ListData = { list: Record<string, unknown>[]; pagination: { page: number; limit: number; total: number; totalPages: number } };

export function CrudPage({ spec }: { spec: CrudPageSpec }) {
  const [data, setData] = useState<ListData | null>(null);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<FormValues | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [relationOptions, setRelationOptions] = useState<Record<string, { label: string; value: string }[]>>({});

  const load = useCallback(async () => {
    setError("");
    try {
      const kw = keyword ? `&keyword=${encodeURIComponent(keyword)}` : "";
      const res = await managerFetch<ListData>(`/api/${spec.endpoint}?page=${page}&limit=10${kw}`);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    }
  }, [page, keyword, spec.endpoint]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
    })();
    return () => {
      cancelled = true;
      void cancelled;
    };
  }, [load]);

  async function loadRelations() {
    if (!spec.relations) return;
    const next: Record<string, { label: string; value: string }[]> = {};
    for (const [key, rel] of Object.entries(spec.relations)) {
      try {
        const res = await managerFetch<ListData>(`/api/${rel.endpoint}?limit=100`);
        next[key] = res.list.map((r) => ({
          label: String(r[rel.labelKey] ?? r.id),
          value: String(r.id),
        }));
      } catch {
        next[key] = [];
      }
    }
    setRelationOptions(next);
  }

  function openCreate() {
    setEditingId(null);
    setEditing(defaultValues(spec.fields));
    loadRelations();
  }

  function openEdit(row: Record<string, unknown>) {
    const values: FormValues = { ...row };
    for (const f of spec.fields) {
      // JSON 串字段（tags 类型）回显为真实数组，避免"编辑保存即损坏"
      if ((f.type ?? "text") === "tags" && typeof values[f.key] === "string" && (values[f.key] as string).trim().startsWith("[")) {
        try {
          const parsed = JSON.parse(values[f.key] as string);
          if (Array.isArray(parsed)) values[f.key] = parsed;
        } catch {
          /* 保留原串 */
        }
      }
    }
    setEditingId(Number(row.id));
    setEditing(values);
    loadRelations();
  }

  async function save() {
    if (!editing) return;
    for (const f of spec.fields) {
      if (f.required) {
        const v = editing[f.key];
        if (v === undefined || v === null || v === "") {
          setError(`请填写「${f.label}」`);
          return;
        }
      }
    }
    setSaving(true);
    setError("");
    try {
      const body = normalizeFormValues(spec.fields, editing);
      if (editingId) {
        await managerFetch(`/api/${spec.endpoint}/${editingId}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await managerFetch(`/api/${spec.endpoint}`, { method: "POST", body: JSON.stringify(body) });
      }
      setEditing(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: Record<string, unknown>) {
    if (!window.confirm("确认删除该条记录？删除后不可恢复。")) return;
    try {
      await managerFetch(`/api/${spec.endpoint}/${row.id}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
    }
  }

  const totalPages = data?.pagination.totalPages ?? 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{spec.title}</h1>
        <div className="flex items-center gap-2">
          <input
            className="rounded-md border border-border px-3 py-2 text-sm"
            placeholder={spec.searchPlaceholder ?? "搜索…"}
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
          />
          {!spec.readOnly && (
            <button onClick={openCreate} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              新建
            </button>
          )}
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              {spec.columns.map((c) => (
                <th key={c.key} className="px-4 py-3" style={{ width: c.width }}>
                  {c.label}
                </th>
              ))}
              {!spec.readOnly && <th className="px-4 py-3">操作</th>}
            </tr>
          </thead>
          <tbody>
            {data?.list.map((row) => (
              <tr key={String(row.id)} className="border-b border-border last:border-0">
                {spec.columns.map((c) => (
                  <td key={c.key} className="max-w-[320px] px-4 py-3">
                    <Cell value={row[c.key]} render={c.render} />
                  </td>
                ))}
                {!spec.readOnly && (
                  <td className="whitespace-nowrap px-4 py-3">
                    <button onClick={() => openEdit(row)} className="text-primary hover:underline">编辑</button>
                    {spec.rowActions?.map((a) => (
                      <button
                        key={a.label}
                        className={`ml-3 ${a.danger ? "text-red-600" : "text-muted"} hover:underline`}
                        onClick={async () => {
                          const tip = a.confirm?.(row) ?? null;
                          if (tip && !window.confirm(tip)) return;
                          await a.run(row, load, setError);
                        }}
                      >
                        {a.label}
                      </button>
                    ))}
                    <button onClick={() => remove(row)} className="ml-3 text-red-600 hover:underline">删除</button>
                  </td>
                )}
              </tr>
            ))}
            {data?.list.length === 0 && (
              <tr>
                <td colSpan={spec.columns.length + 1} className="px-4 py-10 text-center text-muted">
                  暂无数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`rounded border px-3 py-1 text-sm ${p === page ? "border-primary text-primary" : "border-border text-muted"}`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditing(null)}>
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-card p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold">{editingId ? `编辑${spec.title}` : `新建${spec.title}`}</h2>
            <div className="mt-4">
              <SchemaForm
                fields={spec.fields.map((f) =>
                  spec.relations && spec.relations[f.key]
                    ? { ...f, type: "select" as const, options: relationOptions[f.key] ?? [] }
                    : f
                )}
                values={editing}
                onChange={setEditing}
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setEditing(null)} className="rounded-md border border-border px-4 py-2 text-sm">
                取消
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {saving ? "保存中…" : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function defaultValues(fields: FieldSpec[]): FormValues {
  const v: FormValues = {};
  for (const f of fields) {
    const type = f.type ?? "text";
    if (type === "switch") v[f.key] = true;
    else if (type === "number") v[f.key] = ""; // 空串由 normalizeFormValues 置 null，避免 0 触发 positive 校验
    else if (type === "tags") v[f.key] = [];
    else if (type === "select") v[f.key] = f.options?.[0]?.value ?? null;
    else v[f.key] = "";
  }
  return v;
}

function Cell({ value, render }: { value: unknown; render?: ColumnSpec["render"] }) {
  if (render === "image" && typeof value === "string" && value) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={value} alt="" className="h-10 w-16 rounded object-cover" />;
  }
  if (render === "boolean") return <span>{value ? "是" : "否"}</span>;
  if (value === null || value === undefined || value === "") return <span className="text-muted">—</span>;
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return <span title={text}>{text.length > 60 ? `${text.slice(0, 60)}…` : text}</span>;
}
