"use client";

/**
 * 管理端外壳 AppShell（P02 设计系统）
 * - 左侧 Sidebar 240px（可折叠 64px，持久化）；<lg 断点改为左侧抽屉（Radix Dialog：焦点陷阱/Esc/遮罩关闭）
 * - 顶栏 56px：面包屑 + 命令面板（Ctrl/⌘+K）+ 通知入口 + 用户菜单（密度切换持久化）
 * - 内容区最大宽 1440px、页边距 24px
 * 页面骨架（P05/P07 使用）：PageHeader → 筛选栏 → 内容（DataTable/表单/卡片）→ 分页。
 */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import * as Dialog from "@/components/manager/ui/dialog-primitive";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { CommandPalette } from "./CommandPalette";
import { usePref } from "./usePref";
import { flattenMenus, type MenuNode } from "./types";
import type { Density } from "./UserMenu";

const DENSITIES = ["comfortable", "compact"] as const;
const COLLAPSE = ["0", "1"] as const;

interface AppShellProps {
  menus: MenuNode[];
  pathname: string;
  userName: string;
  userRole?: string;
  siteName?: string;
  onLogout: () => void;
  children: ReactNode;
}

export function AppShell({ menus, pathname, userName, userRole, siteName, onLogout, children }: AppShellProps) {
  const [collapsedPref, setCollapsedPref] = usePref("hd-mgr-sidebar-collapsed", "0", COLLAPSE);
  const [density, setDensity] = usePref<Density>("hd-mgr-density", "comfortable", DENSITIES);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const collapsed = collapsedPref === "1";
  const flat = useMemo(() => flattenMenus(menus), [menus]);

  // 全局快捷键：Ctrl/⌘ + K 打开命令面板
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div data-density={density} className="flex min-h-screen bg-mgr-bg text-mgr-fg">
      {/* 跳到主内容（键盘用户） */}
      <a
        href="#mgr-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[70] focus:rounded-mgr-control focus:bg-mgr-surface focus:px-3 focus:py-2 focus:shadow-mgr-lg"
      >
        跳到主内容
      </a>

      {/* 桌面侧栏 */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 border-r border-mgr-border transition-[width] duration-200 lg:block",
          collapsed ? "w-[var(--mgr-sidebar-w-collapsed)]" : "w-[var(--mgr-sidebar-w)]"
        )}
      >
        <Sidebar
          menus={menus}
          pathname={pathname}
          collapsed={collapsed}
          siteName={siteName}
          onToggleCollapse={() => setCollapsedPref(collapsed ? "0" : "1")}
        />
      </aside>

      {/* 移动端抽屉 */}
      <Dialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
        <Dialog.Portal>
          <div data-theme="manager">
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 lg:hidden" />
            <Dialog.Content
              aria-describedby={undefined}
              className="fixed inset-y-0 left-0 z-50 w-[min(var(--mgr-sidebar-w),85vw)] border-r border-mgr-border shadow-mgr-lg outline-none lg:hidden"
            >
              <Dialog.Title className="sr-only">后台导航</Dialog.Title>
              <Dialog.Close
                aria-label="关闭导航菜单"
                className="absolute right-2 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-mgr-control text-mgr-muted-fg hover:bg-mgr-subtle"
              >
                <X className="h-4 w-4" />
              </Dialog.Close>
              <Sidebar
                menus={menus}
                pathname={pathname}
                variant="drawer"
                siteName={siteName}
                onNavigate={() => setDrawerOpen(false)}
              />
            </Dialog.Content>
          </div>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          items={flat}
          pathname={pathname}
          userName={userName}
          userRole={userRole}
          density={density}
          onDensityChange={setDensity}
          onOpenDrawer={() => setDrawerOpen(true)}
          onOpenCommand={() => setCommandOpen(true)}
          onLogout={onLogout}
        />
        <main id="mgr-main" tabIndex={-1} className="flex-1 outline-none">
          <div className="mx-auto w-full max-w-[var(--mgr-content-max)] p-4 sm:p-6">{children}</div>
        </main>
      </div>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} items={flat} />
    </div>
  );
}
