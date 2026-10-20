/**
 * 发布执行器（SOL-005）：PublishJob 状态机
 * draft→(审核略，单级 SuperAdmin 终审在内容态)→scheduled/pending→publishing→published|failed|cancelled
 * 渠道实现经 src/lib/channels 注册表 getChannel(kind) 调用（B-05，ADR-030）；
 * executor 只做状态机/审核门/提醒/退避，不做渠道差异分支。
 * P06：迁移按 contracts/events PUBLISH_TRANSITIONS 校验；执行前同步发"发布前提醒"（立即发布任务不再跳过提醒）；
 *      publish 动作要求内容已审核（approved/published），否则失败（审核门不可经发布任务绕过，ADR-017）
 */
import { prisma } from "@/lib/prisma";
import { notifyBeforePublish, notifyEvent } from "@/lib/notify-gateway";
import { managerLink } from "@/lib/app-origin";
import { canTransitionPublishJob } from "@/contracts/events";
import { getChannel } from "@/lib/channels/registry";
import { isThrottledError } from "@/lib/channels/errors";
import type { PublishJob } from ".prisma/client";

const MAX_ATTEMPTS = 3;

export async function executePublishJob(job: PublishJob): Promise<"published" | "failed"> {
  if (!canTransitionPublishJob(job.status, "publishing")) {
    throw new Error(`发布任务 #${job.id} 状态 ${job.status} 不可执行`);
  }
  try {
    if (job.action === "publish" && job.itemId) {
      const item = await prisma.contentItem.findUnique({ where: { id: job.itemId }, select: { status: true } });
      if (item && item.status !== "approved" && item.status !== "published") {
        throw new Error(`内容未通过审核（当前 ${item.status}），不能发布`);
      }
    }
    // 发布前提醒：定时任务通常已由 notify.scan 提前发出（notifySentAt 非空则跳过）；立即发布在此同步补发
    await notifyBeforePublish(job).catch((err) => console.error(`[publish] 任务 #${job.id} 发布前提醒失败：`, err));
    await prisma.publishJob.update({ where: { id: job.id }, data: { status: "publishing", startedAt: new Date() } });
    const result = await getChannel(job.channel).publish(job);
    if (result === "published") {
      await prisma.publishJob.update({
        where: { id: job.id },
        data: { status: "published", finishedAt: new Date(), errMsg: null },
      });
      if (job.itemId) {
        await prisma.contentItem.update({ where: { id: job.itemId }, data: { status: "published", publishedAt: new Date() } }).catch(() => undefined);
      }
    } else {
      await markFailed(job, "执行失败（详见 ContentChannel 记录）");
    }
    return result;
  } catch (err) {
    // B-07：公众号发布节流（距上次发布不足 60s）→ 重排期，不算失败
    if (isThrottledError(err)) {
      await markThrottled(job, err.message, err.remainingMs);
      return "failed"; // 保持 executor 返回值契约（published/failed）
    }
    await markFailed(job, err instanceof Error ? err.message : String(err));
    return "failed";
  }
}

async function markFailed(job: PublishJob, errMsg: string): Promise<void> {
  const attempts = job.attemptCount + 1;
  const exhausted = attempts >= MAX_ATTEMPTS;
  await prisma.publishJob.update({
    where: { id: job.id },
    data: {
      status: exhausted ? "failed" : "scheduled", // 指数退避：推迟 2^attempts 分钟后由 scan 重跑
      scheduledAt: exhausted ? job.scheduledAt : new Date(Date.now() + 2 ** attempts * 60_000),
      attemptCount: attempts,
      errMsg,
      finishedAt: exhausted ? new Date() : null,
    },
  });
  if (exhausted) {
    await notifyEvent("job_failed", {
      title: `发布任务 #${job.id} 失败`,
      detail: errMsg,
      link: await managerLink("publish-jobs"),
    });
  }
}

/**
 * 节流重排（B-07，P2-1 修复）：距上次发布不足 60s 时不视为失败——
 * 保持 scheduled，推迟到节流窗口后，attemptCount 不变（不累计失败）。
 */
async function markThrottled(job: PublishJob, errMsg: string, remainingMs: number): Promise<void> {
  const delayMs = Math.max(remainingMs + 5_000, 60_000); // 至少 60s，落在窗口之后
  await prisma.publishJob.update({
    where: { id: job.id },
    data: {
      status: "scheduled",
      scheduledAt: new Date(Date.now() + delayMs),
      attemptCount: job.attemptCount, // 不累计
      errMsg,
    },
  });
  console.warn(`[publish] 任务 #${job.id} 公众号发布节流，重排到 ${new Date(Date.now() + delayMs).toISOString()}：${errMsg}`);
}

/** publish.scan 任务：到点任务逐个执行（串行，防频控） */
export async function publishScan(): Promise<void> {
  const now = new Date();
  const dueJobs = await prisma.publishJob.findMany({
    where: {
      status: { in: ["scheduled", "pending"] },
      attemptCount: { lt: MAX_ATTEMPTS },
      OR: [{ scheduledAt: { lte: now } }, { scheduledAt: null, status: "pending" }],
    },
    orderBy: { id: "asc" },
    take: 5,
  });
  for (const job of dueJobs) {
    await executePublishJob(job);
    await new Promise((r) => setTimeout(r, 2000)); // 渠道限频间隔
  }
}

/** retry.failed 任务：失败任务人工/自动重试入口（attemptCount 重置由 retry API 决定） */
export async function retryFailedScan(): Promise<void> {
  // 重试由 /api/publish-jobs/[id]/retry 显式触发；本扫描仅兜底拉起搁置的 scheduled 任务
  const stuck = await prisma.publishJob.updateMany({
    where: { status: "publishing", startedAt: { lt: new Date(Date.now() - 15 * 60_000) } },
    data: { status: "scheduled" },
  });
  if (stuck.count > 0) console.log(`[retry] 复位搁置发布任务 ${stuck.count} 个`);
}
