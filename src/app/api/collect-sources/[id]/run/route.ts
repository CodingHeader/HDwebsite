import { prisma } from "@/lib/prisma";
import { error, notFound, success } from "@/lib/api-response";
import { parseId, withApi } from "@/lib/api-handler";
import { runSource, SourceBusyError } from "@/lib/collect-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/collect-sources/[id]/run：立即执行采集（collect:edit；cron 为空的"仅手动"源也可执行）
 * V11-COL-01：同源执行中 → SourceBusyError → 409（手动连点不产生并发执行）；
 * 执行失败与调度路径同口径触发 collect_failed 告警（notify-gateway 既有事件，502 返回不变）。
 */
export const POST = withApi<{ id: string }>(
  async ({ params }) => {
    const id = parseId(params.id);
    const source = await prisma.collectSource.findUnique({ where: { id } });
    if (!source) return notFound("采集源不存在");
    try {
      const stat = await runSource(source);
      return success(stat, `采集完成：新增 ${stat.newCount}，跳过 ${stat.skipCount}`);
    } catch (err) {
      if (err instanceof SourceBusyError) {
        // 同源互斥：不记采集失败、不发告警（连点不是采集故障）
        return error(err.message, 409);
      }
      // 目标站点不可达/解析失败：502 + 明确信息（任务已记 failed；不触发 system_error）
      // V11-COL-01：手动立即执行失败同样走 collect_failed 告警（与调度路径一致）
      await import("@/lib/notify-gateway")
        .then((m) => m.notifyCollectFailed(source.name, err instanceof Error ? err.message : String(err)))
        .catch(() => undefined);
      return error(err instanceof Error ? err.message : "采集执行失败", 502);
    }
  },
  { permission: "collect:edit", route: "collect-sources/run", errorMessage: "采集执行失败" }
);
