"use client";

/**
 * 文章管理：列表（搜索/频道筛选/分页）+ 双模编辑（Markdown / HTML）
 * P05：五态接入；编辑前拉取详情（修复原实现编辑时正文被清空的问题）；分类改为下拉；删除走 ConfirmDialog；Toast 反馈。
 * E-05：设计系统组件化（DataTable/Select/Button/LinkButton，严格正则 0 原生控件）+ 行操作「上线/下线」
 *   调用 PATCH /api/articles/[id]（article:publish，main parity B3；首次发布写 publishedAt）。
 */
import { useState } from "react";
import { ArrowDownToLine, Pencil, Plus, Trash2, ExternalLink } from "lucide-react";
import { managerFetch, isForbidden, errorMessage } from "@/lib/manager-fetch";
import { toastCopy } from "@/contracts/common";
import type { ArticleSummary, Pagination as PaginationData } from "@/contracts";
import { PageHeader } from "@/components/manager/shell/PageHeader";
import { FormDialog } from "@/components/manager/FormDialog";
import { DataTable } from "@/components/manager/DataTable";
import type { DataColumn } from "@/components/manager/DataTable";
import { SearchInput } from "@/components/manager/SearchInput";
import { Select, Button } from "@/components/manager/ui";
import { Badge } from "@/components/manager/ui/misc";
import { validateRequired } from "@/components/manager/form-utils";
import type { FieldSpec, FormValues } from "@/components/manager/SchemaForm";
import dynamic from "next/dynamic";

// W2-04 减包：SchemaForm 仅在打开表单弹窗时需要，改为懒加载，不进列表页首屏
const SchemaForm = dynamic(
  () => import("@/components/manager/SchemaForm").then((m) => m.SchemaForm),
  { ssr: false, loading: () => <div className="h-[320px] animate-pulse rounded-md bg-mgr-muted" /> }
);
import { Bone, Forbidden, confirmDialog, toast, useManagerQuery } from "@/components/manager/feedback";

type Row = ArticleSummary & { category?: { name: string } | null };
type ListData = { list: Row[]; pagination: PaginationData };

const STATUS_TONE: Record<string, { label: string; tone: "success" | "neutral" | "warning" }> = {
  published: { label: "已发布", tone: "success" },
  draft: { label: "草稿", tone: "neutral" },
  archived: { label: "已归档", tone: "warning" },
};

const CHANNELS = [
  { key: "", label: "全部频道" },
  { key: "news", label: "新闻" },
  { key: "info", label: "资讯" },
];

const EMPTY_FORM: FormValues = { title: "", content: "", contentType: "markdown", channel: "info", status: "draft", excerpt: "", coverImage: "", categoryId: null };

export default function ManagerArticlesPage() {
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [channel, setChannel] = useState("");
  const qs = `page=${page}&limit=10${keyword ? `&keyword=${encodeURIComponent(keyword)}` : ""}${channel ? `&channel=${channel}` : ""}`;
  const { data, error, loading, refreshing, reload } = useManagerQuery<ListData>(`/api/articles?${qs}`);

  const [editing, setEditing] = useState<FormValues | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [initial, setInitial] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [categories, setCategories] = useState<{ label: string; value: number }[]>([]);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [toggling, setToggling] = useState<number | null>(null);

  // E-05：一键上下线（PATCH /api/articles/[id]；published→draft 下线，其余→published 上线）
  async function toggleStatus(a: Row) {
    const next = a.status === "published" ? "draft" : "published";
    setToggling(a.id);
    try {
      await managerFetch(`/api/articles/${a.id}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
      toast.success(next === "published" ? "已上线" : "已下线", a.title);
      void reload();
    } catch (e) {
      toast.fromError(e, next === "published" ? "上线失败" : "下线失败");
    } finally {
      setToggling(null);
    }
  }

  async function loadCategories() {
    try {
      const res = await managerFetch<{ list: { id: number; name: string }[] }>("/api/categories?limit=100");
      setCategories(res.list.map((c) => ({ label: c.name, value: c.id })));
    } catch {
      setCategories([]);
    }
  }

  function begin(id: number | null, values: FormValues) {
    setEditingId(id);
    setEditing(values);
    setInitial(JSON.stringify(values));
    setFieldErrors({});
    setServerError("");
    void loadCategories();
  }

  async function openEdit(a: Row) {
    begin(a.id, { ...EMPTY_FORM, title: a.title, channel: a.channel, contentType: a.contentType, status: a.status });
    setDetailLoading(true);
    try {
      const full = await managerFetch<Row & { content: string; categoryId: number | null }>(`/api/articles/${a.id}`);
      const values: FormValues = {
        title: full.title,
        content: full.content ?? "",
        contentType: full.contentType,
        channel: full.channel,
        status: full.status,
        excerpt: full.excerpt ?? "",
        coverImage: full.coverImage ?? "",
        categoryId: full.categoryId ?? null,
      };
      setEditing(values);
      setInitial(JSON.stringify(values));
    } catch (e) {
      setServerError(`文章详情加载失败：${errorMessage(e)}。为避免覆盖正文，请关闭后重试。`);
    } finally {
      setDetailLoading(false);
    }
  }

  const fields: FieldSpec[] = [
    { key: "title", label: "标题", required: true, colSpan: 2, placeholder: "例如：2026 年秋季招生简章" },
    { key: "channel", label: "频道", type: "select", options: [{ label: "资讯", value: "info" }, { label: "新闻", value: "news" }] },
    { key: "contentType", label: "内容类型", type: "select", options: [{ label: "Markdown", value: "markdown" }, { label: "HTML（TipTap 兼容）", value: "html" }] },
    { key: "categoryId", label: "分类", type: "select", options: categories },
    { key: "status", label: "状态", type: "select", options: [{ label: "草稿", value: "draft" }, { label: "发布", value: "published" }, { label: "归档", value: "archived" }] },
    { key: "excerpt", label: "摘要（留空自动生成）", colSpan: 2 },
    { key: "coverImage", label: "封面（留空取正文首图）", type: "image", colSpan: 2 },
    { key: "content", label: `正文（${editing?.contentType === "html" ? "HTML" : "Markdown"}）`, type: editing?.contentType === "html" ? "richtext" : "markdown", required: true, rows: 14 },
  ];

  async function save() {
    if (!editing || detailLoading) return;
    const errs = validateRequired(fields, editing);
    setFieldErrors(errs);
    if (Object.keys(errs).length) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-testid="form-dialog"] [aria-invalid="true"]')?.focus());
      return;
    }
    setSaving(true);
    setServerError("");
    try {
      const body = {
        title: String(editing.title).trim(),
        content: editing.content,
        contentType: editing.contentType,
        channel: editing.channel,
        excerpt: editing.excerpt ? String(editing.excerpt) : undefined,
        coverImage: editing.coverImage ? String(editing.coverImage) : undefined,
        categoryId: editing.categoryId ? Number(editing.categoryId) : null,
        status: editing.status,
      };
      if (editingId) {
        await managerFetch(`/api/articles/${editingId}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await managerFetch("/api/articles", { method: "POST", body: JSON.stringify(body) });
      }
      toast.success(editingId ? toastCopy.saved : toastCopy.created, String(body.title));
      setEditing(null);
      if (!editingId && page !== 1) setPage(1);
      else void reload();
    } catch (e) {
      const msg = errorMessage(e, "保存失败");
      setServerError(msg);
      toast.error("保存失败", msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(a: Row) {
    const ok = await confirmDialog({
      title: `删除文章「${a.title}」？`,
      description: "删除后前台将无法访问该文章，且不可恢复。如只想隐藏，可将状态改为「归档」。",
      confirmText: "删除",
      danger: true,
    });
    if (!ok) return;
    setDeleting(a.id);
    try {
      await managerFetch(`/api/articles/${a.id}`, { method: "DELETE" });
      toast.success(toastCopy.deleted, a.title);
      if (data && data.list.length === 1 && page > 1) setPage(page - 1);
      else void reload();
    } catch (e) {
      toast.fromError(e, "删除失败");
    } finally {
      setDeleting(null);
    }
  }

  if (isForbidden(error)) return <Forbidden message={error.message} />;

  const list = data?.list ?? [];
  const create = () => begin(null, { ...EMPTY_FORM });

  const columns: DataColumn<Row>[] = [
    {
      key: "title",
      label: "标题",
      primary: true,
      render: (a) => (
        <span className="line-clamp-1 font-medium text-mgr-fg" title={a.title}>
          {a.title}
        </span>
      ),
    },
    { key: "channel", label: "频道", render: (a) => (a.channel === "news" ? "新闻" : "资讯") },
    { key: "contentType", label: "类型", render: (a) => (a.contentType === "markdown" ? "Markdown" : "HTML") },
    {
      key: "status",
      label: "状态",
      render: (a) => {
        const st = STATUS_TONE[a.status] ?? { label: a.status, tone: "neutral" as const };
        return <Badge tone={st.tone} dot>{st.label}</Badge>;
      },
    },
    { key: "viewCount", label: "浏览", align: "right" },
  ];

  return (
    <div>
      <PageHeader
        title="文章管理"
        description="管理官网「新闻」与「资讯」频道的文章，发布后前台即时可见。"
        actions={
          <>
            <Select
              aria-label="按频道筛选"
              className="w-auto sm:w-32"
              value={channel}
              onChange={(e) => {
                setChannel(e.target.value);
                setPage(1);
              }}
              options={CHANNELS.map((c) => ({ label: c.label, value: c.key }))}
            />
            <SearchInput
              value={keyword}
              placeholder="搜索标题/内容…"
              onChange={(v) => {
                setKeyword(v);
                setPage(1);
              }}
            />
            <Button type="button" onClick={create} variant="primary" data-testid="article-create">
              <Plus aria-hidden="true" />
              新建文章
            </Button>
          </>
        }
      />

      <DataTable<Row>
        caption="文章列表"
        rows={list}
        columns={columns}
        rowKey={(a) => String(a.id)}
        loading={loading}
        refreshing={refreshing}
        error={error}
        onRetry={reload}
        emptyTitle={keyword ? `没有找到与「${keyword}」相关的文章` : "还没有文章"}
        emptyDescription={keyword ? "换个关键词试试。" : "写下第一篇新闻或资讯吧。"}
        emptyAction={
          keyword ? undefined : (
            <Button type="button" onClick={create} variant="primary">
              <Plus aria-hidden="true" />
              新建文章
            </Button>
          )
        }
        rowName={(a) => a.title}
        rowActions={(a) => [
          ...(a.status === "published"
            ? [{ key: "view", label: "查看", href: `/articles/${a.id}`, ariaLabel: `在前台查看 ${a.title}`, tone: "muted" as const, icon: <ExternalLink aria-hidden="true" /> }]
            : []),
          { key: "toggle", label: a.status === "published" ? "下线" : "上线", ariaLabel: `${a.status === "published" ? "下线" : "上线"} ${a.title}`, tone: "primary" as const, icon: <ArrowDownToLine aria-hidden="true" />, onClick: () => void toggleStatus(a), disabled: toggling === a.id },
          { key: "edit", label: "编辑", ariaLabel: `编辑 ${a.title}`, tone: "primary" as const, icon: <Pencil aria-hidden="true" />, onClick: () => void openEdit(a) },
          { key: "delete", label: deleting === a.id ? "删除中…" : "删除", ariaLabel: `删除 ${a.title}`, tone: "danger" as const, icon: <Trash2 aria-hidden="true" />, onClick: () => void handleDelete(a), disabled: deleting === a.id },
        ]}
        pagination={data && !error ? { page, limit: 10, totalPages: data.pagination.totalPages, total: data.pagination.total, onPageChange: setPage } : undefined}
        data-testid="articles-table"
      />

      <FormDialog
        open={editing !== null}
        title={editingId ? "编辑文章" : "新建文章"}
        onClose={() => setEditing(null)}
        onSubmit={save}
        saving={saving || detailLoading}
        dirty={editing !== null && JSON.stringify(editing) !== initial}
        serverError={serverError}
      >
        {detailLoading ? (
          <div className="space-y-4" role="status" aria-busy="true">
            <span className="sr-only">正在加载文章详情…</span>
            <Bone className="h-9 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Bone className="h-9" />
              <Bone className="h-9" />
            </div>
            <Bone className="h-64 w-full" />
          </div>
        ) : (
          editing && (
            <SchemaForm
              fields={fields}
              values={editing}
              onChange={setEditing}
              errors={fieldErrors}
              onFieldChange={(k) =>
                setFieldErrors((p) => {
                  if (!p[k]) return p;
                  const n = { ...p };
                  delete n[k];
                  return n;
                })
              }
            />
          )
        )}
      </FormDialog>
    </div>
  );
}
