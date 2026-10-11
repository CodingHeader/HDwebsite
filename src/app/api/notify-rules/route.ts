import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { serverError, success } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** GET /api/notify-rules：规则列表（事件唯一，不提供创建/删除） */
export async function GET(request: Request) {
  const guard = await requireAuth(request, "notify:list");
  if (!guard.ok) return guard.response;
  try {
    const rules = await prisma.notifyRule.findMany({ orderBy: { id: "asc" }, include: { template: true } });
    return success({ list: rules, pagination: { page: 1, limit: rules.length, total: rules.length, totalPages: 1 } }, "获取通知规则成功");
  } catch (err) {
    console.error("[notify-rules/GET] 查询失败：", err);
    return serverError("获取通知规则失败");
  }
}
