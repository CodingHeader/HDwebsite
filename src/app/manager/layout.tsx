"use client";

/**
 * 后台布局：登录守卫 + ManagerMenu 表驱动侧边栏（分组折叠 + 权限过滤在 API 侧）
 */
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import * as Lucide from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { managerFetch } from "@/lib/manager-fetch";

type MenuNode = {
  id: number; code: string; label: string; icon: string | null; path: string | null;
  children: MenuNode[];
};

function MenuIcon({ name }: { name: string | null }) {
  const fallback = "Circle";
  const Icon = ((Lucide as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name ?? ""] ?? Lucide[fallback as keyof typeof Lucide]) as React.ComponentType<{ className?: string }>;
  return <Icon className="h-4 w-4" />;
}

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, hasHydrated, user, clear } = useAuthStore();
  const [menus, setMenus] = useState<MenuNode[]>([]);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (hasHydrated && !isAuthenticated && pathname !== "/manager/login") {
      router.replace("/manager/login");
    }
  }, [hasHydrated, isAuthenticated, pathname, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    managerFetch<MenuNode[]>("/api/manager-menus")
      .then((tree) => {
        setMenus(tree);
        const init: Record<string, boolean> = {};
        for (const m of tree) {
          if (m.children?.length && (pathname === m.path || m.children.some((c) => c.path && pathname.startsWith(c.path)))) {
            init[m.code] = true;
          }
        }
        setOpen(init);
      })
      .catch(() => undefined);
  }, [isAuthenticated, pathname]);

  if (pathname === "/manager/login") return <>{children}</>;
  if (!hasHydrated) return <div className="p-10 text-muted">加载中…</div>;
  if (!isAuthenticated) return <div className="p-10 text-muted">正在跳转登录…</div>;

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-56 shrink-0 border-r border-border bg-card">
        <div className="px-4 py-4 text-lg font-bold text-primary">管理后台</div>
        <nav className="px-2 pb-6">
          {menus.map((m) =>
            m.children?.length ? (
              <div key={m.code} className="mt-1">
                <button
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-background"
                  onClick={() => setOpen((o) => ({ ...o, [m.code]: !o[m.code] }))}
                >
                  <MenuIcon name={m.icon} />
                  <span className="flex-1 text-left">{m.label}</span>
                  <span className="text-muted">{open[m.code] ? "▾" : "▸"}</span>
                </button>
                {open[m.code] && (
                  <div className="ml-4 border-l border-border pl-2">
                    {m.children.map((c) => (
                      <Link
                        key={c.code}
                        href={c.path ?? "#"}
                        className={`block rounded-md px-3 py-1.5 text-sm ${
                          pathname === c.path ? "bg-primary/10 text-primary font-medium" : "text-muted hover:bg-background"
                        }`}
                      >
                        {c.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={m.code}
                href={m.path ?? "#"}
                className={`mt-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                  pathname === m.path ? "bg-primary/10 text-primary font-medium" : "font-medium hover:bg-background"
                }`}
              >
                <MenuIcon name={m.icon} />
                {m.label}
              </Link>
            )
          )}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-12 items-center justify-end border-b border-border bg-card px-6 text-sm">
          <span className="text-muted">{user?.nickname || user?.username}</span>
          <button
            onClick={() => {
              clear();
              router.replace("/manager/login");
            }}
            className="ml-4 text-muted hover:text-primary"
          >
            退出
          </button>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
