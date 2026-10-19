/**
 * 主导航数据适配层（P02）：Navigation 表（level=1 + children）→ main Navbar 的 NavItem[]。
 * - DB 决定一级菜单的显示、顺序、文案与链接（status=active 且 isVisible）。
 * - 二级菜单：DB 有子项用 DB；DB 未录入时，按同名一级菜单回落 main 原静态二级菜单（main 视觉/交互不丢）。
 * - DB 无任何一级菜单 → 返回空数组，Navbar 使用 main 静态菜单兜底。
 */
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { WEB_TAGS, withWebCacheFallback } from "@/lib/cache-tags";
import { defaultNavItems, type NavItem } from "./nav-defaults";

/** 未缓存实现：主导航数据适配层（P02） */
async function getNavItemsUncached(): Promise<NavItem[]> {
  const rows = await prisma.navigation.findMany({
    where: { status: "active", isVisible: true },
    orderBy: [{ level: "asc" }, { sort: "asc" }, { id: "asc" }],
    select: { id: true, name: true, slug: true, link: true, parentId: true },
  });
  const roots = rows.filter((r) => r.parentId == null);
  if (roots.length === 0) return [];

  return roots.map((root) => {
    const fallback = defaultNavItems.find((n) => n.label === root.name);
    const dbChildren = rows
      .filter((r) => r.parentId === root.id)
      .map((c) => ({ id: `NAV-DB-${c.id}`, label: c.name, href: c.link || `/${c.slug}` }));
    const submenu = dbChildren.length > 0 ? dbChildren : fallback?.submenu;
    const href = root.link || fallback?.href || submenu?.[0]?.href || "#";
    return {
      id: fallback?.id ?? `NAV-DB-${root.id}`,
      label: root.name,
      href,
      ...(submenu && submenu.length > 0 ? { submenu } : {}),
    };
  });
}

/**
 * 主导航（D-06：以 WEB_TAGS.settings 缓存——主导航与设置同属站点框架，改导航后随设置标签一并失效）。
 * 生产/请求上下文命中缓存；非 Next 请求上下文（单测/脚本）下 unstable_cache 抛 Invariant，
 * 由 withWebCacheFallback 识别后回退未缓存实现，不影响直读。
 */
const getNavItemsCached: () => Promise<NavItem[]> = unstable_cache(getNavItemsUncached, ["web:nav-items"], {
  tags: [WEB_TAGS.settings],
  revalidate: 300,
});

export function getNavItems(): Promise<NavItem[]> {
  return withWebCacheFallback(getNavItemsCached, getNavItemsUncached);
}
