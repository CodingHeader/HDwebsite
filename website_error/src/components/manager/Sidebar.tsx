"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  LogOut,
  GraduationCap,
  Shield,
  FolderTree,
  Bot,
  MousePointerClick,
  MessageSquare,
  Tags,
  Image,
  Navigation,
  ScrollText,
  ChevronDown,
  ChevronRight,
  LucideIcon,
  BookOpen,
  Newspaper,
  FolderOpen,
  School,
  Award,
  MapPin,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks/useSettings";
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

interface SidebarProps {
  user: User;
}

interface MenuItem {
  id: number;
  code: string;
  label: string;
  icon: string;
  path: string | null;
  permission: string | null;
  children?: MenuItem[];
}

// 图标映射 - 包含所有新图标
const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  FileText,
  Navigation,
  FolderTree,
  Tags,
  Image,
  Users,
  Shield,
  Settings,
  ScrollText,
  BookOpen,
  Newspaper,
  FolderOpen,
  School,
  Award,
  MapPin,
  HelpCircle,
  Bot,
  MousePointerClick,
  MessageSquare,
};

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { getSetting } = useSettings();
  const { token, logout } = useAuthStore();
  const schoolShortName = getSetting("schoolShortName", "弘道教育");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 检查是否有权限
  const hasPermission = useCallback((permission: string | null): boolean => {
    if (!permission) return true;
    if (user.role.isSuper) return true;
    return user.role.permissions.includes(permission) ||
           user.role.permissions.includes("*") ||
           user.role.permissions.some(p => {
             const [module] = permission.split(":");
             return p === `${module}:*`;
           });
  }, [user.role]);

  // 获取菜单数据
  useEffect(() => {
    async function fetchMenus() {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/manager-menus", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.code === 200) {
            const filterMenus = (menus: MenuItem[]): MenuItem[] => {
              return menus
                .filter(item => hasPermission(item.permission))
                .map(item => ({
                  ...item,
                  children: item.children ? filterMenus(item.children) : undefined,
                }));
            };
            setMenuItems(filterMenus(result.data));
            
            // 自动展开当前激活的分组菜单
            const findActiveParent = (menus: MenuItem[]): string[] => {
              const parents: string[] = [];
              for (const menu of menus) {
                if (menu.children) {
                  if (menu.children.some(child => child.path && pathname.startsWith(child.path))) {
                    parents.push(menu.code);
                  }
                  parents.push(...findActiveParent(menu.children));
                }
              }
              return parents;
            };
            setExpandedMenus(findActiveParent(result.data));
          }
        } else if (response.status === 401) {
          // 未授权，触发登出并跳转登录页
          console.error("[Sidebar] 认证失效，跳转登录页");
          logout();
          router.push("/manager/login");
          return;
        }
      } catch (error) {
        console.error("Failed to fetch menus:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMenus();
  }, [user, token, hasPermission, pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.error("Logout error:", error);
    }
    logout();
    router.push("/manager/login");
  };

  const toggleMenu = (code: string) => {
    setExpandedMenus(prev =>
      prev.includes(code)
        ? prev.filter(c => c !== code)
        : [...prev, code]
    );
  };

  const isActive = (path: string | null): boolean => {
    if (!path) return false;
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    const Icon = iconMap[item.icon] || FileText;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedMenus.includes(item.code);
    const active = isActive(item.path);

    if (hasChildren) {
      return (
        <div key={item.id} className="space-y-0.5">
          <button
            onClick={() => toggleMenu(item.code)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 group",
              "hover:bg-white/[0.06]",
              isExpanded && "bg-white/[0.04]"
            )}
          >
            <div className="flex items-center gap-3">
              <Icon className={cn(
                "h-[18px] w-[18px] transition-colors",
                isExpanded ? "text-[#EF4444]" : "text-gray-400 group-hover:text-gray-200"
              )} />
              <span className={cn(
                "text-sm font-medium transition-colors",
                isExpanded ? "text-white" : "text-gray-300 group-hover:text-white"
              )}>{item.label}</span>
            </div>
            <div className="transition-transform duration-200">
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
              )}
            </div>
          </button>
          <div
            className={cn(
              "overflow-hidden transition-all duration-300 ease-in-out",
              isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
            )}
          >
            <div className="pl-4 space-y-0.5 border-l border-white/[0.06] ml-5">
              {item.children?.map(child => renderMenuItem(child, level + 1))}
            </div>
          </div>
        </div>
      );
    }

    if (!item.path) return null;

    return (
      <Link
        key={item.id}
        href={item.path}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
          level > 0 && "ml-2",
          active
            ? "bg-white/[0.08] text-white border-l-2 border-[#EF4444]"
            : "text-gray-400 hover:bg-white/[0.06] hover:text-white border-l-2 border-transparent"
        )}
      >
        <Icon className={cn(
          "h-[18px] w-[18px] transition-colors shrink-0",
          active ? "text-[#EF4444]" : "text-gray-500 group-hover:text-gray-300"
        )} />
        <span className="text-sm font-medium truncate">{item.label}</span>
      </Link>
    );
  };

  if (isLoading) {
    return (
      <aside className="w-[260px] bg-[#0f1117] border-r border-white/[0.06] min-h-screen flex flex-col shrink-0">
        <div className="p-5 border-b border-white/[0.06]">
          <div className="animate-pulse bg-white/[0.06] h-10 rounded-lg" />
        </div>
        <div className="flex-1 p-3 space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse bg-white/[0.04] h-9 rounded-lg" />
          ))}
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-[260px] bg-[#0f1117] border-r border-white/[0.06] min-h-screen flex flex-col shrink-0">
      {/* Logo区域 - 增加渐变背景和层次感 */}
      <div className="p-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#DC2626] to-[#991B1B] flex items-center justify-center shadow-lg shadow-[#DC2626]/20">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-[15px] text-white truncate">{schoolShortName}</h1>
            <p className="text-[11px] text-gray-500">后台管理系统</p>
          </div>
        </div>
      </div>

      {/* User Info - 卡片化设计 */}
      <div className="p-4 mx-4 mt-4 mb-2">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8] flex items-center justify-center shrink-0">
            <span className="text-sm font-semibold text-white">{user.username[0].toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user.nickname || user.username}</p>
            <p className="text-[11px] text-gray-500">{user.role.name}</p>
          </div>
        </div>
      </div>

      {/* Navigation - 增加分组标题 */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {menuItems.map(item => renderMenuItem(item))}
      </nav>

      {/* Logout - 优化样式 */}
      <div className="p-3 border-t border-white/[0.06]">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 group"
        >
          <LogOut className="h-[18px] w-[18px] transition-colors group-hover:text-red-400" />
          <span className="text-sm font-medium">退出登录</span>
        </button>
      </div>
    </aside>
  );
}
