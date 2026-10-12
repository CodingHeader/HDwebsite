/** 导航树组装（纯函数，供 /api/navigations?tree=true 与测试复用） */
export type NavRow = { id: number; parentId: number | null; sort: number; [key: string]: unknown };
export type NavNode = NavRow & { children: NavNode[] };

export function buildNavigationTree(rows: NavRow[]): NavNode[] {
  const byParent = new Map<number | null, NavRow[]>();
  const ids = new Set(rows.map((r) => r.id));
  for (const r of rows) {
    // 父节点被过滤掉（如父级隐藏）时，子节点不提升为根，避免前台出现孤儿菜单
    const key = r.parentId !== null && !ids.has(r.parentId) ? -1 : r.parentId;
    const list = byParent.get(key) ?? [];
    list.push(r);
    byParent.set(key, list);
  }
  const walk = (parentId: number | null, depth: number): NavNode[] =>
    depth > 5
      ? []
      : (byParent.get(parentId) ?? [])
          .slice()
          .sort((a, b) => a.sort - b.sort || a.id - b.id)
          .map((r) => ({ ...r, children: walk(r.id, depth + 1) }));
  return walk(null, 0);
}
