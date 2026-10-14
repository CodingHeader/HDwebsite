"use client";

/**
 * MediaPicker（P07）：媒体库选择对话框——搜索、上传、点选图片回填 URL（富文本插图 / 图片字段共用）。
 */
import { useRef, useState } from "react";
import { Check, Upload } from "lucide-react";
import { Dialog } from "@/components/manager/ui/dialog";
import { Button } from "@/components/manager/ui/button";
import { SearchField } from "@/components/manager/ui/input";
import { useManagerQuery } from "@/components/manager/feedback/useManagerQuery";
import { EmptyState } from "@/components/manager/feedback/EmptyState";
import { ErrorState } from "@/components/manager/feedback/ErrorState";
import { Bone } from "@/components/manager/feedback/PageSkeleton";
import { toast } from "@/components/manager/feedback/toast";
import { Pagination } from "@/components/manager/Pagination";
import { uploadFile } from "./upload";
import { cn } from "@/lib/utils";

type MediaRow = { id: number; url: string; filename: string; mimeType: string };
type ListData = { list: MediaRow[]; pagination: { page: number; totalPages: number; total: number } };

export function MediaPicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (url: string) => void }) {
  if (!open) return null;
  return <PickerBody onClose={onClose} onPick={onPick} />;
}

function PickerBody({ onClose, onPick }: { onClose: () => void; onPick: (url: string) => void }) {
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [chosen, setChosen] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const q = useManagerQuery<ListData>(`/api/media?page=${page}&limit=18&type=image${keyword ? `&keyword=${encodeURIComponent(keyword)}` : ""}`);
  const list = q.data?.list ?? [];

  async function upload(file: File) {
    setUploading(true);
    try {
      const url = await uploadFile(file);
      toast.success("上传成功", file.name);
      onPick(url);
    } catch (e) {
      toast.error("上传失败", e instanceof Error ? e.message : undefined);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="xl"
      title="从媒体库选择图片"
      description="点选一张图片后点「使用这张图片」；也可以直接上传新图片。"
      data-testid="media-picker"
      footer={
        <>
          <Button variant="secondary" icon={<Upload />} loading={uploading} onClick={() => fileRef.current?.click()} className="mr-auto">
            上传新图片
          </Button>
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" disabled={!chosen} onClick={() => chosen && onPick(chosen)}>
            使用这张图片
          </Button>
        </>
      }
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label="上传图片文件"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = "";
        }}
      />
      <SearchField value={keyword} onChange={(v) => { setKeyword(v); setPage(1); }} placeholder="按文件名搜索…" className="mb-4 sm:w-72" />
      {q.error ? (
        <ErrorState compact message={q.error.message} onRetry={q.reload} />
      ) : q.loading ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {Array.from({ length: 12 }, (_, i) => <Bone key={i} className="aspect-square w-full" />)}
        </div>
      ) : list.length === 0 ? (
        <EmptyState compact title={keyword ? "没有匹配的图片" : "媒体库还没有图片"} description="点击左下角「上传新图片」添加。" />
      ) : (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {list.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => setChosen(m.url)}
                onDoubleClick={() => onPick(m.url)}
                aria-pressed={chosen === m.url}
                aria-label={`选择 ${m.filename}`}
                className={cn(
                  "relative block aspect-square w-full overflow-hidden rounded-mgr-control border bg-mgr-subtle",
                  chosen === m.url ? "border-mgr-primary ring-2 ring-mgr-primary/30" : "border-mgr-border hover:border-mgr-primary/50"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                {chosen === m.url && (
                  <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-mgr-primary text-white">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {q.data && q.data.pagination.totalPages > 1 && (
        <Pagination page={page} totalPages={q.data.pagination.totalPages} total={q.data.pagination.total} onChange={setPage} />
      )}
    </Dialog>
  );
}
