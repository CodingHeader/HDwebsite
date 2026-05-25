"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Search, ChevronDown, User, Settings, LogOut, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

interface User {
  id: number;
  username: string;
  nickname: string | null;
  email: string | null;
  role: {
    id: number;
    name: string;
    slug: string;
    permissions: string[];
    isSuper: boolean;
  };
}

interface HeaderProps {
  user: User;
}

// 页面标题映射
const pageTitleMap: Record<string, string> = {
  "/manager": "仪表盘",
  "/manager/courses": "课程管理",
  "/manager/news": "新闻管理",
  "/manager/students": "学员管理",
  "/manager/articles": "文章管理",
  "/manager/banners": "轮播图管理",
  "/manager/categories": "分类管理",
  "/manager/navigations": "导航管理",
  "/manager/tags": "标签管理",
  "/manager/media": "媒体管理",
  "/manager/partners": "合作院校",
  "/manager/gallery": "证书风采",
  "/manager/campus": "学院风采",
  "/manager/service-guides": "服务指南",
  "/manager/hot-majors": "热门专业",
  "/manager/users": "用户管理",
  "/manager/roles": "角色管理",
  "/manager/settings": "系统设置",
  "/manager/logs": "操作日志",
  "/manager/ai-config": "AI 配置",
  "/manager/user-actions": "埋点日志",
  "/manager/chat-history": "对话日志",
};

export function Header({ user }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const pageTitle = pageTitleMap[pathname] || "管理后台";

  return (
    <header className="h-16 bg-[#0f1117]/80 backdrop-blur-xl border-b border-white/[0.06] flex items-center justify-between px-6 shrink-0 sticky top-0 z-50">
      {/* 左侧：面包屑 + 页面标题 */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Home className="h-4 w-4" />
          <span>/</span>
          <span className="text-gray-300">管理后台</span>
          <span>/</span>
          <span className="text-white font-medium">{pageTitle}</span>
        </div>
      </div>

      {/* 右侧：搜索 + 通知 + 用户 */}
      <div className="flex items-center gap-4">
        {/* 搜索框 - 毛玻璃效果 */}
        <div className={cn(
          "relative transition-all duration-300",
          searchFocused ? "w-72" : "w-56"
        )}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="搜索..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className={cn(
              "w-full pl-10 pr-4 py-2 rounded-lg text-sm transition-all duration-200",
              "bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-gray-600",
              "focus:outline-none focus:bg-white/[0.08] focus:border-[#EF4444]/30 focus:ring-1 focus:ring-[#EF4444]/20"
            )}
          />
        </div>

        {/* 通知按钮 - 带动画 */}
        <button className="relative p-2.5 text-gray-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all duration-200">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#EF4444] rounded-full animate-pulse" />
        </button>

        {/* 用户菜单 */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200",
              showUserMenu ? "bg-white/[0.08]" : "hover:bg-white/[0.06]"
            )}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8] flex items-center justify-center">
              <span className="text-sm font-semibold text-white">{user.username[0].toUpperCase()}</span>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-white">{user.nickname || user.username}</p>
              <p className="text-[11px] text-gray-500">{user.role.name}</p>
            </div>
            <ChevronDown className={cn(
              "h-4 w-4 text-gray-500 transition-transform duration-200",
              showUserMenu && "rotate-180"
            )} />
          </button>

          {/* 下拉菜单 */}
          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-56 bg-[#1a1d27] border border-white/[0.08] rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="p-4 border-b border-white/[0.06]">
                  <p className="font-medium text-white">{user.nickname || user.username}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{user.email || "admin@example.com"}</p>
                </div>
                <div className="p-2">
                  <button className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-gray-300 hover:bg-white/[0.06] hover:text-white transition-colors text-sm">
                    <User className="h-4 w-4" />
                    个人资料
                  </button>
                  <button className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-gray-300 hover:bg-white/[0.06] hover:text-white transition-colors text-sm">
                    <Settings className="h-4 w-4" />
                    账户设置
                  </button>
                </div>
                <div className="p-2 border-t border-white/[0.06]">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      useAuthStore.getState().logout();
                      router.push("/manager/login");
                    }}
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors text-sm"
                  >
                    <LogOut className="h-4 w-4" />
                    退出登录
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
