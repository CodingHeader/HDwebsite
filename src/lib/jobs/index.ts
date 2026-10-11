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

export const scheduledJobNames = [
  "collect.run",
  "publish.scan",
  "notify.scan",
  "retry.failed",
  "llm.balance-check",
  "backup",
] as const;
