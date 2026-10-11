/**
 * 任务注册表（registry SSOT，TN-007）
 * M1 注册：backup（每日 03:00 备份）
 * 后续切片注册：collect.run(S4) / publish.scan(S5) / notify.scan(S5) /
 *              retry.failed(S5) / llm.balance-check(S3)
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
  const sources = await prisma.collectSource.findMany({ where: { enabled: true }, orderBy: { id: "asc" } });
  for (const source of sources) {
    try {
      await runSource(source);
    } catch (err) {
      await notifyCollectFailed(source.name, err instanceof Error ? err.message : String(err));
    }
  }
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
