/**
 * 任务注册表（registry SSOT，TN-007）
 * 已注册：backup（每日 03:00 备份）、collect.run（采集）、publish.scan（发布扫描）、
 *         notify.scan（发布前/后通知）、retry.failed（重试失败）、llm.balance-check（模型余额检查）。
 * 未注册切片的任务行 enabled 保持 true 但无执行器 → 扫描自动跳过（getRegisteredJobNames 缺席）。
 */
import { registerJob } from "@/lib/scheduler";
import { backupJob } from "@/lib/jobs/backup";

registerJob("backup", backupJob);

// ── 采集（S4）──
registerJob("collect.run", async () => {
  const { prisma } = await import("@/lib/prisma");
  const { runSource } = await import("@/lib/collect-engine");
  const { notifyCollectFailed } = await import("@/lib/notify-gateway");
  const { isDue } = await import("@/lib/scheduler");
  const { processKbSyncQueue } = await import("@/lib/kb-sync");
  const sources = await prisma.collectSource.findMany({ where: { enabled: true }, orderBy: { id: "asc" } });
  const now = new Date();
  for (const source of sources) {
    // P06：cron 为空 = 仅手动执行；否则按源自身 cron 判断是否到期（任务行 cron 决定检查频率）
    if (!source.cron.trim()) continue;
    if (!isDue(source.cron, source.lastRunAt, now)) continue;
    try {
      await runSource(source);
    } catch (err) {
      await notifyCollectFailed(source.name, err instanceof Error ? err.message : String(err));
    }
  }
  // 入库条目推送远端知识库（未注册适配器时保持排队；P12 注册 Coze 适配器）
  await processKbSyncQueue();
});

// ── 发布（S5）──
registerJob("publish.scan", async () => {
  const { publishScan } = await import("@/lib/publish-executor");
  await publishScan();
});

// ── 通知与提醒（S5）──
registerJob("notify.scan", async () => {
  const { notifyRetryScan, publishRemindScan } = await import("@/lib/notify-gateway");
  await publishRemindScan();
  await notifyRetryScan();
});

registerJob("retry.failed", async () => {
  const { retryFailedScan } = await import("@/lib/publish-executor");
  await retryFailedScan();
});

// ── 余额检查（S3）──
registerJob("llm.balance-check", async () => {
  const { llmBalanceCheck } = await import("@/lib/notify-gateway");
  await llmBalanceCheck();
});

export const scheduledJobNames = [
  "collect.run",
  "publish.scan",
  "notify.scan",
  "retry.failed",
  "llm.balance-check",
  "backup",
] as const;
