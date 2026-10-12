"use client";

/**
 * 管理端侧栏（P02 设计系统）：ManagerMenu 表驱动，分组标题 + 当前项高亮 + 徽标计数位。
 * - 桌面：240px，可折叠为 64px 图标栏（折叠状态由 AppShell 持久化）；
 * - 移动端：同一组件放进抽屉（variant="drawer"），点击菜单后关闭抽屉。
 */
import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { MenuIcon } from "./MenuIcon";
import type { MenuNode } from "./types";

interface SidebarProps {
  menus: MenuNode[];
  pathname: string;
  collapsed?: boolean;
  variant?: "rail" | "drawer";
  siteName?: string;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
}

function isActivePath(pathname: string, path: string | null): boolean {
  if (!path) return false;
  if (path === "/manager") return pathname === "/manager";
  return pathname === path || pathname.startsWith(path + "/");
}

function Badge({ value, collapsed }: { value?: string | null; collapsed?: boolean }) {
  if (!value) return null;
  if (collapsed) {
    return <span className="absolute right-2 top-1.5 h-2 w-2 rounded-full bg-mgr-primary" aria-label={`${value} 条待处理`} />;
  }
  return (
    <span className="ml-auto min-w-5 rounded-full bg-mgr-primary-soft px-1.5 text-center text-[11px] font-semibold leading-5 text-mgr-primary tabular-nums">
      {value}
    </span>
  );
}

export function Sidebar({
  menus,
  pathname,
  collapsed = false,
  variant = "rail",
  siteName = "弘道教育",
  onToggleCollapse,
  onNavigate,
}: SidebarProps) {
  // 分组默认展开；用户可单独收起（仅本次会话）
  const [closedGroups, setClosedGroups] = useState<Record<string, boolean>>({});
  const isRail = variant === "rail";
  const mini = isRail && collapsed;

  const itemClass = (active: boolean) =>
    cn(
      "group relative flex h-9 items-center gap-3 rounded-mgr-control px-3 text-[13px] font-medium transition-colors",
      mini && "justify-center px-0",
      active
        ? "bg-mgr-primary-soft text-mgr-primary"
        : "text-mgr-fg/80 hover:bg-mgr-subtle hover:text-mgr-fg"
    );

  return (
    <div className="flex h-full flex-col bg-mgr-surface">
      {/* 品牌区 */}
      <div className={cn("flex h-[var(--mgr-topbar-h)] shrink-0 items-center gap-2.5 border-b border-mgr-border px-4", mini && "justify-center px-0")}>
        <Link href="/manager" onClick={onNavigate} className="flex items-center gap-2.5" aria-label={`${siteName} 管理后台首页`}>
          <span className="flex h-8 w-8 items-center justify-center rounded-mgr-control bg-mgr-primary text-sm font-bold text-mgr-primary-fg">
            {siteName.slice(0, 1)}
          </span>
          {!mini && (
            <span className="flex flex-col leading-tight">
              <span className="text-[14px] font-semibold text-mgr-fg">{siteName}</span>
              <span className="text-[12px] text-mgr-muted-fg">管理后台</span>
            </span>
          )}
        </Link>
      </div>

      {/* 菜单 */}
      <nav aria-label="后台主导航" className="flex-1 overflow-y-auto px-3 py-3">
        <ul className="space-y-0.5">
          {menus.map((m) => {
            const children = m.children ?? [];
            if (children.length === 0) {
              const active = isActivePath(pathname, m.path);
              return (
                <li key={m.code}>
                  <Link
                    href={m.path ?? "#"}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    title={mini ? m.label : undefined}
                    className={itemClass(active)}
                  >
                    <MenuIcon name={m.icon} className="h-[18px] w-[18px] shrink-0" />
                    {!mini && <span className="truncate">{m.label}</span>}
                    <Badge value={m.badge} collapsed={mini} />
                  </Link>
                </li>
              );
            }

            const groupActive = children.some((c) => isActivePath(pathname, c.path));
            const open = !closedGroups[m.code] || groupActive;

            if (mini) {
              // 图标栏：分组以分隔线 + 子项首字图标呈现，悬停显示名称
              return (
                <li key={m.code} className="pt-2">
                  <div className="mx-auto mb-1 h-px w-6 bg-mgr-border" role="separator" aria-label={m.label} />
                  <ul className="space-y-0.5">
                    {children.map((c) => {
                      const active = isActivePath(pathname, c.path);
                      return (
                        <li key={c.code}>
                          <Link
                            href={c.path ?? "#"}
                            onClick={onNavigate}
                            aria-current={active ? "page" : undefined}
                            title={`${m.label} / ${c.label}`}
                            className={itemClass(active)}
                          >
                            {c.icon ? (
                              <MenuIcon name={c.icon} className="h-[18px] w-[18px]" />
                            ) : (
                              <span className="text-[12px] font-semibold">{c.label.slice(0, 1)}</span>
                            )}
                            <Badge value={c.badge} collapsed />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            }

            return (
              <li key={m.code} className="pt-3">
                <button
                  type="button"
                  onClick={() => setClosedGroups((g) => ({ ...g, [m.code]: !g[m.code] }))}
                  aria-expanded={open}
                  className="flex w-full items-center gap-2 rounded-mgr-control px-3 py-1 text-[12px] font-semibold uppercase tracking-wide text-mgr-muted-fg hover:text-mgr-fg"
                >
                  <MenuIcon name={m.icon} className="h-3.5 w-3.5" />
                  <span className="flex-1 text-left">{m.label}</span>
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", !open && "-rotate-90")} aria-hidden="true" />
                </button>
                {open && (
                  <ul className="mt-1 space-y-0.5">
                    {children.map((c) => {
                      const active = isActivePath(pathname, c.path);
                      return (
                        <li key={c.code}>
                          <Link
                            href={c.path ?? "#"}
                            onClick={onNavigate}
                            aria-current={active ? "page" : undefined}
                            className={cn(itemClass(active), "pl-9")}
                          >
                            {active && <span className="absolute left-3 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-mgr-primary" aria-hidden="true" />}
                            <span className="truncate">{c.label}</span>
                            <Badge value={c.badge} />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* 折叠开关（仅桌面） */}
      {isRail && onToggleCollapse && (
        <div className="shrink-0 border-t border-mgr-border p-3">
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "展开侧栏" : "折叠侧栏"}
            className={cn(
              "flex h-9 w-full items-center gap-2 rounded-mgr-control px-3 text-[13px] text-mgr-muted-fg hover:bg-mgr-subtle hover:text-mgr-fg",
              mini && "justify-center px-0"
            )}
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
            {!mini && <span>折叠侧栏</span>}
          </button>
        </div>
      )}
    </div>
  );
}
