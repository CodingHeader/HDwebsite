"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavigationItem {
  id: number;
  name: string;
  slug: string;
  link?: string | null;
  linkType: string;
  target?: string;
  icon?: string | null;
  children?: NavigationItem[];
}

interface NavigationProps {
  items?: NavigationItem[];
}

export function Navigation({ items }: NavigationProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [navigationItems, setNavigationItems] = useState<NavigationItem[]>(items || []);
  const [isLoading, setIsLoading] = useState(!items);

  // 如果没有传入items，从API获取
  useEffect(() => {
    if (items) {
      setNavigationItems(items);
      return;
    }

    async function fetchNavigations() {
      try {
        const response = await fetch("/api/navigations?tree=true&status=active&isVisible=true");
        const result = await response.json();
        if (result.code === 200) {
          setNavigationItems(result.data);
        }
      } catch (error) {
        console.error("Failed to fetch navigations:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchNavigations();
  }, [items]);

  // 判断链接是否激活
  const isActive = (item: NavigationItem): boolean => {
    if (item.linkType === "dropdown" && item.children) {
      return item.children.some(child => pathname === child.link || pathname.startsWith(child.link || ""));
    }
    return pathname === item.link || pathname.startsWith(item.link || "");
  };

  // 获取链接href
  const getHref = (item: NavigationItem): string => {
    if (item.link) return item.link;
    if (item.children && item.children.length > 0) {
      return item.children[0].link || "#";
    }
    return "#";
  };

  // 渲染导航项
  const renderNavItem = (item: NavigationItem) => {
    const hasChildren = item.children && item.children.length > 0;
    const active = isActive(item);

    if (item.linkType === "external") {
      return (
        <a
          href={item.link || "#"}
          target={item.target || "_blank"}
          rel="noopener noreferrer"
          className={cn(
            "inline-flex items-center px-4 py-2 text-sm font-medium transition-colors",
            "text-white/90 hover:text-white hover:bg-[#b91d1d]",
            "rounded-md"
          )}
        >
          {item.icon && <span className="mr-2">{item.icon}</span>}
          {item.name}
        </a>
      );
    }

    if (hasChildren) {
      return (
        <div
          className="relative group"
          onMouseEnter={() => setActiveDropdown(item.id)}
          onMouseLeave={() => setActiveDropdown(null)}
        >
          <button
            className={cn(
              "inline-flex items-center px-4 py-2 text-sm font-medium transition-colors",
              "text-white/90 hover:text-white hover:bg-[#b91d1d]",
              "rounded-md",
              active && "bg-[#b91d1d] text-white"
            )}
          >
            {item.icon && <span className="mr-2">{item.icon}</span>}
            {item.name}
            <ChevronDown className="ml-1 h-4 w-4" />
          </button>

          {/* 下拉菜单 */}
          <div
            className={cn(
              "absolute left-0 mt-0 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50",
              "transition-all duration-200 origin-top-left",
              activeDropdown === item.id
                ? "opacity-100 scale-100 visible"
                : "opacity-0 scale-95 invisible"
            )}
          >
            <div className="py-1">
              {item.children?.map((child) => (
                <Link
                  key={child.id}
                  href={child.link || "#"}
                  className={cn(
                    "block px-4 py-2 text-sm transition-colors",
                    pathname === child.link
                      ? "bg-[#da251d] text-white"
                      : "text-gray-700 hover:bg-gray-100 hover:text-[#da251d]"
                  )}
                >
                  {child.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <Link
        href={getHref(item)}
        className={cn(
          "inline-flex items-center px-4 py-2 text-sm font-medium transition-colors",
          "text-white/90 hover:text-white hover:bg-[#b91d1d]",
          "rounded-md",
          active && "bg-[#b91d1d] text-white"
        )}
      >
        {item.icon && <span className="mr-2">{item.icon}</span>}
        {item.name}
      </Link>
    );
  };

  // 渲染移动端导航项
  const renderMobileNavItem = (item: NavigationItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const active = isActive(item);

    return (
      <div key={item.id} className={cn("border-b border-gray-100", level > 0 && "pl-4")}>
        {item.linkType === "external" ? (
          <a
            href={item.link || "#"}
            target={item.target || "_blank"}
            rel="noopener noreferrer"
            className="block py-3 text-base font-medium text-gray-700 hover:text-[#da251d]"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            {item.name}
          </a>
        ) : hasChildren ? (
          <div>
            <div className="py-3 text-base font-medium text-gray-700">
              {item.name}
            </div>
            <div className="pb-2">
              {item.children?.map((child) => (
                <Link
                  key={child.id}
                  href={child.link || "#"}
                  className={cn(
                    "block py-2 text-sm",
                    pathname === child.link
                      ? "text-[#da251d] font-medium"
                      : "text-gray-600 hover:text-[#da251d]"
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {child.name}
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <Link
            href={getHref(item)}
            className={cn(
              "block py-3 text-base font-medium",
              active ? "text-[#da251d]" : "text-gray-700 hover:text-[#da251d]"
            )}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            {item.name}
          </Link>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <nav className="bg-[#da251d]">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-12">
            <div className="animate-pulse bg-white/20 h-4 w-32 rounded" />
            <div className="hidden md:flex space-x-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse bg-white/20 h-8 w-20 rounded" />
              ))}
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-[#da251d]">
      <div className="container mx-auto px-4">
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-1 h-12">
          {navigationItems.map((item) => (
            <div key={item.id}>{renderNavItem(item)}</div>
          ))}
        </div>

        {/* Mobile Navigation Toggle */}
        <div className="md:hidden flex items-center justify-between h-12">
          <span className="text-white font-medium">菜单</span>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-md text-white hover:bg-[#b91d1d]"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200">
            <div className="py-2">
              {navigationItems.map((item) => renderMobileNavItem(item))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
