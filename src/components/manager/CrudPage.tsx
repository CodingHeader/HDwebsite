"use client";

/**
 * CrudPage（R2/Q10-D6）：schema 驱动的通用管理页
 * 列表（搜索/分页）+ 新建/编辑弹窗（SchemaForm + 行内校验）+ 删除确认（ConfirmDialog）+ 可选只读模式
 * P05 五态：加载=表格骨架 / 空=EmptyState（可直接新建）/ 错误=ErrorState+重试 / 无权限=Forbidden / 成功=Toast
 */
import { useCallback, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { managerFetch, isForbidden, errorMessage } from "@/lib/manager-fetch";
import { toastCopy } from "@/contracts/common";
import { SchemaForm, normalizeFormValues, validateRequired } from "@/components/manager/SchemaForm";
import type { FieldSpec, FormValues } from "@/components/manager/SchemaForm";
import { PageHeader } from "@/components/manager/shell/PageHeader";
import { FormDialog } from "@/components/manager/FormDialog";
import { Pagination, tableCls } from "@/components/manager/Pagination";
import { SearchInput } from "@/components/manager/SearchInput";
import { Forbidden, TableState, btnCls, confirmDialog, linkCls, toast, useManagerQuery } from "@/components/manager/feedback";

export type ColumnSpec = {
  key: string;
  label: string;
  /** 简单渲染：image 缩略图 / boolean 是否 / 截断文本 */
  render?: "image" | "boolean" | "text";
  width?: string;
};

export type CrudPageSpec = {
  title: string;
  /** 页面副标题（说明本页用途） */
  description?: string;
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

const PAGE_SIZE = 10;

export function CrudPage({ spec }: { spec: CrudPageSpec }) {
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const kw = keyword ? `&keyword=${encodeURIComponent(keyword)}` : "";
  const query = useManagerQuery<ListData>(`/api/${spec.endpoint}?page=${page}&limit=${PAGE_SIZE}${kw}`);
  const { data, error, loading, reload } = query;

  const [editing, setEditing] = useState<FormValues | null>(null);
  const [initial, setInitial] = useState<string>("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [busyRow, setBusyRow] = useState<string | null>(null);
  const [relationOptions, setRelationOptions] = useState<Record<string, { label: string; value: string }[]>>({});

  const loadRelations = useCallback(async () => {
    if (!spec.relations) return;
    const next: Record<string, { label: string; value: string }[]> = {};
    await Promise.all(
      Object.entries(spec.relations).map(async ([key, rel]) => {
        try {
          const res = await managerFetch<ListData>(`/api/${rel.endpoint}?limit=100`);
          next[key] = res.list.map((r) => ({ label: String(r[rel.labelKey] ?? r.id), value: String(r.id) }));
        } catch (e) {
          next[key] = [];
          toast.error(`「${spec.fields.find((f) => f.key === key)?.label ?? key}」选项加载失败`, errorMessage(e));
        }
      })
    );
    setRelationOptions(next);
  }, [spec.relations, spec.fields]);

  function startEdit(id: number | null, values: FormValues) {
    setEditingId(id);
    setEditing(values);
    setInitial(JSON.stringify(values));
    setFieldErrors({});
    setServerError("");
    void loadRelations();
  }

  function openCreate() {
    startEdit(null, defaultValues(spec.fields));
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
    startEdit(Number(row.id), values);
  }

  async function save() {
    if (!editing) return;
    const errs = validateRequired(spec.fields, editing);
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setServerError("");
      // 聚焦首个错误字段
      requestAnimationFrame(() => {
        document.querySelector<HTMLElement>('[data-testid="form-dialog"] [aria-invalid="true"]')?.focus();
      });
      return;
    }
    setSaving(true);
    setServerError("");
    try {
      const body = normalizeFormValues(spec.fields, editing);
      if (editingId) {
        await managerFetch(`/api/${spec.endpoint}/${editingId}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await managerFetch(`/api/${spec.endpoint}`, { method: "POST", body: JSON.stringify(body) });
      }
      toast.success(editingId ? toastCopy.saved : toastCopy.created);
      setEditing(null);
      void reload();
    } catch (e) {
      const msg = errorMessage(e, "保存失败");
      setServerError(msg);
      toast.error("保存失败", msg);
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: Record<string, unknown>) {
    const name = displayName(row);
    const ok = await confirmDialog({
      title: `删除${name ? `「${name}」` : "该条记录"}？`,
      description: "删除后不可恢复，相关引用可能失效。",
      confirmText: "删除",
      danger: true,
    });
    if (!ok) return;
    setBusyRow(String(row.id));
    try {
      await managerFetch(`/api/${spec.endpoint}/${row.id}`, { method: "DELETE" });
      toast.success(toastCopy.deleted);
      // 删除本页最后一条时回退一页
      if (data && data.list.length === 1 && page > 1) setPage(page - 1);
      else void reload();
    } catch (e) {
      toast.fromError(e, "删除失败");
    } finally {
      setBusyRow(null);
    }
  }

  async function runAction(a: RowAction, row: Record<string, unknown>) {
    const tip = a.confirm?.(row) ?? null;
    if (tip) {
      const ok = await confirmDialog({ title: `${a.label}？`, description: tip, confirmText: a.label, danger: a.danger });
      if (!ok) return;
    }
    setBusyRow(String(row.id));
    try {
      await a.run(row, () => void reload(), (msg) => toast.error(`${a.label}失败`, msg));
    } finally {
      setBusyRow(null);
    }
  }

  const formFields = useMemo(
    () =>
      spec.fields.map((f) =>
        spec.relations && spec.relations[f.key] ? { ...f, type: "select" as const, options: relationOptions[f.key] ?? [] } : f
      ),
    [spec.fields, spec.relations, relationOptions]
  );

  if (isForbidden(error)) return <Forbidden message={error.message} />;

  const colCount = spec.columns.length + (spec.readOnly ? 0 : 1);
  const list = data?.list ?? [];
  const dirty = editing !== null && JSON.stringify(editing) !== initial;

  return (
    <div>
      <PageHeader
        title={spec.title}
        description={spec.description}
        actions={
          <>
            <SearchInput
              value={keyword}
              placeholder={spec.searchPlaceholder ?? "搜索…"}
              onChange={(v) => {
                setKeyword(v);
                setPage(1);
              }}
            />
            {!spec.readOnly && (
              <button type="button" onClick={openCreate} className={btnCls("primary")} data-testid="crud-create">
                <Plus aria-hidden="true" />
                新建
              </button>
            )}
          </>
        }
      />

      <div className={tableCls.wrap} aria-busy={loading || query.refreshing}>
        <table className={tableCls.table}>
          <thead className={tableCls.thead}>
            <tr>
              {spec.columns.map((c) => (
                <th key={c.key} scope="col" className={tableCls.th} style={{ width: c.width }}>
                  {c.label}
                </th>
              ))}
              {!spec.readOnly && (
                <th scope="col" className={`${tableCls.th} text-right`}>
                  操作
                </th>
              )}
            </tr>
          </thead>
          <tbody className={query.refreshing ? "opacity-60 transition-opacity" : undefined}>
            <TableState
              columns={colCount}
              loading={loading}
              error={error}
              empty={!!data && list.length === 0}
              onRetry={reload}
              emptyTitle={keyword ? `没有找到与「${keyword}」相关的${spec.title.replace(/管理$/, "")}` : "暂无数据"}
              emptyDescription={keyword ? "换个关键词试试，或清空搜索。" : spec.readOnly ? undefined : "点击「新建」添加第一条记录。"}
              emptyAction={
                !keyword && !spec.readOnly ? (
                  <button type="button" className={btnCls("primary")} onClick={openCreate}>
                    <Plus aria-hidden="true" />
                    新建
                  </button>
                ) : undefined
              }
            />
            {!error &&
              list.map((row) => (
                <tr key={String(row.id)} className={tableCls.tr} style={{ height: "var(--mgr-row-h)" }}>
                  {spec.columns.map((c) => (
                    <td key={c.key} className={`${tableCls.td} max-w-[320px]`}>
                      <Cell value={row[c.key]} render={c.render} />
                    </td>
                  ))}
                  {!spec.readOnly && (
                    <td className={`${tableCls.td} whitespace-nowrap text-right`}>
                      <div className="inline-flex items-center gap-2">
                        <button type="button" onClick={() => openEdit(row)} className={linkCls("primary")} aria-label={`编辑 ${displayName(row)}`}>
                          <Pencil className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                          编辑
                        </button>
                        {spec.rowActions?.map((a) => (
                          <button
                            type="button"
                            key={a.label}
                            disabled={busyRow === String(row.id)}
                            className={linkCls(a.danger ? "danger" : "muted")}
                            onClick={() => void runAction(a, row)}
                          >
                            {a.label}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => void remove(row)}
                          disabled={busyRow === String(row.id)}
                          className={linkCls("danger")}
                          aria-label={`删除 ${displayName(row)}`}
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                          删除
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {data && !error && (
        <Pagination page={page} totalPages={data.pagination.totalPages} total={data.pagination.total} onChange={setPage} />
      )}

      <FormDialog
        open={editing !== null}
        title={editingId ? `编辑${spec.title.replace(/管理$/, "")}` : `新建${spec.title.replace(/管理$/, "")}`}
        onClose={() => setEditing(null)}
        onSubmit={save}
        saving={saving}
        dirty={dirty}
        serverError={serverError}
      >
        {editing && (
          <SchemaForm
            fields={formFields}
            values={editing}
            onChange={setEditing}
            errors={fieldErrors}
            onFieldChange={(key) =>
              setFieldErrors((prev) => {
                if (!prev[key]) return prev;
                const next = { ...prev };
                delete next[key];
                return next;
              })
            }
          />
        )}
      </FormDialog>
    </div>
  );
}

function displayName(row: Record<string, unknown>): string {
  for (const k of ["title", "name", "username", "label", "nickname", "code", "email"]) {
    if (typeof row[k] === "string" && row[k]) return String(row[k]);
  }
  return row.id !== undefined ? `#${row.id}` : "";
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
    return <img src={value} alt="" className="h-10 w-16 rounded-mgr-control border border-mgr-border object-cover" />;
  }
  if (render === "boolean")
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-medium ${value ? "bg-mgr-primary-soft text-mgr-success" : "bg-mgr-subtle text-mgr-muted-fg"}`}
        style={value ? { backgroundColor: "color-mix(in oklch, var(--mgr-success) 12%, transparent)" } : undefined}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${value ? "bg-mgr-success" : "bg-mgr-muted-fg"}`} aria-hidden="true" />
        {value ? "是" : "否"}
      </span>
    );
  if (value === null || value === undefined || value === "") return <span className="text-mgr-muted-fg">—</span>;
  // 关联对象（如 role: { name }）显示其名称而非 JSON
  if (typeof value === "object" && !Array.isArray(value)) {
    const o = value as Record<string, unknown>;
    const label = o.name ?? o.title ?? o.label ?? o.username;
    if (typeof label === "string") return <span>{label}</span>;
  }
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return <span title={text}>{text.length > 60 ? `${text.slice(0, 60)}…` : text}</span>;
}
