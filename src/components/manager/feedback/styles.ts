/**
 * 管理端反馈/表单基础样式（P05）：统一按钮、输入框类名，全部基于 P02 的 mgr-* 令牌。
 * P07 将把它们提升为标准组件（Button/Input），此处仅保证 P05 页面视觉一致。
 */
import { buttonClass } from "@/components/manager/ui/button-class";

export const btn = {
  base: "inline-flex h-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-mgr-control px-3.5 text-[13px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-60 [&_svg]:h-4 [&_svg]:w-4",
  primary: "bg-mgr-primary text-mgr-primary-fg shadow-mgr-sm hover:bg-mgr-primary-hover",
  secondary: "border border-mgr-border bg-mgr-surface text-mgr-fg shadow-mgr-sm hover:bg-mgr-subtle",
  danger: "bg-mgr-danger text-white shadow-mgr-sm hover:opacity-90",
  ghost: "text-mgr-muted-fg hover:bg-mgr-subtle hover:text-mgr-fg",
  sm: "h-11 px-2.5 text-[12px]",
} as const;

/** P07：与标准 Button 组件共用同一套类名（buttonClass），确保命令式弹窗与页面按钮一致 */
export function btnCls(variant: "primary" | "secondary" | "danger" | "ghost" = "secondary", size?: "sm") {
  return buttonClass(variant, size === "sm" ? "sm" : "md");
}

/** 行内文字操作（表格操作列） */
export const linkAction = {
  base: "inline-flex items-center rounded-sm px-1 text-[13px] font-medium transition-colors hover:underline underline-offset-4 disabled:opacity-50",
  primary: "text-mgr-primary",
  muted: "text-mgr-muted-fg hover:text-mgr-fg",
  danger: "text-mgr-danger",
} as const;

export function linkCls(variant: "primary" | "muted" | "danger" = "primary") {
  return `${linkAction.base} ${linkAction[variant]}`;
}

export const inputCls =
  "h-11 w-full rounded-mgr-control border border-mgr-border bg-mgr-surface px-3 text-[13px] text-mgr-fg shadow-mgr-sm placeholder:text-mgr-muted-fg transition-colors focus:border-mgr-primary focus:outline-none focus:ring-2 focus:ring-mgr-primary/20 aria-[invalid=true]:border-mgr-danger aria-[invalid=true]:ring-mgr-danger/20 disabled:opacity-60";

export const cardCls = "rounded-mgr-card border border-mgr-border bg-mgr-surface shadow-mgr-sm";
