import { prisma } from "@/lib/prisma";
import { error, notFound, success } from "@/lib/api-response";
import { parseId, withApi } from "@/lib/api-handler";
import { canTransitionPublishJob } from "@/contracts/events";

export const dynamic = "force-dynamic";

/** POST /api/publish-jobs/[id]/cancel：取消待发任务（publish:edit；迁移按 PUBLISH_TRANSITIONS 校验） */
export const POST = withApi<{ id: string }>(
  async ({ params }) => {
    const id = parseId(params.id);
    const job = await prisma.publishJob.findUnique({ where: { id } });
    if (!job) return notFound("发布任务不存在");
    if (!canTransitionPublishJob(job.status, "cancelled")) {
      return error(`当前状态 ${job.status} 不可取消`, 400);
    }
    await prisma.publishJob.update({ where: { id: job.id }, data: { status: "cancelled", finishedAt: new Date() } });
    return success({ id: job.id, status: "cancelled" }, "已取消");
  },
  { permission: "publish:edit", route: "publish-jobs/cancel", errorMessage: "取消失败" }
);
