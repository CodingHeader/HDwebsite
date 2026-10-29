"use client";

/** 分页（P05）：共 N 条 + 上一页/页码窗口/下一页；单页时只显示总数 */
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  total?: number;
  onChange: (page: number) => void;
  className?: string;
}

function windowPages(page: number, totalPages: number): (number | "…")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  if (start > 2) pages.push("…");
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < totalPages - 1) pages.push("…");
  pages.push(totalPages);
  return pages;
}

const itemCls =
  "inline-flex h-11 min-w-11 items-center justify-center rounded-mgr-control px-2 text-[13px] tabular-nums transition-colors disabled:pointer-events-none disabled:opacity-40";

export function Pagination({ page, totalPages, total, onChange, className = "mt-4" }: PaginationProps) {
  return (
    <nav aria-label="分页" className={`${className} flex flex-wrap items-center justify-between gap-3 text-[13px] text-mgr-muted-fg`}>
      <span>{total !== undefined ? `共 ${total} 条` : ""}{totalPages > 1 ? ` · 第 ${page}/${totalPages} 页` : ""}</span>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button type="button" aria-label="上一页" className={`${itemCls} hover:bg-mgr-subtle`} disabled={page <= 1} onClick={() => onChange(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          {windowPages(page, totalPages).map((p, i) =>
            p === "…" ? (
              <span key={`e${i}`} className="px-1">…</span>
            ) : (
              <button
                key={p}
                type="button"
                aria-current={p === page ? "page" : undefined}
                className={`${itemCls} ${p === page ? "bg-mgr-primary-soft font-semibold text-mgr-primary" : "text-mgr-fg hover:bg-mgr-subtle"}`}
                onClick={() => onChange(p)}
              >
                {p}
              </button>
            )
          )}
          <button type="button" aria-label="下一页" className={`${itemCls} hover:bg-mgr-subtle`} disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </nav>
  );
}

/** 表格容器与单元格样式（与 TableSkeleton 行高一致） */
export const tableCls = {
  wrap: "overflow-x-auto rounded-mgr-card border border-mgr-border bg-mgr-surface shadow-mgr-sm",
  table: "w-full border-collapse text-[13px]",
  thead: "border-b border-mgr-border bg-mgr-subtle/60 text-left text-[12px] font-medium text-mgr-muted-fg",
  th: "whitespace-nowrap px-4 py-2.5 font-medium",
  tr: "border-b border-mgr-border transition-colors last:border-0 hover:bg-mgr-subtle/50",
  td: "px-4 py-2 align-middle",
} as const;
