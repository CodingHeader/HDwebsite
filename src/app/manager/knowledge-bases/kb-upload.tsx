"use client";

/**
 * 知识库文件上传（E-04，ADR-025）：拖拽 + 文件选择
 * - 白名单前端拦截：扩展名（KB_FILE_EXTS）→ 非法文件**不发请求**并显示 KB_REJECT_MESSAGE（与后端 400 同款中文提示）
 * - 大小（KB_MAX_FILE_BYTES 10MB）与数量（KB_MAX_FILES_PER_UPLOAD 10）前端拦截
 * - 合法文件 → POST /api/knowledge-bases/{baseId}/files（multipart，字段 KB_UPLOAD_FIELD）
 * - 契约唯一源：src/contracts/kb.ts（C 线端点；C-06 未合并前由组件测试 mock 覆盖）
 */
import { useCallback, useRef, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import {
  KB_FILE_EXTS,
  KB_MAX_FILE_BYTES,
  KB_MAX_FILES_PER_UPLOAD,
  KB_REJECT_MESSAGE,
  KB_UPLOAD_FIELD,
  kbFileExtOf,
  isAllowedKbExt,
} from "@/contracts/kb";
import { btnCls, toast } from "@/components/manager/feedback";

type Reject = { name: string; reason: string };

export function KbUpload({ baseId, onUploaded }: { baseId: number; onUploaded: () => void }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [rejects, setRejects] = useState<Reject[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      const bad: Reject[] = [];
      const ok: File[] = [];
      for (const f of files) {
        const ext = kbFileExtOf(f.name);
        if (!isAllowedKbExt(ext)) {
          bad.push({ name: f.name, reason: KB_REJECT_MESSAGE });
        } else if (f.size > KB_MAX_FILE_BYTES) {
          bad.push({ name: f.name, reason: `单文件上限 ${KB_MAX_FILE_BYTES / 1024 / 1024}MB` });
        } else {
          ok.push(f);
        }
      }
      if (ok.length > KB_MAX_FILES_PER_UPLOAD) {
        bad.push({ name: `共 ${ok.length} 个文件`, reason: `单次最多 ${KB_MAX_FILES_PER_UPLOAD} 个` });
        ok.length = 0;
      }
      setRejects(bad);
      if (ok.length === 0) return;

      setUploading(true);
      try {
        const form = new FormData();
        for (const f of ok) form.append(KB_UPLOAD_FIELD, f);
        // multipart：不能用 managerFetch（默认 JSON Content-Type 会破坏 boundary），原生 fetch + Bearer token
        const token = useAuthStore.getState().token;
        const res = await fetch(`/api/knowledge-bases/${baseId}/files`, {
          method: "POST",
          body: form,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const body = (await res.json().catch(() => null)) as { code: number; message?: string } | null;
        if (!res.ok || !body || body.code !== 200) {
          throw new Error(body?.message ?? `上传失败（${res.status}）`);
        }
        toast.success("上传完成", `${ok.length} 个文件已入库，处理进度见文件列表`);
        onUploaded();
      } catch (e) {
        toast.error("上传失败", e instanceof Error ? e.message : "上传失败");
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [baseId, onUploaded]
  );

  return (
    <div className="flex flex-col gap-2">
      <div
        role="button"
        tabIndex={0}
        aria-label="上传知识库文件"
        data-testid="kb-upload"
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-mgr-control border-2 border-dashed px-6 py-8 text-center transition-colors ${
          dragging ? "border-mgr-primary bg-mgr-primary-soft" : "border-mgr-border"
        }`}
      >
        {uploading ? <Loader2 aria-hidden="true" className="h-6 w-6 animate-spin text-mgr-primary" /> : <FileUp aria-hidden="true" className="h-6 w-6 text-mgr-muted-fg" />}
        <p className="text-sm font-medium">{uploading ? "上传中…" : "拖拽文件到此处，或点击选择"}</p>
        <p className="text-xs text-mgr-muted-fg">
          支持 {KB_FILE_EXTS.map((e) => `.${e}`).join(" / ")}，单文件 ≤10MB，单次 ≤{KB_MAX_FILES_PER_UPLOAD} 个
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={KB_FILE_EXTS.map((e) => `.${e}`).join(",")}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void handleFiles(e.target.files);
          }}
        />
      </div>

      {rejects.length > 0 && (
        <div role="alert" data-testid="kb-upload-reject" className="rounded-mgr-control border border-mgr-danger/30 bg-mgr-danger-soft px-3 py-2 text-[13px] text-mgr-danger">
          <p className="font-medium">{KB_REJECT_MESSAGE}</p>
          <ul className="mt-1 list-inside list-disc">
            {rejects.map((r, i) => (
              <li key={i}>
                {r.name}：{r.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button type="button" onClick={() => inputRef.current?.click()} className={`${btnCls("secondary")} self-start`} disabled={uploading}>
        选择文件
      </button>
    </div>
  );
}
