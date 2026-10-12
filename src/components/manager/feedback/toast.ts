"use client";

/**
 * 全局 Toast（P05 / 契约⑥ success 态）：基于 @base-ui/react Toast 的模块级 manager，
 * 任意事件处理函数可直接调用 toast.success / toast.error，无需 hook。渲染见 Toaster.tsx。
 */
import { Toast } from "@base-ui/react/toast";
import { toastCopy } from "@/contracts/common";

export const toastManager = Toast.createToastManager();

export type ToastKind = "success" | "error" | "info" | "warning";

function add(type: ToastKind, title: string, description?: string, timeout?: number) {
  return toastManager.add({
    type,
    title,
    description,
    timeout: timeout ?? (type === "error" ? 6000 : 3500),
    priority: type === "error" ? "high" : "low",
  });
}

export const toast = {
  success: (title: string, description?: string) => add("success", title, description),
  error: (title: string, description?: string) => add("error", title, description),
  info: (title: string, description?: string) => add("info", title, description),
  warning: (title: string, description?: string) => add("warning", title, description),
  /** 失败统一出口：优先后端 message，缺省用兜底文案 */
  fromError: (err: unknown, fallback: string = toastCopy.failed) =>
    add("error", err instanceof Error && err.message ? err.message : fallback),
  dismiss: (id?: string) => toastManager.close(id),
};
