"use client";

/**
 * CrudPage（P07 重写，R2/Q10-D6）：PageHeader + DataTable + ResourceForm(FormDialog) 组合，保留 CrudPageSpec 接口向后兼容。
 * - 列表：关键词搜索（300ms 防抖）、筛选下拉（spec.filters → 后端 filters 查询参数）、当前页排序、列显隐、密度、刷新、
 *   每页 10/20/50/100、批量删除、行操作、移动端卡片
 * - 表单：字段帮助、分区、高级设置折叠、前端必填/JSON 校验 + 后端 fieldErrors 逐项标红、未保存离开提示、Ctrl/⌘+Enter 保存
 * - 只读资源：可选「查看」详情对话框（日志/记录类）
 * - 五态：骨架 / 空（带下一步）/ 错误 + 重试 / 无权限 / Toast
 */
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { managerFetch, isForbidden, errorMessage } from "@/lib/manager-fetch";
import { toastCopy } from "@/contracts/common";
import { SchemaForm, mapFieldErrors, normalizeFormValues, validateRequired } from "@/components/manager/SchemaForm";
import type { FieldSpec, FormValues } from "@/components/manager/SchemaForm";
import { PageHeader } from "@/components/manager/shell/PageHeader";
import { FormDialog } from "@/components/manager/FormDialog";
import { DataTable, renderCell, type BadgeMap, type DataColumn, type RowActionItem } from "@/components/manager/DataTable";
import { Button } from "@/components/manager/ui/button";
import { Dialog } from "@/components/manager/ui/dialog";
import { HelpCallout } from "@/components/manager/ui/misc";
import { Select, SearchField } from "@/components/manager/ui/input";
import { Forbidden, confirmDialog, toast, useManagerQuery } from "@/components/manager/feedback";

type Row = Record<string, unknown>;

export type ColumnSpec = DataColumn<Row>;

export type FilterSpec = { key: string; label: string; options: { label: string; value: string }[] };

export type FormContext = {
  values: FormValues;
  setValues: (v: FormValues) => void;
  errors: Record<string, string>;
  editingId: number | null;
};

export type CrudPageSpec = {
  title: string;
  /** 页面副标题（说明本页用途） */
  description?: string;
  /** 页面顶部使用说明（可选，首次使用的人一眼看懂） */
  help?: ReactNode;
  endpoint: string;
  columns: ColumnSpec[];
  fields: FieldSpec[];
  /** 关联下拉数据源：fieldKey → { endpoint, labelKey }，新建/编辑时拉取选项 */
  relations?: Record<string, { endpoint: string; labelKey: string; multiple?: boolean }>;
  /** 列表筛选（后端 crud filters 白名单字段） */
  filters?: FilterSpec[];
  readOnly?: boolean;
  /** 只读资源的「查看」详情 */
  detail?: boolean;
  searchPlaceholder?: string;
  /** 额外的行操作按钮（特殊页扩展） */
  rowActions?: RowAction[];
  /** 新建按钮文案 */
  createLabel?: string;
  /** 表单弹窗尺寸 */
  formSize?: "md" | "lg" | "xl";
  /** 新建默认值（覆盖按字段类型推导的默认值） */
  defaults?: FormValues;
  /** 编辑回显转换（行 → 表单值） */
  fromRow?: (row: Row) => FormValues;
  /** 提交前转换（表单值 → 请求体） */
  toPayload?: (values: FormValues, editingId: number | null) => FormValues;
  /** 在字段表单之后追加的自定义表单区（如角色权限编辑器） */
  renderExtra?: (ctx: FormContext) => ReactNode;
  /** 关闭批量删除 */
  noBulkDelete?: boolean;
  /** 禁止删除（如通知规则：事件唯一） */
  noDelete?: boolean;
  /** 禁止新建 */
  noCreate?: boolean;
};

export type RowAction = {
  label: string;
  danger?: boolean;
  /** 只对部分行显示 */
  visible?: (row: Row) => boolean;
  /** 返回确认文案；返回 null 则不弹确认 */
  confirm?: (row: Row) => string | null;
  run: (row: Row, reload: () => void, fail: (msg: string) => void) => Promise<void>;
};

type ListData = { list: Row[]; pagination: { page: number; limit: number; total: number; totalPages: number } };

/** 通用状态徽标映射（status 列缺省使用） */
export const STATUS_BADGES: BadgeMap = {
  active: { label: "启用", tone: "success" },
  inactive: { label: "停用", tone: "neutral" },
  draft: { label: "草稿", tone: "neutral" },
  archived: { label: "归档", tone: "warning" },
  pending: { label: "待处理", tone: "info" },
  pending_review: { label: "待审核", tone: "warning" },
  approved: { label: "已通过", tone: "success" },
  rejected: { label: "已拒绝", tone: "neutral" },
  published: { label: "已发布", tone: "success" },
  offline: { label: "已下线", tone: "neutral" },
  success: { label: "成功", tone: "success" },
  sent: { label: "已发送", tone: "success" },
  failed: { label: "失败", tone: "danger" },
  running: { label: "运行中", tone: "info" },
  skipped: { label: "已跳过", tone: "neutral" },
  contacted: { label: "已联系", tone: "info" },
  converted: { label: "已转化", tone: "success" },
  invalid: { label: "无效", tone: "neutral" },
};

export function displayName(row: Row): string {
  for (const k of ["title", "name", "username", "label", "nickname", "code", "email", "elementId"]) {
    if (typeof row[k] === "string" && row[k]) return String(row[k]);
  }
  return row.id !== undefined ? `#${row.id}` : "";
}

function defaultValues(fields: FieldSpec[], defaults?: FormValues): FormValues {
  const v: FormValues = {};
  for (const f of fields) {
    const type = f.type ?? "text";
    if (type === "switch") v[f.key] = true;
    else if (type === "number") v[f.key] = "";
    else if (type === "tags" || type === "multiselect") v[f.key] = [];
    else if (type === "select") v[f.key] = f.options?.[0]?.value ?? null;
    else v[f.key] = "";
  }
  return { ...v, ...(defaults ?? {}) };
}

export function CrudPage({ spec }: { spec: CrudPageSpec }) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [keyword, setKeyword] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (keyword) qs.set("keyword", keyword);
  for (const [k, v] of Object.entries(filters)) if (v) qs.set(k, v);
  const query = useManagerQuery<ListData>(`/api/${spec.endpoint}?${qs.toString()}`);
  const { data, error, loading, refreshing, reload } = query;

  const [editing, setEditing] = useState<FormValues | null>(null);
  const [initial, setInitial] = useState<string>("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [busyRow, setBusyRow] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Row | null>(null);
  const [relationOptions, setRelationOptions] = useState<Record<string, { label: string; value: string | number }[]>>({});
  const noun = spec.title.replace(/管理$/, "");

  const loadRelations = useCallback(async () => {
    if (!spec.relations) return;
    const next: Record<string, { label: string; value: string | number }[]> = {};
    await Promise.all(
      Object.entries(spec.relations).map(async ([key, rel]) => {
        try {
          const res = await managerFetch<ListData>(`/api/${rel.endpoint}?limit=100`);
          next[key] = res.list.map((r) => ({ label: String(r[rel.labelKey] ?? r.id), value: Number(r.id) }));
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
    startEdit(null, defaultValues(spec.fields, spec.defaults));
  }

  function openEdit(row: Row) {
    let values: FormValues = { ...row };
    for (const f of spec.fields) {
      const t = f.type ?? "text";
      // JSON 串字段（tags/multiselect）回显为真实数组，避免"编辑保存即损坏"
      if ((t === "tags" || t === "multiselect") && typeof values[f.key] === "string" && (values[f.key] as string).trim().startsWith("[")) {
        try {
          const parsed = JSON.parse(values[f.key] as string);
          if (Array.isArray(parsed)) values[f.key] = parsed;
        } catch {
          /* 保留原串 */
        }
      }
    }
    if (spec.fromRow) values = spec.fromRow(values);
    startEdit(Number(row.id), values);
  }

  async function save() {
    if (!editing) return;
    const errs = validateRequired(spec.fields, editing);
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setServerError("");
      requestAnimationFrame(() => {
        document.querySelector<HTMLElement>('[data-testid="form-dialog"] [aria-invalid="true"]')?.focus();
      });
      return;
    }
    setSaving(true);
    setServerError("");
    try {
      let body = normalizeFormValues(spec.fields, editing);
      if (spec.toPayload) body = spec.toPayload(body, editingId);
      if (editingId) {
        await managerFetch(`/api/${spec.endpoint}/${editingId}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await managerFetch(`/api/${spec.endpoint}`, { method: "POST", body: JSON.stringify(body) });
      }
      toast.success(editingId ? toastCopy.saved : toastCopy.created, displayName(body as Row) || undefined);
      setEditing(null);
      void reload();
    } catch (e) {
      const msg = errorMessage(e, "保存失败");
      const fe = mapFieldErrors(e);
      if (Object.keys(fe).length) setFieldErrors(fe);
      setServerError(Object.keys(fe).length ? `${msg}（已在对应字段下标出）` : msg);
      toast.error("保存失败", msg);
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: Row) {
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
      toast.success(toastCopy.deleted, name || undefined);
      if (data && data.list.length === 1 && page > 1) setPage(page - 1);
      else void reload();
    } catch (e) {
      toast.fromError(e, "删除失败");
    } finally {
      setBusyRow(null);
    }
  }

  async function bulkRemove(rows: Row[]) {
    const ok = await confirmDialog({
      title: `删除选中的 ${rows.length} 条${noun}？`,
      description: "删除后不可恢复，相关引用可能失效。",
      confirmText: `删除 ${rows.length} 条`,
      danger: true,
    });
    if (!ok) return;
    let fail = 0;
    let lastErr = "";
    for (const r of rows) {
      try {
        await managerFetch(`/api/${spec.endpoint}/${r.id}`, { method: "DELETE" });
      } catch (e) {
        fail++;
        lastErr = errorMessage(e);
      }
    }
    if (rows.length - fail > 0) toast.success(`已删除 ${rows.length - fail} 条`);
    if (fail) toast.error(`${fail} 条删除失败`, lastErr);
    if (data && rows.length >= data.list.length && page > 1) setPage(page - 1);
    else void reload();
  }

  async function runAction(a: RowAction, row: Row) {
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
      spec.fields.map((f) => {
        const rel = spec.relations?.[f.key];
        if (!rel) return f;
        return { ...f, type: rel.multiple ? ("multiselect" as const) : ("select" as const), options: relationOptions[f.key] ?? [] };
      }),
    [spec.fields, spec.relations, relationOptions]
  );

  const columns = useMemo<ColumnSpec[]>(
    () =>
      spec.columns.map((c) => {
        if (!c.render && c.key === "status") return { ...c, render: "badge", badges: c.badges ?? STATUS_BADGES };
        if (!c.render && /At$/.test(c.key)) return { ...c, render: "datetime", sortable: c.sortable ?? true };
        if (!c.render && ["sort", "priority", "level", "userCount"].includes(c.key)) return { ...c, render: "number", align: c.align ?? "right", sortable: c.sortable ?? true };
        return { ...c, sortable: c.sortable ?? (!c.render || c.render === "text" || c.render === "badge" || c.render === "boolean") };
      }),
    [spec.columns]
  );

  if (isForbidden(error)) return <Forbidden message={error.message} />;

  const list = data?.list ?? [];
  const dirty = editing !== null && JSON.stringify(editing) !== initial;
  const filtered = !!keyword || Object.values(filters).some(Boolean);
  const canCreate = !spec.readOnly && !spec.noCreate;
  const createBtn = canCreate ? (
    <Button variant="primary" icon={<Plus />} onClick={openCreate} data-testid="crud-create">
      {spec.createLabel ?? "新建"}
    </Button>
  ) : null;
  // 空状态里的引导按钮：次级样式 + 独立 testid，保证每页只有一个主「新建」（crud-create，位于页头）
  const emptyCreateBtn = canCreate ? (
    <Button variant="secondary" icon={<Plus />} onClick={openCreate} data-testid="empty-create">
      {spec.createLabel ?? "新建"}
    </Button>
  ) : null;

  function rowActions(row: Row): RowActionItem[] {
    const name = displayName(row);
    const busy = busyRow === String(row.id);
    const out: RowActionItem[] = [];
    if (spec.readOnly) {
      if (spec.detail) out.push({ key: "view", label: "查看", icon: <Eye />, ariaLabel: `查看 ${name}`, onClick: () => setViewing(row) });
      return out;
    }
    out.push({ key: "edit", label: "编辑", icon: <Pencil />, ariaLabel: `编辑 ${name}`, onClick: () => openEdit(row) });
    for (const a of spec.rowActions ?? []) {
      if (a.visible && !a.visible(row)) continue;
      out.push({ key: a.label, label: a.label, tone: a.danger ? "danger" : "muted", disabled: busy, onClick: () => void runAction(a, row) });
    }
    if (!spec.noDelete) out.push({ key: "delete", label: "删除", icon: <Trash2 />, tone: "danger", ariaLabel: `删除 ${name}`, disabled: busy, onClick: () => void remove(row) });
    return out;
  }

  return (
    <div>
      <PageHeader title={spec.title} description={spec.description} actions={createBtn} />
      {spec.help && <HelpCallout className="mb-4">{spec.help}</HelpCallout>}

      <DataTable<Row>
        caption={`${spec.title}列表`}
        rows={list}
        columns={columns}
        rowKey={(r) => String(r.id)}
        rowName={displayName}
        loading={loading}
        refreshing={refreshing}
        error={error}
        onRetry={reload}
        onRefresh={reload}
        toolbar={
          <>
            <SearchField
              value={keyword}
              placeholder={spec.searchPlaceholder ?? `搜索${noun}…`}
              onChange={(v) => {
                setKeyword(v);
                setPage(1);
              }}
            />
            {spec.filters?.map((f) => (
              <Select
                key={f.key}
                aria-label={`按${f.label}筛选`}
                className="w-auto min-w-[120px] sm:w-36"
                value={filters[f.key] ?? ""}
                placeholder={`全部${f.label}`}
                options={f.options}
                onChange={(e) => {
                  setFilters((p) => ({ ...p, [f.key]: e.target.value }));
                  setPage(1);
                }}
              />
            ))}
            {filtered && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setKeyword("");
                  setFilters({});
                  setPage(1);
                }}
              >
                清除筛选
              </Button>
            )}
          </>
        }
        emptyTitle={filtered ? `没有找到符合条件的${noun}` : `还没有${noun}`}
        emptyDescription={filtered ? "换个关键词或清除筛选试试。" : canCreate ? `点击「${spec.createLabel ?? "新建"}」添加第一条。` : "有新记录时会自动出现在这里。"}
        emptyAction={!filtered && canCreate ? emptyCreateBtn : undefined}
        rowActions={spec.readOnly && !spec.detail ? undefined : rowActions}
        bulkActions={
          spec.readOnly || spec.noBulkDelete || spec.noDelete
            ? undefined
            : [{ key: "delete", label: "批量删除", danger: true, icon: <Trash2 />, run: bulkRemove }]
        }
        pagination={
          data
            ? {
                page,
                limit,
                total: data.pagination.total,
                totalPages: data.pagination.totalPages,
                onPageChange: setPage,
                onLimitChange: (n) => {
                  setLimit(n);
                  setPage(1);
                },
              }
            : undefined
        }
      />

      <FormDialog
        open={editing !== null}
        title={editingId ? `编辑${noun}` : `${spec.createLabel ?? `新建${noun}`}`}
        onClose={() => setEditing(null)}
        onSubmit={save}
        saving={saving}
        dirty={dirty}
        serverError={serverError}
        size={spec.formSize ?? "lg"}
      >
        {editing && (
          <>
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
            {spec.renderExtra?.({ values: editing, setValues: setEditing, errors: fieldErrors, editingId })}
          </>
        )}
      </FormDialog>

      {spec.detail && (
        <Dialog open={viewing !== null} onClose={() => setViewing(null)} title={`${noun}详情`} description={viewing ? displayName(viewing) : undefined} size="lg">
          {viewing && (
            <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-[13px] sm:grid-cols-[140px_minmax(0,1fr)]">
              {Object.entries(viewing).map(([k, v]) => {
                const col = columns.find((c) => c.key === k);
                return (
                  <div key={k} className="contents">
                    <dt className="text-mgr-muted-fg">{col?.label ?? k}</dt>
                    <dd className="min-w-0 whitespace-pre-wrap break-words text-mgr-fg">
                      {col ? renderCell(col, viewing) : v === null || v === "" ? "—" : typeof v === "object" ? JSON.stringify(v, null, 2) : String(v)}
                    </dd>
                  </div>
                );
              })}
            </dl>
          )}
        </Dialog>
      )}
    </div>
  );
}
