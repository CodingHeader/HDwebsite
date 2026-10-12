"use client";

/** Toaster：渲染全局 toast 队列（右下角，最多 4 条，Esc/关闭按钮可关，屏幕阅读器播报） */
import { Toast } from "@base-ui/react/toast";
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from "lucide-react";
import { toastManager } from "./toast";

const ICONS = {
  success: <CheckCircle2 className="h-4 w-4 text-mgr-success" aria-hidden="true" />,
  error: <XCircle className="h-4 w-4 text-mgr-danger" aria-hidden="true" />,
  warning: <TriangleAlert className="h-4 w-4 text-mgr-warning" aria-hidden="true" />,
  info: <Info className="h-4 w-4 text-mgr-info" aria-hidden="true" />,
} as const;

function ToastList() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((t) => (
    <Toast.Root
      key={t.id}
      toast={t}
      data-testid={`toast-${t.type ?? "info"}`}
      className="pointer-events-auto flex w-[min(360px,calc(100vw-32px))] items-start gap-3 rounded-mgr-card border border-mgr-border bg-mgr-surface px-4 py-3 text-mgr-fg shadow-mgr-lg transition-all duration-200 data-[ending-style]:translate-y-2 data-[ending-style]:opacity-0 data-[starting-style]:translate-y-2 data-[starting-style]:opacity-0"
    >
      <span className="mt-0.5 shrink-0">{ICONS[(t.type as keyof typeof ICONS) ?? "info"] ?? ICONS.info}</span>
      <div className="min-w-0 flex-1">
        <Toast.Title className="text-[13px] font-medium leading-5" />
        <Toast.Description className="mt-0.5 break-words text-[12px] leading-5 text-mgr-muted-fg" />
      </div>
      <Toast.Close
        aria-label="关闭通知"
        className="-mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-mgr-control text-mgr-muted-fg hover:bg-mgr-subtle hover:text-mgr-fg"
      >
        <X className="h-3.5 w-3.5" />
      </Toast.Close>
    </Toast.Root>
  ));
}

export function Toaster() {
  return (
    <Toast.Provider toastManager={toastManager} limit={4}>
      <Toast.Portal>
        <div data-theme="manager" className="contents">
          <Toast.Viewport className="pointer-events-none fixed bottom-4 right-4 z-[80] flex flex-col items-end gap-2 outline-none">
            <ToastList />
          </Toast.Viewport>
        </div>
      </Toast.Portal>
    </Toast.Provider>
  );
}
