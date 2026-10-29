"use client";

/**
 * MarkdownField（P07）：编辑 / 预览 切换（移动端）与左右分栏（≥ lg），预览使用前台同款 MarkdownRenderer。
 */
import { useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { MarkdownRenderer } from "@/components/web/MarkdownRenderer";
import { Textarea } from "@/components/manager/ui/input";
import { cn } from "@/lib/utils";
import { MediaPicker } from "./MediaPicker";
import type { FieldA11y } from "@/components/manager/ui/form-field";

export function MarkdownField({ a11y, value, onChange, rows = 14, placeholder }: { a11y: FieldA11y; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [picking, setPicking] = useState(false);
  const tab = (k: "edit" | "preview", label: string) => (
    <button
      type="button"
      aria-pressed={mode === k}
      onClick={() => setMode(k)}
      className={cn("h-11 rounded px-2.5 text-[12px] font-medium", mode === k ? "bg-mgr-surface text-mgr-fg shadow-mgr-sm" : "text-mgr-muted-fg hover:text-mgr-fg")}
    >
      {label}
    </button>
  );
  return (
    <div className="overflow-hidden rounded-mgr-control border border-mgr-border bg-mgr-surface shadow-mgr-sm">
      <div className="flex items-center justify-between gap-2 border-b border-mgr-border bg-mgr-subtle/50 px-2 py-1.5">
        <div className="flex gap-1 rounded-md bg-mgr-subtle p-0.5 lg:hidden">
          {tab("edit", "编辑")}
          {tab("preview", "预览")}
        </div>
        <span className="hidden text-[12px] text-mgr-muted-fg lg:inline">左侧编辑 · 右侧实时预览（与前台显示一致）</span>
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="inline-flex h-11 items-center gap-1 rounded px-2 text-[12px] text-mgr-muted-fg hover:bg-mgr-subtle hover:text-mgr-fg"
        >
          <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
          插入图片
        </button>
      </div>
      <div className="grid lg:grid-cols-2">
        <Textarea
          {...a11y}
          rows={rows}
          value={value}
          placeholder={placeholder ?? "支持 Markdown：# 标题、**加粗**、- 列表、[链接](https://…)"}
          onChange={(e) => onChange(e.target.value)}
          className={cn("rounded-none border-0 font-mono shadow-none focus:ring-0", mode === "preview" && "hidden lg:block")}
        />
        <div className={cn("min-h-[200px] overflow-y-auto border-mgr-border p-4 text-[14px] lg:max-h-[520px] lg:border-l", mode === "edit" && "hidden lg:block")} aria-label="Markdown 预览">
          {value.trim() ? <MarkdownRenderer content={value} /> : <p className="text-[13px] text-mgr-muted-fg">预览区：输入内容后在此查看效果。</p>}
        </div>
      </div>
      <MediaPicker
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(url) => {
          onChange(`${value}${value && !value.endsWith("\n") ? "\n" : ""}![](${url})\n`);
          setPicking(false);
        }}
      />
    </div>
  );
}
