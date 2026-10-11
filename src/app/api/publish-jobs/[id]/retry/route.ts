import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { error, notFound, success, validationError } from "@/lib/api-response";
import { executePublishJob } from "@/lib/publish-executor";
import { idParamSchema } from "@/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/publish-jobs/[id]/retry：重置并立即重试（publish:edit） */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAuth(request, "publish:edit");
  if (!guard.ok) return guard.response;
  const parsedId = idParamSchema.safeParse((await params).id);
  if (!parsedId.success) return validationError([{ message: "非法 ID" }]);
  try {
    const job = await prisma.publishJob.findUnique({ where: { id: parsedId.data } });
    if (!job) return notFound("发布任务不存在");
    const reset = await prisma.publishJob.update({
      where: { id: job.id },
      data: { status: "pending", attemptCount: 0, errMsg: null, scheduledAt: new Date() },
    });
    const result = await executePublishJob(reset);
    return success({ id: job.id, result }, result === "published" ? "发布成功" : "重试仍失败，请查看错误信息");
  } catch (err) {
    console.error("[publish/retry] 重试失败：", err);
    return error(err instanceof Error ? err.message : "重试失败", 502);
  }
}
