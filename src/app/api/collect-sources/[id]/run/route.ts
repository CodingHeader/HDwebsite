import { prisma } from "@/lib/prisma";
import { error, notFound, success } from "@/lib/api-response";
import { parseId, withApi } from "@/lib/api-handler";
import { runSource } from "@/lib/collect-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/collect-sources/[id]/run：立即执行采集（collect:edit；cron 为空的"仅手动"源也可执行） */
export const POST = withApi<{ id: string }>(
  async ({ params }) => {
    const id = parseId(params.id);
    const source = await prisma.collectSource.findUnique({ where: { id } });
    if (!source) return notFound("采集源不存在");
    try {
      const stat = await runSource(source);
      return success(stat, `采集完成：新增 ${stat.newCount}，跳过 ${stat.skipCount}`);
    } catch (err) {
      // 目标站点不可达/解析失败：502 + 明确信息（任务已记 failed；不触发 system_error）
      return error(err instanceof Error ? err.message : "采集执行失败", 502);
    }
  },
  { permission: "collect:edit", route: "collect-sources/run", errorMessage: "采集执行失败" }
);
