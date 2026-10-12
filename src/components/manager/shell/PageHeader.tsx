/**
 * 页面骨架首段 PageHeader（P02 设计系统；P05/P07 页面统一使用）：标题 + 描述 + 主操作区。
 * 骨架顺序：PageHeader → 筛选栏 → 内容（DataTable/表单/卡片）→ 分页。
 */
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[24px] font-semibold leading-tight tracking-tight text-mgr-fg">{title}</h1>
        {description && <p className="mt-1 text-[13px] text-mgr-muted-fg">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
