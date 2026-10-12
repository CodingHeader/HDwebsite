"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

/**
 * Layer 3: Navigation (48px品牌红底#da251d)
 * 
 * 9个一级菜单 × 3状态 = 27交互点
 * 二级菜单: 学历提升(4项×3=12) + 热门院校(13项×3=39) + 热门专业(8项×3=24) + 资讯中心(4项×3=12)
 * 总计: 27 + 12 + 39 + 24 + 12 = 114交互点 ≈ 112
 * 
 * 一级菜单:
 * 003-001: 网站首页 | 003-002: 关于我们 | 003-003: 学历提升
 * 003-004: 热门院校 | 003-005: 热门专业 | 003-006: 资讯中心
 * 003-007: 学习中心 | 003-008: 党建专栏 | 003-009: 联系我们
 */

import { defaultNavItems, type NavItem } from "./data/nav-defaults";

export type { NavItem };

interface NavbarProps {
  /** 数据驱动菜单（服务端由 Navigation 表组装）；缺省回退 main 静态菜单 */
  items?: NavItem[];
}

export function Navbar({ items }: NavbarProps = {}) {
  const pathname = usePathname();
  const navItems = items && items.length > 0 ? items : defaultNavItems;
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = (itemId: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setActiveSubmenu(itemId);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveSubmenu(null);
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <nav className="w-full bg-[#da251d] text-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="md:hidden flex items-center justify-between h-[45px]">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const hasSubmenu = item.submenu && item.submenu.length > 0;
            const isSubmenuOpen = activeSubmenu === item.id;

            return (
              <div
                key={item.id}
                className="relative"
                onMouseEnter={() => handleMouseEnter(item.id)}
                onMouseLeave={handleMouseLeave}
                data-interaction-id={item.id}
              >
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-1 px-6 py-2 text-sm font-medium tracking-wide
                    transition-colors duration-200
                    ${isActive 
                      ? "text-white border-b-2 border-white" 
                      : "text-white/90 hover:text-white"
                    }
                  `}
                >
                  {item.label}
                  {hasSubmenu && (
                    <ChevronDown 
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${isSubmenuOpen ? "rotate-180" : ""}`} 
                    />
                  )}
                </Link>

                {/* 二级菜单 */}
                {hasSubmenu && isSubmenuOpen && (
                  <div 
                    className="absolute top-full left-0 z-50 min-w-[200px] bg-white shadow-xl rounded-b-lg overflow-hidden border border-gray-200"
                    onMouseEnter={() => handleMouseEnter(item.id)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div className="py-1">
                      {item.submenu?.map((subItem) => (
                        <Link
                          key={subItem.id}
                          href={subItem.href}
                          className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          data-interaction-id={subItem.id}
                        >
                          {subItem.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="hidden md:flex items-center justify-center h-[45px]">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const hasSubmenu = item.submenu && item.submenu.length > 0;
            const isSubmenuOpen = activeSubmenu === item.id;

            return (
              <div
                key={item.id}
                className="relative"
                onMouseEnter={() => handleMouseEnter(item.id)}
                onMouseLeave={handleMouseLeave}
                data-interaction-id={item.id}
              >
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-1 px-6 py-2 text-sm font-medium tracking-wide
                    transition-colors duration-200
                    ${isActive 
                      ? "text-white border-b-2 border-white" 
                      : "text-white/90 hover:text-white"
                    }
                  `}
                >
                  {item.label}
                  {hasSubmenu && (
                    <ChevronDown 
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${isSubmenuOpen ? "rotate-180" : ""}`} 
                    />
                  )}
                </Link>

                {/* 二级菜单 */}
                {hasSubmenu && isSubmenuOpen && (
                  <div 
                    className="absolute top-full left-0 z-50 min-w-[200px] bg-white shadow-xl rounded-b-lg overflow-hidden border border-gray-200"
                    onMouseEnter={() => handleMouseEnter(item.id)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div className="py-1">
                      {item.submenu?.map((subItem) => (
                        <Link
                          key={subItem.id}
                          href={subItem.href}
                          className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          data-interaction-id={subItem.id}
                        >
                          {subItem.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
