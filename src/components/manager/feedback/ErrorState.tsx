"use client";

/** ErrorState（契约⑥ error）：错误说明 + "重试"按钮；重试中按钮禁用 */
import { useState } from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import { btnCls } from "./styles";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void | Promise<void>;
  compact?: boolean;
}

export function ErrorState({ title = "加载失败", message, onRetry, compact }: ErrorStateProps) {
  const [retrying, setRetrying] = useState(false);
  return (
    <div
      role="alert"
      data-testid="error-state"
      className={`flex flex-col items-center justify-center text-center ${compact ? "px-4 py-8" : "px-6 py-14"}`}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-mgr-primary-soft text-mgr-danger" aria-hidden="true">
        <WifiOff className="h-6 w-6" />
      </span>
      <p className="mt-4 text-[14px] font-medium text-mgr-fg">{title}</p>
      {message && <p className="mt-1 max-w-md break-words text-[13px] text-mgr-muted-fg">{message}</p>}
      {onRetry && (
        <button
          type="button"
          data-testid="error-retry"
          className={`${btnCls("secondary")} mt-5`}
          disabled={retrying}
          onClick={async () => {
            setRetrying(true);
            try {
              await onRetry();
            } finally {
              setRetrying(false);
            }
          }}
        >
          <RefreshCw className={retrying ? "animate-spin" : undefined} aria-hidden="true" />
          {retrying ? "重试中…" : "重试"}
        </button>
      )}
    </div>
  );
}
