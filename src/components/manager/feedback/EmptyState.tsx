/** EmptyState（契约⑥ empty）：图标 + 标题 + 说明 + 可选主操作 */
import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  compact?: boolean;
}

export function EmptyState({ title = "暂无数据", description, action, icon, compact }: EmptyStateProps) {
  return (
    <div
      data-testid="empty-state"
      className={`flex flex-col items-center justify-center text-center ${compact ? "px-4 py-8" : "px-6 py-14"}`}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-mgr-subtle text-mgr-muted-fg" aria-hidden="true">
        {icon ?? <Inbox className="h-6 w-6" />}
      </span>
      <p className="mt-4 text-[14px] font-medium text-mgr-fg">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] text-mgr-muted-fg">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
