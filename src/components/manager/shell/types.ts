/** 管理端菜单树节点（/api/manager-menus 返回；权限过滤在 API 侧） */
export type MenuNode = {
  id: number;
  code: string;
  label: string;
  icon: string | null;
  path: string | null;
  badge?: string | null;
  children: MenuNode[];
};

export type FlatMenuItem = {
  code: string;
  label: string;
  path: string;
  icon: string | null;
  group: string | null;
};

/** 扁平化可导航菜单项（命令面板/面包屑共用） */
export function flattenMenus(menus: MenuNode[]): FlatMenuItem[] {
  const out: FlatMenuItem[] = [];
  for (const m of menus) {
    if (m.path) out.push({ code: m.code, label: m.label, path: m.path, icon: m.icon, group: null });
    for (const c of m.children ?? []) {
      if (c.path) out.push({ code: c.code, label: c.label, path: c.path, icon: c.icon ?? m.icon, group: m.label });
    }
  }
  return out;
}

/** 当前路径匹配的菜单项：精确匹配优先，其次最长前缀（/manager 根只精确匹配） */
export function matchMenu(items: FlatMenuItem[], pathname: string): FlatMenuItem | undefined {
  const exact = items.find((i) => i.path === pathname);
  if (exact) return exact;
  return items
    .filter((i) => i.path !== "/manager" && pathname.startsWith(i.path + "/"))
    .sort((a, b) => b.path.length - a.path.length)[0];
}
