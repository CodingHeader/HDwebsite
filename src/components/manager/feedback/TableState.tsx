"use client";

/**
 * TableState（P05）：表格体内的非成功态——骨架 / 错误+重试 / 空。成功态返回 null，由调用方渲染数据行。
 * 无权限态不在表格内呈现，由页面整体替换为 <Forbidden/>。
 */
import type { ReactNode } from "react";
import { TableSkeleton } from "./TableSkeleton";
import { ErrorState } from "./ErrorState";
import { EmptyState } from "./EmptyState";

interface TableStateProps {
  columns: number;
  loading: boolean;
  error: Error | null;
  empty: boolean;
  onRetry?: () => void | Promise<void>;
  emptyTitle?: string;
  emptyDescription?: ReactNode;
  emptyAction?: ReactNode;
  rows?: number;
}

export function TableState({ columns, loading, error, empty, onRetry, emptyTitle, emptyDescription, emptyAction, rows }: TableStateProps) {
  if (error) {
    return (
      <tr>
        <td colSpan={columns}>
          <ErrorState compact message={error.message} onRetry={onRetry} />
        </td>
      </tr>
    );
  }
  if (loading) return <TableSkeleton columns={columns} rows={rows} />;
  if (empty) {
    return (
      <tr>
        <td colSpan={columns}>
          <EmptyState compact title={emptyTitle} description={emptyDescription} action={emptyAction} />
        </td>
      </tr>
    );
  }
  return null;
}
