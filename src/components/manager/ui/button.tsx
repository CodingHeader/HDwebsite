"use client";

/**
 * Button / IconButton（P07 管理端基础件，mgr-* 令牌，仅在 [data-theme="manager"] 内使用）
 * variant：primary（主操作，每区域至多 1 个）/ secondary（次要）/ outline / ghost（工具栏）/ danger（破坏性）/ link（行内文字）
 * size：sm（表格行内/工具栏）/ md（默认）/ lg；loading 时禁用并显示转圈，aria-busy。
 */
import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { buttonBase as base, buttonVariants as variants, buttonClass, type ButtonVariant, type ButtonSize } from "./button-class";

export { buttonClass };
export type { ButtonVariant, ButtonSize };

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** 左侧图标（lucide 组件元素） */
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading, icon, className, children, disabled, type = "button", ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass(variant, size, className)}
      {...rest}
    >
      {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
});

export interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> {
  /** 必填：图标按钮必须有可读名称 */
  label: string;
  variant?: "ghost" | "secondary" | "danger-ghost";
  size?: "sm" | "md";
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, variant = "ghost", size = "md", className, children, type = "button", ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        base,
        variants[variant],
        size === "sm" ? "h-11 w-11 [&_svg]:h-3.5 [&_svg]:w-3.5" : "h-11 w-11 [&_svg]:h-4 [&_svg]:w-4",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
});

/** 链接外观的 <a>（外链/前台预览） */
export function LinkButton({
  variant = "secondary",
  size = "md",
  className,
  icon,
  children,
  ...rest
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: ButtonVariant; size?: ButtonSize; icon?: React.ReactNode }) {
  return (
    <a className={buttonClass(variant, size, className)} {...rest}>
      {icon}
      {children}
    </a>
  );
}
