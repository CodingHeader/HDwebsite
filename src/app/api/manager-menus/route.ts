import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { serverError, success } from "@/lib/api-response";
import { hasPermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

type MenuNode = {
  id: number;
  code: string;
  label: string;
  icon: string | null;
  path: string | null;
  level: number;
  permission: string | null;
  sort: number;
  badge: string | null;
  children: MenuNode[];
};

/** GET /api/manager-menus：后台菜单树（按当前用户权限过滤；Sidebar 表驱动渲染） */
export async function GET(request: Request) {
  const guard = await requireAuth(request);
  if (!guard.ok) return guard.response;
  const { session } = guard;

  try {
    const rows = await prisma.managerMenu.findMany({
      where: { isVisible: true },
      orderBy: [{ level: "asc" }, { sort: "asc" }],
    });

    const canSee = (permission: string | null): boolean => {
      if (!permission) return true;
      return hasPermission(
        { isSuper: session.role.isSuper, permissions: session.role.permissions },
        permission
      );
    };

    const byId = new Map<number, MenuNode>();
    for (const row of rows) {
      byId.set(row.id, {
        id: row.id,
        code: row.code,
        label: row.label,
        icon: row.icon,
        path: row.path,
        level: row.level,
        permission: row.permission,
        sort: row.sort,
        badge: row.badge,
        children: [],
      });
    }
    const tree: MenuNode[] = [];
    for (const row of rows) {
      const node = byId.get(row.id)!;
      if (row.parentId && byId.has(row.parentId)) {
        byId.get(row.parentId)!.children.push(node);
      } else {
        tree.push(node);
      }
    }
    // 过滤：父节点可见但全部子节点无权限 → 保留（父作为目录）；子节点按权限过滤
    const filterTree = (nodes: MenuNode[]): MenuNode[] =>
      nodes
        .filter((n) => canSee(n.permission))
        .map((n) => ({ ...n, children: filterTree(n.children) }));

    return success(filterTree(tree), "获取后台菜单成功");
  } catch (err) {
    console.error("[manager-menus/GET] 查询失败：", err);
    return serverError("获取后台菜单失败");
  }
}
