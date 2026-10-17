"use client";

/**
 * FormDialog（P05）：新建/编辑表单弹窗
 * - base-ui Dialog：焦点陷阱、Esc 关闭、遮罩关闭；有未保存修改时关闭前二次确认（防误丢）
 * - A-03：浏览器级 beforeunload 未保存提示；快捷键 Ctrl/⌘+S 提交（保留 Ctrl/⌘+Enter 别名）
 * - <form> 提交：输入框内 Enter 提交；textarea 内 Ctrl/⌘+S 提交
 * - serverError：后端返回的失败原因在弹窗顶部以 alert 呈现（同时由调用方 toast）
 */
import type { ReactNode } from "react";
import { useEffect } from "react";
import * as Dialog from "@/components/manager/ui/dialog-primitive";
import { AlertCircle, X } from "lucide-react";
import { Button } from "@/components/manager/ui/button";
import { Kbd } from "@/components/manager/ui/misc";
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
  size?: "md" | "lg" | "xl";
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

  // A-03：浏览器级未保存提示（刷新/关闭标签页时，dirty 有未保存修改则提示；应用内关闭已有二次确认）
  useEffect(() => {
    if (!open || !dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [open, dirty]);

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && void requestClose()}>
      <Dialog.Portal>
        <div data-theme="manager" className="contents">
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px]" />
          <Dialog.Content
            data-testid="form-dialog"
            className={`fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-24px)] w-[calc(100vw-24px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-mgr-dialog border border-mgr-border bg-mgr-surface text-mgr-fg shadow-mgr-lg outline-none ${size === "xl" ? "max-w-4xl" : size === "lg" ? "max-w-2xl" : "max-w-lg"}`}
          >
            <form
              noValidate
              className="flex min-h-0 flex-1 flex-col"
              onSubmit={(e) => {
                e.preventDefault();
                if (!saving) void onSubmit();
              }}
              onKeyDown={(e) => {
                // A-03：快捷键改 Ctrl/⌘+S（保留 Ctrl/⌘+Enter 别名）；输入框内单 Enter 提交保持
                const mod = e.ctrlKey || e.metaKey;
                if (mod && (e.key === "s" || e.key === "S" || e.key === "Enter")) {
                  e.preventDefault();
                  if (!saving) void onSubmit();
                }
              }}
            >
              <div className="flex items-start justify-between gap-4 border-b border-mgr-border px-5 py-4 sm:px-6">
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
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
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
              <div className="flex items-center justify-between gap-3 border-t border-mgr-border px-5 py-3.5 sm:px-6">
                <span className="hidden text-[12px] text-mgr-muted-fg sm:inline">
                  <Kbd>Ctrl</Kbd> + <Kbd>Enter</Kbd> 保存 · <Kbd>Esc</Kbd> 关闭
                </span>
                <div className="ml-auto flex gap-2">
                  <Button variant="secondary" onClick={() => void requestClose()} disabled={saving}>
                    取消
                  </Button>
                  <Button type="submit" variant="primary" data-testid="form-submit" disabled={saving}>
                    {saving ? "保存中…" : submitText}
                  </Button>
                </div>
              </div>
            </form>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
