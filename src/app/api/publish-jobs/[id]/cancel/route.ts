import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { error, notFound, success, validationError } from "@/lib/api-response";
import { idParamSchema } from "@/contracts";

export const dynamic = "force-dynamic";

/** POST /api/publish-jobs/[id]/cancel：取消待发任务（publish:edit） */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAuth(request, "publish:edit");
  if (!guard.ok) return guard.response;
  const parsedId = idParamSchema.safeParse((await params).id);
  if (!parsedId.success) return validationError([{ message: "非法 ID" }]);
  try {
    const job = await prisma.publishJob.findUnique({ where: { id: parsedId.data } });
    if (!job) return notFound("发布任务不存在");
    if (!["pending", "scheduled", "reviewing"].includes(job.status)) {
      return error(`当前状态 ${job.status} 不可取消`, 400);
    }
    await prisma.publishJob.update({ where: { id: job.id }, data: { status: "cancelled", finishedAt: new Date() } });
    return success({ id: job.id, status: "cancelled" }, "已取消");
  } catch (err) {
    console.error("[publish/cancel] 取消失败：", err);
    return error("取消失败", 500, 500);
  }
}
