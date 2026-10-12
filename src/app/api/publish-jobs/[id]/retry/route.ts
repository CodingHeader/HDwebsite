import { prisma } from "@/lib/prisma";
import { error, notFound, success } from "@/lib/api-response";
import { parseId, withApi } from "@/lib/api-handler";
import { executePublishJob } from "@/lib/publish-executor";
import { canTransitionPublishJob } from "@/contracts/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/publish-jobs/[id]/retry：重置并立即重试（publish:edit；仅 failed/cancelled/scheduled/pending 可重试） */
export const POST = withApi<{ id: string }>(
  async ({ params }) => {
    const id = parseId(params.id);
    const job = await prisma.publishJob.findUnique({ where: { id } });
    if (!job) return notFound("发布任务不存在");
    if (job.status !== "pending" && !canTransitionPublishJob(job.status, "pending")) {
      return error(`当前状态 ${job.status} 不可重试`, 400);
    }
    const reset = await prisma.publishJob.update({
      where: { id: job.id },
      data: { status: "pending", attemptCount: 0, errMsg: null, scheduledAt: new Date() },
    });
    try {
      const result = await executePublishJob(reset);
      return success({ id: job.id, result }, result === "published" ? "发布成功" : "重试仍失败，请查看错误信息");
    } catch (err) {
      // 渠道/上游失败属可预期错误：502 + 明确信息（不触发 system_error）
      return error(err instanceof Error ? err.message : "重试失败", 502);
    }
  },
  { permission: "publish:edit", route: "publish-jobs/retry", errorMessage: "重试失败" }
);
