import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { serverError, success, validationError } from "@/lib/api-response";
import { listQuerySchema } from "@/contracts";

export const dynamic = "force-dynamic";

/** GET /api/collect-items：审核队列（collect:list） */
export async function GET(request: Request) {
  const guard = await requireAuth(request, "collect:list");
  if (!guard.ok) return guard.response;
  const url = new URL(request.url);
  const parsed = listQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) return validationError(parsed.error.issues);
  const { page, limit } = parsed.data;
  const status = url.searchParams.get("status");
  try {
    const where = status ? { status } : {};
    const [list, total] = await Promise.all([
      prisma.collectItem.findMany({
        where, orderBy: { id: "desc" }, skip: (page - 1) * limit, take: limit,
        include: { source: { select: { id: true, name: true } } },
      }),
      prisma.collectItem.count({ where }),
    ]);
    return success({ list, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }, "获取采集条目成功");
  } catch (err) {
    console.error("[collect-items/GET] 查询失败：", err);
    return serverError("获取采集条目失败");
  }
}
