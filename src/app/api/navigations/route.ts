/**
 * /api/navigations
 * - GET ?tree=true[&level=&status=&isVisible=]：导航树（main 口径：公开；P02 follow-up）。
 *   未登录或无 navigation:list 时强制 status=active & isVisible=true（只暴露前台可见菜单）；
 *   有 navigation:list 的管理端可按参数取全量树。返回 data 为树数组（children 递归，按 sort 升序）。
 * - GET（无 tree）：管理端分页列表（navigation:list，crud 工厂）。
 * - POST：创建（navigation:create）。
 */
import { crudList, crudCreate } from "@/lib/crud";
import { crudSpecs } from "@/lib/crud-resources";
import { prisma } from "@/lib/prisma";
import { success } from "@/lib/api-response";
import { hasPermission } from "@/lib/auth";
import { parseQuery, withApi } from "@/lib/api-handler";
import { navigationTreeQuerySchema } from "@/contracts";
import { buildNavigationTree } from "./tree";

const spec = crudSpecs["navigations"];
export const dynamic = "force-dynamic";

const treeGET = withApi(
  async ({ request, session }) => {
    const q = parseQuery(request, navigationTreeQuerySchema);
    const canSeeAll =
      !!session && hasPermission({ isSuper: session.role.isSuper, permissions: session.role.permissions }, "navigation:list");
    const where: Record<string, unknown> = {};
    if (q.level) where.level = q.level;
    if (canSeeAll) {
      if (q.status) where.status = q.status;
      if (q.isVisible) where.isVisible = q.isVisible === "true";
    } else {
      where.status = "active";
      where.isVisible = true;
    }
    const rows = await prisma.navigation.findMany({
      where,
      include: { category: { select: { id: true, name: true, slug: true } } },
      orderBy: [{ level: "asc" }, { sort: "asc" }, { id: "asc" }],
    });
    return success(buildNavigationTree(rows), "获取导航树成功");
  },
  { auth: "optional", errorMessage: "获取导航树失败", route: "navigations/GET:tree" }
);

const listGET = crudList(spec);

export async function GET(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const tree = new URL(request.url).searchParams.get("tree");
  return tree === "true" ? treeGET(request, ctx) : listGET(request, ctx);
}

export const POST = crudCreate(spec);
