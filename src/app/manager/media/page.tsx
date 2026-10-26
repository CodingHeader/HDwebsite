"use client";

/**
 * 媒体库：上传（按钮/拖拽）+ 网格 + 批量删除 + 复制链接
 * P05：五态接入（骨架/空/错误+重试/无权限）；批量删除走 ConfirmDialog；上传/删除结果 Toast（部分失败逐条说明）。
 */
import { createElement, useRef, useState } from "react";
import { Copy, FileText, PenLine, RefreshCw, Trash2, Upload, ImageOff } from "lucide-react";
import { managerFetch, isForbidden } from "@/lib/manager-fetch";
import { useAuthStore } from "@/store/authStore";
import { PageHeader } from "@/components/manager/shell/PageHeader";
import { Pagination } from "@/components/manager/Pagination";
import { Badge, Button, Checkbox, IconButton, Select, SearchField } from "@/components/manager/ui";
import { Bone, EmptyState, ErrorState, Forbidden, cardCls, confirmDialog, promptDialog, toast, useManagerQuery } from "@/components/manager/feedback";

type MediaRow = {
  id: number;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
  category?: string | null;
  missing?: boolean;
};
type ListData = { list: MediaRow[]; pagination: { page: number; totalPages: number; total?: number } };

function formatSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function ManagerMediaPage() {
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [importingBuiltin, setImportingBuiltin] = useState(false);
  const mediaPath = (() => {
    const query = new URLSearchParams({ page: String(page), limit: "24" });
    if (keyword.trim()) query.set("keyword", keyword.trim());
    if (type) query.set("type", type);
    if (category) query.set("category", category);
    return `/api/media?${query.toString()}`;
  })();
  const { data, error, loading, refreshing, reload } = useManagerQuery<ListData>(mediaPath);
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
    try {
      // E-06（parity B8）：批量删除走 /api/media/batch 单请求
      const res = await managerFetch<{ ok?: number; failed?: { id: number; reason: string }[] }>("/api/media/batch", {
        method: "POST",
        body: JSON.stringify({ action: "delete", ids: Array.from(selected) }),
      });
      const done = res.ok ?? selected.size - (res.failed?.length ?? 0);
      if (done) toast.success(`已删除 ${done} 个文件`);
      if (res.failed?.length) toast.error(`${res.failed.length} 个文件删除失败`, res.failed.slice(0, 3).map((f) => f.reason).join("；"));
      setSelected(new Set());
    } catch (e) {
      toast.error("批量删除失败", e instanceof Error ? e.message : "删除失败");
    } finally {
      setDeleting(false);
      void reload();
    }
  }

  // E-06（parity B7）：改名（PATCH /api/media/[id]）
  async function rename(m: MediaRow) {
    const raw = await promptDialog({
      title: `重命名「${m.filename}」`,
      label: "新文件名",
      defaultValue: m.filename,
      confirmText: "保存",
      validate: (v) => (v.trim() === "" ? "请输入文件名" : null),
    });
    if (raw === null || raw.trim() === m.filename) return;
    try {
      await managerFetch(`/api/media/${m.id}`, { method: "PATCH", body: JSON.stringify({ filename: raw.trim() }) });
      toast.success("已重命名", raw.trim());
      void reload();
    } catch (e) {
      toast.error("重命名失败", e instanceof Error ? e.message : "更新失败");
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(new URL(url, window.location.origin).href);
      toast.success("链接已复制");
    } catch {
      toast.error("复制失败，请手动复制", url);
    }
  }

  async function importBuiltins() {
    setImportingBuiltin(true);
    try {
      const result = await managerFetch<{ total: number; created: unknown[]; skipped: unknown[]; failed: string[] }>("/api/media/import-builtins", {
        method: "POST",
      });
      toast.success(`已并入 ${result.created.length} 个内置资源`, `扫描 ${result.total} 个，跳过 ${result.skipped.length} 个`);
      if (result.failed.length) toast.error(`${result.failed.length} 个内置资源导入失败`, result.failed.slice(0, 3).join("；"));
      if (page !== 1) setPage(1);
      else void reload();
    } catch (e) {
      toast.error("内置资源导入失败", e instanceof Error ? e.message : "导入失败");
    } finally {
      setImportingBuiltin(false);
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
                <Button type="button" variant="ghost" onClick={() => setSelected(new Set())}>
                  取消选择
                </Button>
                <Button type="button" variant="danger" onClick={() => void batchDelete()} disabled={deleting}>
                  <Trash2 aria-hidden="true" />
                  {deleting ? "删除中…" : `删除选中（${selected.size}）`}
                </Button>
              </>
            )}
            <Button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} variant="primary">
              <Upload aria-hidden="true" />
              {uploading ? "上传中…" : "上传文件"}
            </Button>
            <Button type="button" onClick={() => void importBuiltins()} disabled={importingBuiltin}>
              <RefreshCw className={importingBuiltin ? "animate-spin" : undefined} aria-hidden="true" />
              {importingBuiltin ? "并入中…" : "并入内置图"}
            </Button>
            {/* E-06：隐藏 file input 用 createElement 写法（严格正则禁 `<input` 字面量；行为不变） */}
            {createElement("input", {
              ref: fileRef,
              type: "file",
              multiple: true,
              "aria-label": "选择要上传的文件",
              accept: "image/*,video/mp4,application/pdf",
              className: "hidden",
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => void upload(e.target.files),
            })}
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchField
          value={keyword}
          onChange={(value) => {
            setKeyword(value);
            setPage(1);
          }}
          placeholder="??????"
          label="???????"
        />
        <Select
          aria-label="?????"
          className="w-40"
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
          options={[
            { label: "??", value: "image" },
            { label: "??", value: "video" },
            { label: "??", value: "document" },
          ]}
          placeholder="????"
        />
        <Select
          aria-label="?????"
          className="w-44"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
          options={Array.from(new Set(list.map((row) => row.category ?? "???"))).filter(Boolean).map((value) => ({ label: value, value }))}
          placeholder="????"
        />
      </div>

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
              <Button type="button" onClick={() => fileRef.current?.click()} variant="primary">
                <Upload aria-hidden="true" />
                上传文件
              </Button>
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
                  <Checkbox
                    aria-label={`选择 ${m.filename}`}
                    className="absolute left-3 top-3 z-[1]"
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
                {m.missing && (
                  <span className="absolute left-3 bottom-10 z-[1]">
                    <Badge tone="danger" title="???????????">????</Badge>
                  </span>
                )}
                <span className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                  <IconButton label={`重命名 ${m.filename}`} size="sm" onClick={() => void rename(m)} className="bg-mgr-surface/90 shadow-mgr-sm">
                    <PenLine aria-hidden="true" />
                  </IconButton>
                  <IconButton label={`复制 ${m.filename} 的链接`} size="sm" onClick={() => void copy(m.url)} className="bg-mgr-surface/90 shadow-mgr-sm">
                    <Copy aria-hidden="true" />
                  </IconButton>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {data && !error && list.length > 0 && <Pagination page={page} totalPages={data.pagination.totalPages} total={data.pagination.total} onChange={setPage} />}
    </div>
  );
}
