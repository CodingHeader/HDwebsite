"use client";

/** ImageField（P07）：URL 输入 + 上传 + 从媒体库选择 + 预览 */
import { useRef, useState } from "react";
import { FolderOpen, Upload, X } from "lucide-react";
import { Input } from "@/components/manager/ui/input";
import { Button, IconButton } from "@/components/manager/ui/button";
import type { FieldA11y } from "@/components/manager/ui/form-field";
import { toast } from "@/components/manager/feedback/toast";
import dynamic from "next/dynamic";

// W2-04 减包：MediaPicker（媒体库选择弹窗 + 列表拉取）只在点「从媒体库选择」时才需要，
// 改为懒加载；它有 125 行且会引入列表/分页/图片预览逻辑，不再进表单首屏。
const MediaPicker = dynamic(() => import("./MediaPicker").then((m) => m.MediaPicker), {
  ssr: false,
});
import { uploadFile } from "./upload";

export function ImageField({ a11y, value, onChange, placeholder }: { a11y: FieldA11y; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [uploading, setUploading] = useState(false);
  const [picking, setPicking] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="预览" className="h-9 w-9 shrink-0 rounded-mgr-control border border-mgr-border bg-mgr-subtle object-cover" />
        ) : null}
        <Input {...a11y} value={value} placeholder={placeholder ?? "/uploads/… 或 https://"} onChange={(e) => onChange(e.target.value)} />
        {value && (
          <IconButton label="清除图片" size="sm" onClick={() => onChange("")}>
            <X />
          </IconButton>
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        <Button size="md" icon={<FolderOpen />} onClick={() => setPicking(true)}>
          媒体库
        </Button>
        <Button
          size="md"
          icon={<Upload />}
          loading={uploading}
          onClick={() => fileRef.current?.click()}
        >
          上传
        </Button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label="选择图片文件"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setUploading(true);
          try {
            onChange(await uploadFile(f));
            toast.success("上传成功");
          } catch (err) {
            toast.error("上传失败", err instanceof Error ? err.message : undefined);
          } finally {
            setUploading(false);
          }
        }}
      />
      <MediaPicker
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(url) => {
          onChange(url);
          setPicking(false);
        }}
      />
    </div>
  );
}
