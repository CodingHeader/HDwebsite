"use client";

/** 管理端顶栏（P02）：56px；移动端菜单按钮 + 面包屑 + 全局搜索（命令面板）+ 通知入口 + 用户菜单 */
import Link from "next/link";
import { Bell, Menu, Search } from "lucide-react";
import { Breadcrumbs } from "./Breadcrumbs";
import { UserMenu, type Density } from "./UserMenu";
import type { FlatMenuItem } from "./types";

interface TopbarProps {
  items: FlatMenuItem[];
  pathname: string;
  userName: string;
  userRole?: string;
  density: Density;
  onDensityChange: (d: Density) => void;
  onOpenDrawer: () => void;
  onOpenCommand: () => void;
  onLogout: () => void;
}

export function Topbar({
  items,
  pathname,
  userName,
  userRole,
  density,
  onDensityChange,
  onOpenDrawer,
  onOpenCommand,
  onLogout,
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-[var(--mgr-topbar-h)] shrink-0 items-center gap-3 border-b border-mgr-border bg-mgr-surface/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-mgr-surface/80 lg:px-6">
      <button
        type="button"
        onClick={onOpenDrawer}
        aria-label="打开导航菜单"
        className="-ml-1 flex h-11 w-11 items-center justify-center rounded-mgr-control text-mgr-fg hover:bg-mgr-subtle lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1">
        <Breadcrumbs items={items} pathname={pathname} />
      </div>

      <button
        type="button"
        onClick={onOpenCommand}
        aria-label="搜索后台页面（Ctrl+K）"
        className="flex h-11 items-center gap-2 rounded-mgr-control border border-mgr-border bg-mgr-bg px-2.5 text-[13px] text-mgr-muted-fg hover:border-mgr-fg/20 hover:text-mgr-fg sm:w-56"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
        <span className="hidden flex-1 text-left sm:inline">搜索页面…</span>
        <kbd className="hidden rounded border border-mgr-border bg-mgr-surface px-1.5 text-[11px] sm:inline">Ctrl K</kbd>
      </button>

      <Link
        href="/manager/notify-records"
        aria-label="通知记录"
        className="flex h-11 w-11 items-center justify-center rounded-mgr-control text-mgr-muted-fg hover:bg-mgr-subtle hover:text-mgr-fg"
      >
        <Bell className="h-[18px] w-[18px]" />
      </Link>

      <UserMenu
        name={userName}
        role={userRole}
        density={density}
        onDensityChange={onDensityChange}
        onLogout={onLogout}
      />
    </header>
  );
}
