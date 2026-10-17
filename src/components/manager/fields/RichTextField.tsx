"use client";

/**
 * RichTextField（P07，恢复 main 的 TipTap 富文本，parity C6）——A-05 懒加载拆分后的外壳：
 * - TipTap 编辑器主体（RichTextEditorCore，含工具栏/媒体库插图）经 next/dynamic(ssr:false) 懒加载，
 *   /manager 首屏包体不因 TipTap 增长（A-05 验收：/manager/articles 首屏 JS ≤ 基线 ×1.02）
 * - 加载中显示 Skeleton 占位（契约⑥加载态）
 * - 输出 HTML；提交前由 SchemaForm 统一 sanitizeRichContent 净化（REQ-NF-002）
 */
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/manager/ui/misc";

const EditorCore = dynamic(() => import("./RichTextEditorCore"), {
  ssr: false,
  loading: () => (
    <div
      className="overflow-hidden rounded-mgr-control border border-mgr-border bg-mgr-surface shadow-mgr-sm"
      data-testid="richtext-loading"
    >
      <div className="flex flex-wrap items-center gap-0.5 border-b border-mgr-border px-2 py-1.5">
        {Array.from({ length: 10 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-8 rounded" />
        ))}
      </div>
      <Skeleton className="m-3 h-[220px]" />
    </div>
  ),
});

export function RichTextField({
  id,
  value,
  onChange,
  placeholder = "开始输入正文…",
  invalid,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  return <EditorCore id={id} value={value} onChange={onChange} placeholder={placeholder} invalid={invalid} describedBy={describedBy} />;
}
