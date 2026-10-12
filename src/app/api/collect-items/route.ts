import { prisma } from "@/lib/prisma";
import { success } from "@/lib/api-response";
import { parseQuery, withApi } from "@/lib/api-handler";
import { listQuerySchema } from "@/contracts";

export const dynamic = "force-dynamic";

/** GET /api/collect-items：审核队列（collect:list） */
export const GET = withApi(
  async ({ request }) => {
    const { page, limit } = parseQuery(request, listQuerySchema);
    const status = new URL(request.url).searchParams.get("status");
    const where = status ? { status } : {};
    const [list, total] = await Promise.all([
      prisma.collectItem.findMany({
        where, orderBy: { id: "desc" }, skip: (page - 1) * limit, take: limit,
        include: { source: { select: { id: true, name: true } } },
      }),
      prisma.collectItem.count({ where }),
    ]);
    return success({ list, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }, "获取采集条目成功");
  },
  { permission: "collect:list", route: "collect-items/GET", errorMessage: "获取采集条目失败" }
);
