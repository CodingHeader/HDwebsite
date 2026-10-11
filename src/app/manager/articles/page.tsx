"use client";

import { useEffect, useState } from "react";
import { managerFetch } from "@/lib/manager-fetch";
import type { ArticleSummary, Pagination } from "@/contracts";

type ListData = { list: (ArticleSummary & { category?: { name: string } | null })[]; pagination: Pagination };

/** 文章管理：列表 + 双模编辑（contentType 切换 markdown/TipTap 文本域，R0 版） */
export default function ManagerArticlesPage() {
  const [data, setData] = useState<ListData | null>(null);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<ArticleForm | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError("");
      try {
        const kw = keyword ? `&keyword=${encodeURIComponent(keyword)}` : "";
        const res = await managerFetch<ListData>(`/api/articles?page=${page}&limit=10${kw}`);
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "加载失败");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, keyword]);

  async function save() {
    if (!editing) return;
    setSaving(true);
    setError("");
    try {
      const body = {
        title: editing.title,
        content: editing.content,
        contentType: editing.contentType,
        channel: editing.channel,
        excerpt: editing.excerpt || undefined,
        coverImage: editing.coverImage || undefined,
        categoryId: editing.categoryId || undefined,
        tagIds: editing.tagIds ?? [],
        status: editing.status,
      };
      if (editing.id) {
        await managerFetch(`/api/articles/${editing.id}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await managerFetch("/api/articles", { method: "POST", body: JSON.stringify(body) });
      }
      setEditing(null);
      setPage(1);
      const res = await managerFetch<ListData>(`/api/articles?page=1&limit=10`);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("确认删除该文章？")) return;
    try {
      await managerFetch(`/api/articles/${id}`, { method: "DELETE" });
      setData((d) => (d ? { ...d, list: d.list.filter((a) => a.id !== id) } : d));
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">文章管理</h1>
        <div className="flex items-center gap-2">
          <input
            className="rounded-md border border-border px-3 py-2 text-sm"
            placeholder="搜索标题/内容…"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
          />
          <button
            onClick={() =>
              setEditing({ title: "", content: "", contentType: "markdown", channel: "info", status: "draft", tagIds: [] })
            }
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            新建
          </button>
        </div>
      </div>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="px-4 py-3">标题</th>
              <th className="px-4 py-3">频道</th>
              <th className="px-4 py-3">类型</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3">浏览</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {data?.list.map((a) => (
              <tr key={a.id} className="border-b border-border last:border-0">
                <td className="max-w-[360px] px-4 py-3">{a.title}</td>
                <td className="px-4 py-3">{a.channel === "news" ? "新闻" : "资讯"}</td>
                <td className="px-4 py-3">{a.contentType}</td>
                <td className="px-4 py-3">{a.status}</td>
                <td className="px-4 py-3">{a.viewCount}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <button
                    className="text-primary hover:underline"
                    onClick={() =>
                      setEditing({
                        id: a.id, title: a.title, content: "", contentType: a.contentType,
                        channel: a.channel, status: a.status, tagIds: [],
                      })
                    }
                  >
                    编辑
                  </button>
                  <button onClick={() => handleDelete(a.id)} className="ml-3 text-red-600 hover:underline">删除</button>
                </td>
              </tr>
            ))}
            {data?.list.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">暂无数据</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.pagination.totalPages > 1 && (
        <div className="mt-4 flex gap-2">
          {Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1).map((p) => (
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
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">{editing.id ? "编辑文章" : "新建文章"}</h2>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="mb-1 block text-sm font-medium">标题 *</label>
                <input
                  className="w-full rounded-md border border-border px-3 py-2 text-sm"
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">频道</label>
                <select
                  className="w-full rounded-md border border-border px-3 py-2 text-sm"
                  value={editing.channel}
                  onChange={(e) => setEditing({ ...editing, channel: e.target.value as "news" | "info" })}
                >
                  <option value="info">资讯</option>
                  <option value="news">新闻</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">内容类型</label>
                <select
                  className="w-full rounded-md border border-border px-3 py-2 text-sm"
                  value={editing.contentType}
                  onChange={(e) => setEditing({ ...editing, contentType: e.target.value as "markdown" | "html" })}
                >
                  <option value="markdown">Markdown</option>
                  <option value="html">HTML（TipTap 兼容）</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">摘要（留空自动生成）</label>
                <input
                  className="w-full rounded-md border border-border px-3 py-2 text-sm"
                  value={editing.excerpt ?? ""}
                  onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">封面（留空取首图）</label>
                <input
                  className="w-full rounded-md border border-border px-3 py-2 text-sm"
                  value={editing.coverImage ?? ""}
                  onChange={(e) => setEditing({ ...editing, coverImage: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">分类 ID</label>
                <input
                  type="number"
                  className="w-full rounded-md border border-border px-3 py-2 text-sm"
                  value={editing.categoryId ?? ""}
                  onChange={(e) => setEditing({ ...editing, categoryId: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">状态</label>
                <select
                  className="w-full rounded-md border border-border px-3 py-2 text-sm"
                  value={editing.status}
                  onChange={(e) => setEditing({ ...editing, status: e.target.value as "draft" | "published" | "archived" })}
                >
                  <option value="draft">草稿</option>
                  <option value="published">发布</option>
                  <option value="archived">归档</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-sm font-medium">正文 *（{editing.contentType === "markdown" ? "Markdown" : "HTML"}）</label>
                <textarea
                  className="w-full rounded-md border border-border px-3 py-2 font-mono text-sm"
                  rows={14}
                  value={editing.content}
                  placeholder={editing.contentType === "markdown" ? "# 标题\n\n支持 GFM 表格、代码块等" : "<p>HTML 内容，保存时统一净化</p>"}
                  onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setEditing(null)} className="rounded-md border border-border px-4 py-2 text-sm">取消</button>
              <button onClick={save} disabled={saving} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                {saving ? "保存中…" : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type ArticleForm = {
  id?: number;
  title: string;
  content: string;
  contentType: "markdown" | "html";
  channel: "news" | "info";
  status: "draft" | "published" | "archived";
  excerpt?: string;
  coverImage?: string;
  categoryId?: number;
  tagIds?: number[];
};
