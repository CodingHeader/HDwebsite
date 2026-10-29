/** 按钮类名（纯函数，无 "use client"，服务端/客户端组件均可引用） */
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "danger-ghost" | "link";
export type ButtonSize = "sm" | "md" | "lg";

export const buttonBase =
  "inline-flex shrink-0 select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-mgr-control font-medium transition-[color,background-color,border-color,box-shadow] duration-150 disabled:pointer-events-none disabled:opacity-55 [&_svg]:pointer-events-none [&_svg]:shrink-0";

export const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-mgr-primary text-mgr-primary-fg shadow-mgr-sm hover:bg-mgr-primary-hover active:translate-y-px",
  secondary: "border border-mgr-border bg-mgr-surface text-mgr-fg shadow-mgr-sm hover:bg-mgr-subtle active:translate-y-px",
  outline: "border border-mgr-primary/40 bg-mgr-surface text-mgr-primary hover:bg-mgr-primary-soft",
  ghost: "text-mgr-muted-fg hover:bg-mgr-subtle hover:text-mgr-fg",
  danger: "bg-mgr-danger text-white shadow-mgr-sm hover:opacity-90 active:translate-y-px",
  "danger-ghost": "text-mgr-danger hover:bg-mgr-primary-soft",
  link: "h-auto px-1 text-mgr-primary underline-offset-4 hover:underline",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-11 px-2.5 text-[12px] [&_svg]:h-3.5 [&_svg]:w-3.5",
  md: "h-11 px-3.5 text-[13px] [&_svg]:h-4 [&_svg]:w-4",
  lg: "h-11 px-4 text-[14px] [&_svg]:h-4 [&_svg]:w-4",
};

export function buttonClass(variant: ButtonVariant = "secondary", size: ButtonSize = "md", className?: string) {
  return cn(buttonBase, buttonVariants[variant], variant === "link" ? "text-[13px]" : sizes[size], className);
}

