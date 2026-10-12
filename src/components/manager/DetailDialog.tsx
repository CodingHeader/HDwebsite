"use client";

/** DetailDialog（P05）：只读详情弹窗（Radix：焦点陷阱/Esc/遮罩关闭），可选底部操作区 */
import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

interface DetailDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

export function DetailDialog({ open, onClose, title, description, footer, children }: DetailDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <div data-theme="manager" className="contents">
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px]" />
          <Dialog.Content
            data-testid="detail-dialog"
            className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100vh-48px)] w-[calc(100vw-32px)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-mgr-dialog border border-mgr-border bg-mgr-surface text-mgr-fg shadow-mgr-lg outline-none"
          >
            <div className="flex items-start justify-between gap-4 border-b border-mgr-border px-6 py-4">
              <div className="min-w-0">
                <Dialog.Title className="text-[16px] font-semibold leading-6">{title}</Dialog.Title>
                <Dialog.Description asChild>
                  <div className={description ? "mt-0.5 text-[12px] text-mgr-muted-fg" : "sr-only"}>{description ?? title}</div>
                </Dialog.Description>
              </div>
              <Dialog.Close
                aria-label="关闭"
                className="-mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-mgr-control text-mgr-muted-fg hover:bg-mgr-subtle hover:text-mgr-fg"
              >
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
            {footer && <div className="flex justify-end gap-2 border-t border-mgr-border px-6 py-3.5">{footer}</div>}
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
