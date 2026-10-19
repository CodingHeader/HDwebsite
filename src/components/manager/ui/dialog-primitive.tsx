"use client";

/**
 * 对话框原语（P07）：base-ui Dialog 的薄封装（依赖统一到 base-ui，旧 Radix 方案已移除）。
 * 提供 Root/Portal/Overlay/Content/Title/Description/Close，保留焦点陷阱、Esc 关闭、遮罩关闭。
 * 管理端组件（Dialog/Drawer/FormDialog/ConfirmDialog/DetailDialog/AppShell 抽屉/命令面板）均基于此。
 */
import * as React from "react";
import { Dialog as Base } from "@base-ui/react/dialog";

type RootProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
};

export function Root({ open, onOpenChange, children }: RootProps) {
  return (
    <Base.Root open={open} onOpenChange={(v) => onOpenChange(v)}>
      {children}
    </Base.Root>
  );
}

export function Portal({ children }: { children: React.ReactNode }) {
  return <Base.Portal>{children}</Base.Portal>;
}

export function Overlay({ className }: { className?: string }) {
  return <Base.Backdrop className={className} />;
}

type ContentProps = Omit<React.HTMLAttributes<HTMLDivElement>, "children"> & {
  children: React.ReactNode;
  /** 初始焦点元素（危险操作把焦点落在"取消"） */
  initialFocus?: React.RefObject<HTMLElement | null>;
  "data-testid"?: string;
};

export function Content({ children, className, initialFocus, ...rest }: ContentProps) {
  return (
    <Base.Popup className={className} initialFocus={initialFocus} {...(rest as Record<string, unknown>)}>
      {children}
    </Base.Popup>
  );
}

export function Title({ className, children }: { className?: string; children: React.ReactNode }) {
  return <Base.Title className={className}>{children}</Base.Title>;
}

export function Description({ className, children }: { className?: string; children: React.ReactNode }) {
  return <Base.Description className={className} render={<div />}>{children}</Base.Description>;
}

export function Close({ className, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Base.Close className={className} {...rest}>
      {children}
    </Base.Close>
  );
}
