/**
 * GET /api/logs：操作日志查询（log:list；main parity B12/C5）
 * 筛选：module / action / username（模糊）/ keyword（用户、模块、对象）/ startDate~endDate；分页信封。
 */
import { prisma } from "@/lib/prisma";
import { success } from "@/lib/api-response";
import { parseQuery, withApi } from "@/lib/api-handler";
import { operationLogQuerySchema } from "@/contracts";

export const dynamic = "force-dynamic";

export const GET = withApi(
  async ({ request }) => {
    const q = parseQuery(request, operationLogQuerySchema);
    const where: Record<string, unknown> = {};
    if (q.module) where.module = q.module;
    if (q.action) where.action = q.action;
    if (q.username) where.username = { contains: q.username };
    if (q.keyword) {
      where.OR = [
        { username: { contains: q.keyword } },
        { module: { contains: q.keyword } },
        { title: { contains: q.keyword } },
      ];
    }
    if (q.startDate || q.endDate) {
      where.createdAt = { ...(q.startDate && { gte: q.startDate }), ...(q.endDate && { lte: q.endDate }) };
    }
    const [list, total] = await Promise.all([
      prisma.operationLog.findMany({
        where,
        orderBy: [{ id: "desc" }],
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      prisma.operationLog.count({ where }),
    ]);
    return success(
      { list, pagination: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) } },
      "获取操作日志成功"
    );
  },
  { permission: "log:list", errorMessage: "获取操作日志失败", route: "logs/GET" }
);
