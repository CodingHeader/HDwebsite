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

// 二级菜单数据 - 关于我们 (3项, 9交互点)
const aboutSubmenu = [
  { id: "SUB-002-001", label: "学校简介", href: "/about/intro" },
  { id: "SUB-002-002", label: "公司动态", href: "/about/news" },
  { id: "SUB-002-003", label: "名师推荐", href: "/about/teachers" },
];

// 二级菜单数据 - 学历提升 (3项, 9交互点) - 已剔除考研
const educationSubmenu = [
  { id: "003-010", label: "自学考试", href: "/courses/self-study" },
  { id: "003-011", label: "成人高考", href: "/courses/adult-exam" },
  { id: "003-012", label: "开放大学", href: "/courses/open-university" },
];

const universitySubmenu = [
  { id: "003-014", label: "四川大学", href: "/partners/sichuan-university" },
  { id: "003-015", label: "西华大学", href: "/partners/xihua" },
  { id: "003-016", label: "成都理工大学", href: "/partners/chengdu-tech" },
  { id: "003-017", label: "电子科技大学", href: "/partners/uestc" },
  { id: "003-018", label: "西南财经大学", href: "/partners/swufe" },
  { id: "003-019", label: "四川师范大学", href: "/partners/sicnu" },
  { id: "003-020", label: "内江师范学院", href: "/partners/neijiang" },
  { id: "003-021", label: "四川农业大学", href: "/partners/sau" },
  { id: "003-022", label: "成都大学", href: "/partners/chengdu-university" },
  { id: "003-023", label: "西南交通大学", href: "/partners/swjtu" },
  { id: "003-024", label: "成都信息工程大学", href: "/partners/cuit" },
  { id: "003-025", label: "成都师范学院", href: "/partners/chengdu-normal" },
  { id: "003-026", label: "西华师范大学", href: "/partners/chnu" },
];

const majorSubmenu = [
  { id: "003-027", label: "经管类", href: "/courses/business" },
  { id: "003-028", label: "理工类", href: "/courses/technology" },
  { id: "003-029", label: "文史类", href: "/courses/humanities" },
  { id: "003-030", label: "教育类", href: "/courses/education" },
  { id: "003-031", label: "医学类", href: "/courses/medicine" },
  { id: "003-032", label: "法学类", href: "/courses/law" },
  { id: "003-033", label: "艺术类", href: "/courses/art" },
  { id: "003-034", label: "其他类", href: "/courses/other" },
];

// 二级菜单数据 - 资讯中心 (10项, 30交互点) - 重构对齐克隆网站
const newsSubmenu = [
  { id: "SUB-006-001", label: "自学考试", href: "/news/self-study" },
  { id: "SUB-006-002", label: "成人高考", href: "/news/adult-exam" },
  { id: "SUB-006-003", label: "政策通知", href: "/news/policy" },
  { id: "SUB-006-004", label: "经验分享", href: "/news/experience" },
  { id: "SUB-006-005", label: "自考助学", href: "/news/self-help" },
  { id: "SUB-006-006", label: "自考资讯", href: "/news/self-info" },
  { id: "SUB-006-007", label: "成考指南", href: "/news/adult-guide" },
  { id: "SUB-006-008", label: "成考资讯", href: "/news/adult-info" },
  { id: "SUB-006-009", label: "成考干货", href: "/news/adult-tips" },
  { id: "SUB-006-010", label: "成考政策", href: "/news/adult-policy" },
];

interface NavItem {
  id: string;
  label: string;
  href: string;
  submenu?: { id: string; label: string; href: string }[];
}

const navItems: NavItem[] = [
  { id: "NAV-001", label: "网站首页", href: "/" },
  { id: "NAV-002", label: "关于我们", href: "/about", submenu: aboutSubmenu },
  { id: "NAV-003", label: "学历提升", href: "/courses", submenu: educationSubmenu },
  { id: "NAV-004", label: "热门院校", href: "/partners", submenu: universitySubmenu },
  { id: "NAV-005", label: "热门专业", href: "/courses", submenu: majorSubmenu },
  { id: "NAV-006", label: "资讯中心", href: "/news", submenu: newsSubmenu },
  { id: "NAV-007", label: "学习中心", href: "/learning" },
  { id: "NAV-008", label: "党建专栏", href: "/party" },
  { id: "NAV-009", label: "联系我们", href: "/contact" },
];

export function Navbar() {
  const pathname = usePathname();
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
