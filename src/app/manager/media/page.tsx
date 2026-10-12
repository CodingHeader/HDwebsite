"use client";

/**
 * 媒体库：上传（按钮/拖拽）+ 网格 + 批量删除 + 复制链接
 * P05：五态接入（骨架/空/错误+重试/无权限）；批量删除走 ConfirmDialog；上传/删除结果 Toast（部分失败逐条说明）。
 */
import { useRef, useState } from "react";
import { Copy, FileText, Trash2, Upload, ImageOff } from "lucide-react";
import { managerFetch, isForbidden } from "@/lib/manager-fetch";
import { useAuthStore } from "@/store/authStore";
import { PageHeader } from "@/components/manager/shell/PageHeader";
import { Pagination } from "@/components/manager/Pagination";
import { Bone, EmptyState, ErrorState, Forbidden, btnCls, cardCls, confirmDialog, toast, useManagerQuery } from "@/components/manager/feedback";

type MediaRow = { id: number; url: string; filename: string; mimeType: string; size: number; createdAt: string };
type ListData = { list: MediaRow[]; pagination: { page: number; totalPages: number; total?: number } };

function formatSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function ManagerMediaPage() {
  const [page, setPage] = useState(1);
  const { data, error, loading, refreshing, reload } = useManagerQuery<ListData>(`/api/media?page=${page}&limit=24`);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function upload(files: FileList | File[] | null) {
    const list = files ? Array.from(files) : [];
    if (!list.length) return;
    setUploading(true);
    const failed: string[] = [];
    try {
      for (const file of list) {
        try {
          const fd = new FormData();
          fd.append("file", file);
          const token = useAuthStore.getState().token;
          const res = await fetch("/api/upload", { method: "POST", body: fd, headers: token ? { Authorization: `Bearer ${token}` } : {} });
          const body = (await res.json().catch(() => ({ code: res.status, message: `HTTP ${res.status}` }))) as { code: number; message: string };
          if (body.code !== 200) failed.push(`${file.name}：${body.message}`);
        } catch {
          failed.push(`${file.name}：网络异常`);
        }
      }
      const ok = list.length - failed.length;
      if (ok > 0) toast.success(`已上传 ${ok} 个文件`);
      if (failed.length) toast.error(`${failed.length} 个文件上传失败`, failed.slice(0, 3).join("；"));
      if (page !== 1) setPage(1);
      else void reload();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function batchDelete() {
    if (!selected.size) return;
    const ok = await confirmDialog({
      title: `删除选中的 ${selected.size} 个文件？`,
      description: "已在文章、轮播图等处引用的文件删除后将无法显示，且不可恢复。",
      confirmText: "删除",
      danger: true,
    });
    if (!ok) return;
    setDeleting(true);
    let fail = 0;
    let lastErr = "";
    for (const id of selected) {
      try {
        await managerFetch(`/api/media/${id}`, { method: "DELETE" });
      } catch (e) {
        fail++;
        lastErr = e instanceof Error ? e.message : "删除失败";
      }
    }
    const done = selected.size - fail;
    if (done) toast.success(`已删除 ${done} 个文件`);
    if (fail) toast.error(`${fail} 个文件删除失败`, lastErr);
    setSelected(new Set());
    setDeleting(false);
    void reload();
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(new URL(url, window.location.origin).href);
      toast.success("链接已复制");
    } catch {
      toast.error("复制失败，请手动复制", url);
    }
  }

  if (isForbidden(error)) return <Forbidden message={error.message} />;
  const list = data?.list ?? [];

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        void upload(e.dataTransfer.files);
      }}
      className="relative"
    >
      <PageHeader
        title="媒体库"
        description="图片、视频与文档素材；支持拖拽文件到此页面上传。"
        actions={
          <>
            {selected.size > 0 && (
              <>
                <button type="button" className={btnCls("ghost")} onClick={() => setSelected(new Set())}>
                  取消选择
                </button>
                <button type="button" onClick={() => void batchDelete()} disabled={deleting} className={btnCls("danger")}>
                  <Trash2 aria-hidden="true" />
                  {deleting ? "删除中…" : `删除选中（${selected.size}）`}
                </button>
              </>
            )}
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className={btnCls("primary")}>
              <Upload aria-hidden="true" />
              {uploading ? "上传中…" : "上传文件"}
            </button>
            <input
              ref={fileRef}
              type="file"
              multiple
              aria-label="选择要上传的文件"
              accept="image/*,video/mp4,application/pdf"
              className="hidden"
              onChange={(e) => void upload(e.target.files)}
            />
          </>
        }
      />

      {dragOver && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-mgr-card border-2 border-dashed border-mgr-primary bg-mgr-primary-soft/80 text-[14px] font-medium text-mgr-primary">
          松开鼠标上传文件
        </div>
      )}

      {error ? (
        <div className={cardCls}>
          <ErrorState message={error.message} onRetry={reload} />
        </div>
      ) : loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6" role="status" aria-busy="true" data-testid="page-skeleton">
          <span className="sr-only">加载中…</span>
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className={`${cardCls} p-2`}>
              <Bone className="h-24 w-full" />
              <Bone className="mt-2 h-3 w-3/4" />
            </div>
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className={cardCls}>
          <EmptyState
            title="媒体库还是空的"
            description="上传图片或文档后，可在文章、轮播图等处引用。"
            action={
              <button type="button" onClick={() => fileRef.current?.click()} className={btnCls("primary")}>
                <Upload aria-hidden="true" />
                上传文件
              </button>
            }
          />
        </div>
      ) : (
        <ul className={`grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 ${refreshing ? "opacity-60" : ""}`}>
          {list.map((m) => {
            const isImage = m.mimeType.startsWith("image/");
            const checked = selected.has(m.id);
            return (
              <li key={m.id} className={`group ${cardCls} relative p-2 transition-colors ${checked ? "border-mgr-primary ring-2 ring-mgr-primary/20" : ""}`}>
                <label className="block cursor-pointer">
                  <input
                    type="checkbox"
                    aria-label={`选择 ${m.filename}`}
                    className="absolute left-3 top-3 z-[1] h-4 w-4 accent-[var(--mgr-primary)]"
                    checked={checked}
                    onChange={(e) => {
                      const next = new Set(selected);
                      if (e.target.checked) next.add(m.id);
                      else next.delete(m.id);
                      setSelected(next);
                    }}
                  />
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.url} alt={m.filename} loading="lazy" className="h-24 w-full rounded-mgr-control bg-mgr-subtle object-cover" />
                  ) : (
                    <div className="flex h-24 flex-col items-center justify-center gap-1 rounded-mgr-control bg-mgr-subtle text-[11px] text-mgr-muted-fg">
                      {m.mimeType ? <FileText className="h-6 w-6" aria-hidden="true" /> : <ImageOff className="h-6 w-6" aria-hidden="true" />}
                      {m.mimeType}
                    </div>
                  )}
                  <p className="mt-1.5 truncate text-[12px] font-medium" title={m.filename}>{m.filename}</p>
                  <p className="text-[11px] text-mgr-muted-fg">{formatSize(m.size)}</p>
                </label>
                <button
                  type="button"
                  aria-label={`复制 ${m.filename} 的链接`}
                  onClick={() => void copy(m.url)}
                  className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-mgr-control bg-mgr-surface/90 text-mgr-muted-fg opacity-0 shadow-mgr-sm transition-opacity hover:text-mgr-fg focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {data && !error && list.length > 0 && <Pagination page={page} totalPages={data.pagination.totalPages} total={data.pagination.total} onChange={setPage} />}
    </div>
  );
}
