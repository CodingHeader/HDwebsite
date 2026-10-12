"use client";

/**
 * ConfirmDialog（P05 / 替代浏览器原生 confirm / prompt 弹窗）
 * - 声明式：<ConfirmDialog open onOpenChange title description onConfirm danger />
 * - 命令式：const ok = await confirmDialog({ title, description, danger: true })；
 *          const v = await promptDialog({ title, label, validate })（null = 取消）
 *   命令式调用由 layout 中挂载的 <ConfirmHost/> 渲染（单实例队列）。
 * 键盘：Enter 确认（焦点默认落在"取消"以防误删时，需 Tab 到确认或直接点击）、Esc 取消；焦点陷阱由 Radix Dialog 提供。
 * onConfirm 返回 Promise 时按钮显示"处理中…"并禁用，失败保持对话框打开。
 */
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, HelpCircle, Info } from "lucide-react";
import { btnCls, inputCls } from "./styles";

export interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  /** 危险操作：红色确认按钮 + 警示图标，初始焦点落在"取消" */
  danger?: boolean;
  /** 仅一个"知道了"按钮（信息展示，替代原生 alert 弹窗） */
  hideCancel?: boolean;
}

interface ConfirmDialogProps extends ConfirmOptions {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  children?: ReactNode;
  confirmDisabled?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = "确定",
  cancelText = "取消",
  danger,
  hideCancel,
  children,
  confirmDisabled,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  async function handleConfirm() {
    if (busy || confirmDisabled) return;
    try {
      setBusy(true);
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <Dialog.Portal>
        <div data-theme="manager" className="contents">
          <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[1px]" />
          <Dialog.Content
            role="alertdialog"
            data-testid="confirm-dialog"
            onOpenAutoFocus={(e) => {
              if (danger && cancelRef.current) {
                e.preventDefault();
                cancelRef.current.focus();
              }
            }}
            className="fixed left-1/2 top-1/2 z-[60] w-[min(440px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-mgr-dialog border border-mgr-border bg-mgr-surface p-6 text-mgr-fg shadow-mgr-lg outline-none"
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleConfirm();
              }}
            >
              <div className="flex gap-4">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${danger ? "bg-mgr-primary-soft text-mgr-danger" : "bg-mgr-subtle text-mgr-info"}`}
                  aria-hidden="true"
                >
                  {danger ? <AlertTriangle className="h-5 w-5" /> : hideCancel ? <Info className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <Dialog.Title className="text-[16px] font-semibold leading-6">{title}</Dialog.Title>
                  {description ? (
                    <Dialog.Description asChild>
                      <div className="mt-1.5 text-[13px] leading-5 text-mgr-muted-fg">{description}</div>
                    </Dialog.Description>
                  ) : (
                    <Dialog.Description className="sr-only">{title}</Dialog.Description>
                  )}
                  {children && <div className="mt-4">{children}</div>}
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                {!hideCancel && (
                  <button type="button" ref={cancelRef} className={btnCls("secondary")} onClick={() => onOpenChange(false)} disabled={busy}>
                    {cancelText}
                  </button>
                )}
                <button
                  type="submit"
                  data-testid="confirm-ok"
                  className={btnCls(danger ? "danger" : "primary")}
                  disabled={busy || confirmDisabled}
                >
                  {busy ? "处理中…" : confirmText}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ── 命令式 API ─────────────────────────────────────────────

export interface PromptOptions extends ConfirmOptions {
  label: string;
  defaultValue?: string;
  placeholder?: string;
  inputMode?: "text" | "decimal" | "numeric";
  /** 返回错误文案则阻止提交并行内提示 */
  validate?: (value: string) => string | null;
}

type Pending =
  | { kind: "confirm"; opts: ConfirmOptions; resolve: (v: boolean) => void }
  | { kind: "prompt"; opts: PromptOptions; resolve: (v: string | null) => void };

let current: Pending | null = null;
const queue: Pending[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function push(p: Pending) {
  if (current) queue.push(p);
  else current = p;
  emit();
}

function settle() {
  current = queue.shift() ?? null;
  emit();
}

export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => push({ kind: "confirm", opts, resolve }));
}

/** 信息对话框（替代原生 alert 弹窗）：单按钮，关闭即 resolve */
export function alertDialog(opts: Omit<ConfirmOptions, "hideCancel" | "danger">): Promise<void> {
  return new Promise((resolve) =>
    push({ kind: "confirm", opts: { confirmText: "知道了", ...opts, hideCancel: true }, resolve: () => resolve() })
  );
}

export function promptDialog(opts: PromptOptions): Promise<string | null> {
  return new Promise((resolve) => push({ kind: "prompt", opts, resolve }));
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function ConfirmHost() {
  const pending = useSyncExternalStore(subscribe, () => current, () => null);
  if (!pending) return null;
  // key：每个请求独立实例，避免上一个对话框的输入残留
  return <HostDialog key={queueKey(pending)} pending={pending} />;
}

const keys = new WeakMap<Pending, number>();
let seq = 0;
function queueKey(p: Pending) {
  if (!keys.has(p)) keys.set(p, ++seq);
  return keys.get(p)!;
}

function HostDialog({ pending }: { pending: Pending }) {
  const [value, setValue] = useState(pending.kind === "prompt" ? pending.opts.defaultValue ?? "" : "");
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(true);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (pending.kind === "prompt") setTimeout(() => inputRef.current?.select(), 30);
  }, [pending.kind]);

  const close = (result: boolean) => {
    if (pending.kind === "confirm") pending.resolve(result);
    else pending.resolve(result ? value : null);
    setOpen(false);
    settle();
  };

  return (
    <ConfirmDialog
      {...pending.opts}
      open={open}
      onOpenChange={(v) => !v && close(false)}
      onConfirm={() => {
        if (pending.kind === "prompt") {
          const msg = pending.opts.validate?.(value) ?? null;
          if (msg) {
            setErr(msg);
            inputRef.current?.focus();
            return;
          }
        }
        close(true);
      }}
    >
      {pending.kind === "prompt" && (
        <div>
          <label htmlFor="mgr-prompt-input" className="mb-1.5 block text-[13px] font-medium">
            {pending.opts.label}
          </label>
          <input
            id="mgr-prompt-input"
            ref={inputRef}
            className={inputCls}
            value={value}
            inputMode={pending.opts.inputMode}
            placeholder={pending.opts.placeholder}
            aria-invalid={err ? true : undefined}
            aria-describedby={err ? "mgr-prompt-error" : undefined}
            onChange={(e) => {
              setValue(e.target.value);
              if (err) setErr(null);
            }}
          />
          {err && (
            <p id="mgr-prompt-error" role="alert" className="mt-1.5 text-[12px] text-mgr-danger">
              {err}
            </p>
          )}
        </div>
      )}
    </ConfirmDialog>
  );
}
