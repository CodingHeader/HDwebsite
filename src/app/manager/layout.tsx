"use client";

/**
 * 后台布局守卫（骨架版）：hydration 竞态处理（hasHydrated）+ 未登录跳转
 * 完整 Sidebar/导航随 R0 基线重建（ManagerMenu 表驱动由 /api/manager-menus 提供）。
 */
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, hasHydrated, user, clear } = useAuthStore();

  useEffect(() => {
    if (hasHydrated && !isAuthenticated && pathname !== "/manager/login") {
      router.replace("/manager/login");
    }
  }, [hasHydrated, isAuthenticated, pathname, router]);

  if (pathname === "/manager/login") {
    return <>{children}</>;
  }

  if (!hasHydrated) {
    return <div className="p-10 text-muted">加载中…</div>;
  }

  if (!isAuthenticated) {
    return <div className="p-10 text-muted">正在跳转登录…</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-6">
            <Link href="/manager" className="font-bold">管理后台</Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/manager" className="hover:text-primary">仪表盘</Link>
              <Link href="/manager/articles" className="hover:text-primary">文章管理</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted">{user?.nickname || user?.username}</span>
            <button
              onClick={() => {
                clear();
                router.replace("/manager/login");
              }}
              className="text-muted hover:text-primary"
            >
              退出
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
