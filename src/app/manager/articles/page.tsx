"use client";

/**
 * 文章管理：列表（搜索/频道筛选/分页）+ 双模编辑（Markdown / HTML）
 * P05：五态接入；编辑前拉取详情（修复原实现编辑时正文被清空的问题）；分类改为下拉；删除走 ConfirmDialog；Toast 反馈。
 */
import { useState } from "react";
import { Pencil, Plus, Trash2, ExternalLink } from "lucide-react";
import { managerFetch, isForbidden, errorMessage } from "@/lib/manager-fetch";
import { toastCopy } from "@/contracts/common";
import type { ArticleSummary, Pagination as PaginationData } from "@/contracts";
import { PageHeader } from "@/components/manager/shell/PageHeader";
import { FormDialog } from "@/components/manager/FormDialog";
import { Pagination, tableCls } from "@/components/manager/Pagination";
import { SearchInput } from "@/components/manager/SearchInput";
import { SchemaForm, validateRequired } from "@/components/manager/SchemaForm";
import type { FieldSpec, FormValues } from "@/components/manager/SchemaForm";
import { Bone, Forbidden, TableState, btnCls, confirmDialog, inputCls, linkCls, toast, useManagerQuery } from "@/components/manager/feedback";

type Row = ArticleSummary & { category?: { name: string } | null };
type ListData = { list: Row[]; pagination: PaginationData };

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  published: { label: "已发布", cls: "text-mgr-success" },
  draft: { label: "草稿", cls: "text-mgr-muted-fg" },
  archived: { label: "已归档", cls: "text-mgr-warning" },
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

  return (
    <div>
      <PageHeader
        title="文章管理"
        description="管理官网「新闻」与「资讯」频道的文章，发布后前台即时可见。"
        actions={
          <>
            <select
              aria-label="按频道筛选"
              className={`${inputCls} w-auto`}
              value={channel}
              onChange={(e) => {
                setChannel(e.target.value);
                setPage(1);
              }}
            >
              {CHANNELS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
            <SearchInput
              value={keyword}
              placeholder="搜索标题/内容…"
              onChange={(v) => {
                setKeyword(v);
                setPage(1);
              }}
            />
            <button type="button" onClick={create} className={btnCls("primary")} data-testid="article-create">
              <Plus aria-hidden="true" />
              新建文章
            </button>
          </>
        }
      />

      <div className={tableCls.wrap} aria-busy={loading || refreshing}>
        <table className={tableCls.table}>
          <thead className={tableCls.thead}>
            <tr>
              <th scope="col" className={tableCls.th}>标题</th>
              <th scope="col" className={tableCls.th}>频道</th>
              <th scope="col" className={tableCls.th}>类型</th>
              <th scope="col" className={tableCls.th}>状态</th>
              <th scope="col" className={`${tableCls.th} text-right`}>浏览</th>
              <th scope="col" className={`${tableCls.th} text-right`}>操作</th>
            </tr>
          </thead>
          <tbody className={refreshing ? "opacity-60 transition-opacity" : undefined}>
            <TableState
              columns={6}
              loading={loading}
              error={error}
              empty={!!data && list.length === 0}
              onRetry={reload}
              emptyTitle={keyword ? `没有找到与「${keyword}」相关的文章` : "还没有文章"}
              emptyDescription={keyword ? "换个关键词试试。" : "写下第一篇新闻或资讯吧。"}
              emptyAction={
                keyword ? undefined : (
                  <button type="button" onClick={create} className={btnCls("primary")}>
                    <Plus aria-hidden="true" />
                    新建文章
                  </button>
                )
              }
            />
            {!error &&
              list.map((a) => {
                const st = STATUS_LABEL[a.status] ?? { label: a.status, cls: "" };
                return (
                  <tr key={a.id} className={tableCls.tr} style={{ height: "var(--mgr-row-h)" }}>
                    <td className={`${tableCls.td} max-w-[420px]`}>
                      <span className="line-clamp-1 font-medium text-mgr-fg" title={a.title}>
                        {a.title}
                      </span>
                    </td>
                    <td className={tableCls.td}>{a.channel === "news" ? "新闻" : "资讯"}</td>
                    <td className={`${tableCls.td} text-mgr-muted-fg`}>{a.contentType === "markdown" ? "Markdown" : "HTML"}</td>
                    <td className={tableCls.td}>
                      <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${st.cls}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                        {st.label}
                      </span>
                    </td>
                    <td className={`${tableCls.td} text-right tabular-nums`}>{a.viewCount}</td>
                    <td className={`${tableCls.td} whitespace-nowrap text-right`}>
                      <div className="inline-flex items-center gap-2">
                        {a.status === "published" && (
                          <a href={`/articles/${a.id}`} target="_blank" rel="noreferrer" className={linkCls("muted")} aria-label={`在前台查看 ${a.title}`}>
                            <ExternalLink className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                            查看
                          </a>
                        )}
                        <button type="button" className={linkCls("primary")} onClick={() => void openEdit(a)} aria-label={`编辑 ${a.title}`}>
                          <Pencil className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                          编辑
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(a)}
                          disabled={deleting === a.id}
                          className={linkCls("danger")}
                          aria-label={`删除 ${a.title}`}
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                          {deleting === a.id ? "删除中…" : "删除"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {data && !error && <Pagination page={page} totalPages={data.pagination.totalPages} total={data.pagination.total} onChange={setPage} />}

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
