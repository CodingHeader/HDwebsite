"use client";

/** 媒体库：上传 + 网格 + 批量删除 */
import { useCallback, useEffect, useRef, useState } from "react";
import { managerFetch } from "@/lib/manager-fetch";

type MediaRow = { id: number; url: string; filename: string; mimeType: string; size: number; createdAt: string };
type ListData = { list: MediaRow[]; pagination: { page: number; totalPages: number } };

export default function ManagerMediaPage() {
  const [data, setData] = useState<ListData | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await managerFetch<ListData>(`/api/media?page=${page}&limit=24`));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    }
  }, [page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 数据加载发生在 await 之后，属外部系统订阅
    load();
  }, [load]);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError("");
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const token = (await import("@/store/authStore")).useAuthStore.getState().token;
        const res = await fetch("/api/upload", {
          method: "POST",
          body: fd,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const body = (await res.json()) as { code: number; message: string };
        if (body.code !== 200) setError(body.message);
      }
      load();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function batchDelete() {
    if (!selected.size) return;
    if (!window.confirm(`确认删除选中的 ${selected.size} 个文件？`)) return;
    setError("");
    for (const id of selected) {
      try {
        await managerFetch(`/api/media/${id}`, { method: "DELETE" });
      } catch (e) {
        setError(e instanceof Error ? e.message : "删除失败");
      }
    }
    setSelected(new Set());
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">媒体库</h1>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button onClick={batchDelete} className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-600">
              删除选中（{selected.size}）
            </button>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            {uploading ? "上传中…" : "上传文件"}
          </button>
          <input ref={fileRef} type="file" multiple accept="image/*,video/mp4,application/pdf" className="hidden" onChange={(e) => upload(e.target.files)} />
        </div>
      </div>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {data?.list.map((m) => {
          const isImage = m.mimeType.startsWith("image/");
          const checked = selected.has(m.id);
          return (
            <div key={m.id} className={`rounded-lg border bg-card p-2 ${checked ? "border-primary" : "border-border"}`}>
              <label className="block cursor-pointer">
                <input
                  type="checkbox"
                  className="mb-1"
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
                  <img src={m.url} alt={m.filename} className="h-24 w-full rounded object-cover" />
                ) : (
                  <div className="flex h-24 items-center justify-center rounded bg-background text-xs text-muted">{m.mimeType}</div>
                )}
                <p className="mt-1 truncate text-xs" title={m.filename}>{m.filename}</p>
              </label>
            </div>
          );
        })}
      </div>
      {data && data.list.length === 0 && <p className="mt-10 text-center text-muted">暂无文件，点右上角上传。</p>}
      {data && data.pagination.totalPages > 1 && (
        <div className="mt-4 flex gap-2">
          {Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)} className={`rounded border px-3 py-1 text-sm ${p === page ? "border-primary text-primary" : "border-border text-muted"}`}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
