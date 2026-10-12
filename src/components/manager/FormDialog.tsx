"use client";

/**
 * FormDialog（P05）：新建/编辑表单弹窗
 * - Radix Dialog：焦点陷阱、Esc 关闭、遮罩关闭；有未保存修改时关闭前二次确认（防误丢）
 * - <form> 提交：输入框内 Enter 提交；textarea 内 Ctrl/⌘+Enter 提交
 * - serverError：后端返回的失败原因在弹窗顶部以 alert 呈现（同时由调用方 toast）
 */
import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AlertCircle, X } from "lucide-react";
import { btnCls } from "@/components/manager/feedback/styles";
import { confirmDialog } from "@/components/manager/feedback/ConfirmDialog";

interface FormDialogProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  onSubmit: () => void | Promise<void>;
  saving?: boolean;
  dirty?: boolean;
  submitText?: string;
  serverError?: string;
  size?: "md" | "lg";
  children: ReactNode;
}

export function FormDialog({
  open,
  title,
  description,
  onClose,
  onSubmit,
  saving,
  dirty,
  submitText = "保存",
  serverError,
  size = "lg",
  children,
}: FormDialogProps) {
  async function requestClose() {
    if (saving) return;
    if (dirty) {
      const ok = await confirmDialog({
        title: "放弃未保存的修改？",
        description: "关闭后本次填写的内容将丢失。",
        confirmText: "放弃修改",
        cancelText: "继续编辑",
        danger: true,
      });
      if (!ok) return;
    }
    onClose();
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && void requestClose()}>
      <Dialog.Portal>
        <div data-theme="manager" className="contents">
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px]" />
          <Dialog.Content
            data-testid="form-dialog"
            className={`fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100vh-48px)] w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-mgr-dialog border border-mgr-border bg-mgr-surface text-mgr-fg shadow-mgr-lg outline-none ${size === "lg" ? "max-w-2xl" : "max-w-lg"}`}
          >
            <form
              noValidate
              className="flex min-h-0 flex-1 flex-col"
              onSubmit={(e) => {
                e.preventDefault();
                if (!saving) void onSubmit();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  if (!saving) void onSubmit();
                }
              }}
            >
              <div className="flex items-start justify-between gap-4 border-b border-mgr-border px-6 py-4">
                <div className="min-w-0">
                  <Dialog.Title className="text-[16px] font-semibold leading-6">{title}</Dialog.Title>
                  <Dialog.Description className={description ? "mt-0.5 text-[12px] text-mgr-muted-fg" : "sr-only"}>
                    {description ?? `${title}表单，带 * 为必填项`}
                  </Dialog.Description>
                </div>
                <button
                  type="button"
                  aria-label="关闭"
                  onClick={() => void requestClose()}
                  className="-mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-mgr-control text-mgr-muted-fg hover:bg-mgr-subtle hover:text-mgr-fg"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                {serverError && (
                  <div
                    role="alert"
                    data-testid="form-error"
                    className="mb-5 flex items-start gap-2 rounded-mgr-control border border-mgr-danger/30 bg-mgr-primary-soft px-3 py-2.5 text-[13px] text-mgr-danger"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="break-words">{serverError}</span>
                  </div>
                )}
                {children}
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-mgr-border px-6 py-3.5">
                <span className="hidden text-[12px] text-mgr-muted-fg sm:inline">
                  <kbd className="rounded border border-mgr-border bg-mgr-subtle px-1 font-sans">Ctrl</kbd> +{" "}
                  <kbd className="rounded border border-mgr-border bg-mgr-subtle px-1 font-sans">Enter</kbd> 保存 ·{" "}
                  <kbd className="rounded border border-mgr-border bg-mgr-subtle px-1 font-sans">Esc</kbd> 关闭
                </span>
                <div className="ml-auto flex gap-2">
                  <button type="button" className={btnCls("secondary")} onClick={() => void requestClose()} disabled={saving}>
                    取消
                  </button>
                  <button type="submit" data-testid="form-submit" className={btnCls("primary")} disabled={saving}>
                    {saving ? "保存中…" : submitText}
                  </button>
                </div>
              </div>
            </form>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
