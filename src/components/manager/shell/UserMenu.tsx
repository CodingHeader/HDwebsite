"use client";

/**
 * 用户菜单（P02）：账号信息、表格密度切换（舒适 44 / 紧凑 36，持久化）、前台预览、退出登录。
 * 键盘：Enter/Space 打开，Esc 关闭并回焦触发按钮，菜单项可 Tab 到达。
 */
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ExternalLink, LogOut, Rows3, Rows4 } from "lucide-react";
import { cn } from "@/lib/utils";

export type Density = "comfortable" | "compact";

interface UserMenuProps {
  name: string;
  role?: string;
  density: Density;
  onDensityChange: (d: Density) => void;
  onLogout: () => void;
}

export function UserMenu({ name, role, density, onDensityChange, onLogout }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initial = (name || "管").slice(0, 1).toUpperCase();

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-11 items-center gap-2 rounded-mgr-control px-1.5 hover:bg-mgr-subtle"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-mgr-primary text-[12px] font-semibold text-mgr-primary-fg">
          {initial}
        </span>
        <span className="hidden max-w-32 truncate text-[13px] font-medium text-mgr-fg sm:inline">{name}</span>
        <ChevronDown className="hidden h-3.5 w-3.5 text-mgr-muted-fg sm:inline" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="用户菜单"
          className="absolute right-0 top-11 z-50 w-64 rounded-mgr-card border border-mgr-border bg-mgr-surface p-1.5 shadow-mgr-lg"
        >
          <div className="px-3 py-2">
            <p className="truncate text-[14px] font-semibold text-mgr-fg">{name}</p>
            {role && <p className="text-[12px] text-mgr-muted-fg">{role}</p>}
          </div>
          <div className="my-1 h-px bg-mgr-border" />
          <p className="px-3 pb-1 pt-1.5 text-[12px] text-mgr-muted-fg">表格密度</p>
          <div className="grid grid-cols-2 gap-1 px-1.5 pb-1.5" role="group" aria-label="表格密度">
            {(
              [
                { value: "comfortable", label: "舒适", Icon: Rows3 },
                { value: "compact", label: "紧凑", Icon: Rows4 },
              ] as const
            ).map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                role="menuitemradio"
                aria-checked={density === value}
                onClick={() => onDensityChange(value)}
                className={cn(
                  "flex h-11 items-center justify-center gap-1.5 rounded-mgr-control border text-[13px]",
                  density === value
                    ? "border-mgr-primary bg-mgr-primary-soft text-mgr-primary"
                    : "border-mgr-border text-mgr-fg hover:bg-mgr-subtle"
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
          <div className="my-1 h-px bg-mgr-border" />
          <a
            role="menuitem"
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 items-center gap-2 rounded-mgr-control px-3 text-[13px] text-mgr-fg hover:bg-mgr-subtle"
          >
            <ExternalLink className="h-4 w-4 text-mgr-muted-fg" aria-hidden="true" />
            查看前台
          </a>
          <button
            role="menuitem"
            type="button"
            onClick={onLogout}
            className="flex h-11 w-full items-center gap-2 rounded-mgr-control px-3 text-[13px] text-mgr-danger hover:bg-mgr-subtle"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            退出登录
          </button>
        </div>
      )}
    </div>
  );
}
