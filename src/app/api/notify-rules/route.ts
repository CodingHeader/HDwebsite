import { prisma } from "@/lib/prisma";
import { success } from "@/lib/api-response";
import { withApi } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

/** GET /api/notify-rules：规则列表（事件唯一，不提供创建/删除） */
export const GET = withApi(
  async () => {
    const rules = await prisma.notifyRule.findMany({ orderBy: { id: "asc" }, include: { template: true } });
    return success({ list: rules, pagination: { page: 1, limit: rules.length, total: rules.length, totalPages: 1 } }, "获取通知规则成功");
  },
  { permission: "notify:list", route: "notify-rules/GET", errorMessage: "获取通知规则失败" }
);
