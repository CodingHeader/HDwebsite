"use client";

/**
 * Dialog / Drawer（P07）：居中对话框与右侧抽屉（移动端自动全宽）。
 * 焦点陷阱、Esc、遮罩关闭由 base-ui 提供；Portal 内重新挂 data-theme="manager" 以继承管理端令牌。
 */
import * as React from "react";
import { X } from "lucide-react";
import * as D from "./dialog-primitive";
import { cn } from "@/lib/utils";

interface BaseProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  "data-testid"?: string;
  initialFocus?: React.RefObject<HTMLElement | null>;
}

function Header({ title, description, onClose }: { title: React.ReactNode; description?: React.ReactNode; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-mgr-border px-5 py-4 sm:px-6">
      <div className="min-w-0">
        <D.Title className="text-[16px] font-semibold leading-6 text-mgr-fg">{title}</D.Title>
        <D.Description className={description ? "mt-0.5 text-[12px] leading-[18px] text-mgr-muted-fg" : "sr-only"}>
          {description ?? title}
        </D.Description>
      </div>
      <button
        type="button"
        aria-label="关闭"
        onClick={onClose}
        className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-mgr-control text-mgr-muted-fg hover:bg-mgr-subtle hover:text-mgr-fg"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  footer,
  children,
  size = "md",
  initialFocus,
  ...rest
}: BaseProps & { size?: "sm" | "md" | "lg" | "xl" }) {
  const width = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" }[size];
  return (
    <D.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <D.Portal>
        <div data-theme="manager" className="contents">
          <D.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px]" />
          <D.Content
            data-testid={rest["data-testid"] ?? "detail-dialog"}
            initialFocus={initialFocus}
            className={cn(
              "fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-32px)] w-[calc(100vw-24px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-mgr-dialog border border-mgr-border bg-mgr-surface text-mgr-fg shadow-mgr-lg outline-none",
              width
            )}
          >
            <Header title={title} description={description} onClose={onClose} />
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
            {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-mgr-border px-5 py-3.5 sm:px-6">{footer}</div>}
          </D.Content>
        </div>
      </D.Portal>
    </D.Root>
  );
}

export function Drawer({ open, onClose, title, description, footer, children, width = 560, ...rest }: BaseProps & { width?: number }) {
  return (
    <D.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <D.Portal>
        <div data-theme="manager" className="contents">
          <D.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <D.Content
            data-testid={rest["data-testid"] ?? "drawer"}
            className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-mgr-border bg-mgr-surface text-mgr-fg shadow-mgr-lg outline-none"
            style={{ maxWidth: width }}
          >
            <Header title={title} description={description} onClose={onClose} />
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
            {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-mgr-border px-5 py-3.5 sm:px-6">{footer}</div>}
          </D.Content>
        </div>
      </D.Portal>
    </D.Root>
  );
}
