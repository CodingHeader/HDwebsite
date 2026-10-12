"use client";

/**
 * 后台布局（P02 设计系统）：登录守卫 + ManagerMenu 表驱动 AppShell。
 * - 根节点 data-theme="manager"：管理端令牌作用域（前台 :root 令牌不受影响）
 * - 守卫与数据源保持不变：未登录 → /manager/login；菜单来自 /api/manager-menus（权限过滤在 API 侧）
 * - P05：全局挂载 <Toaster/>（成功/失败反馈）与 <ConfirmHost/>（命令式确认/输入对话框，替代原生弹窗）
 */
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { managerFetch } from "@/lib/manager-fetch";
import { AppShell } from "@/components/manager/shell/AppShell";
import type { MenuNode } from "@/components/manager/shell/types";
import { ConfirmHost, Toaster, toast } from "@/components/manager/feedback";

function ShellState({ text }: { text: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-mgr-bg">
      <div className="flex items-center gap-3 text-[13px] text-mgr-muted-fg" role="status" aria-live="polite">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-mgr-border border-t-mgr-primary" aria-hidden="true" />
        {text}
      </div>
    </div>
  );
}

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, hasHydrated, user, clear } = useAuthStore();
  const [menus, setMenus] = useState<MenuNode[]>([]);

  useEffect(() => {
    if (hasHydrated && !isAuthenticated && pathname !== "/manager/login") {
      router.replace("/manager/login");
    }
  }, [hasHydrated, isAuthenticated, pathname, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    managerFetch<MenuNode[]>("/api/manager-menus")
      .then(setMenus)
      .catch((e: unknown) => toast.error("导航菜单加载失败", e instanceof Error ? e.message : "请刷新页面重试"));
  }, [isAuthenticated]);

  const logout = () => {
    clear();
    router.replace("/manager/login");
  };

  let content: React.ReactNode;
  if (pathname === "/manager/login") content = children;
  else if (!hasHydrated) content = <ShellState text="加载中…" />;
  else if (!isAuthenticated) content = <ShellState text="正在跳转登录…" />;
  else
    content = (
      <AppShell
        menus={menus}
        pathname={pathname}
        userName={user?.nickname || user?.username || "管理员"}
        userRole={user?.role?.name}
        onLogout={logout}
      >
        {children}
      </AppShell>
    );

  return (
    <div data-theme="manager" className="min-h-screen">
      {content}
      <Toaster />
      <ConfirmHost />
    </div>
  );
}
