/**
 * 进程内调度基座（SOL-001 §3.1）
 * - 每分钟扫描 CronJob 表（name/cron/enabled/lastRunAt/lockedAt）
 * - 任务注册表（registry SSOT，TN-007）：任务在 src/lib/jobs/index.ts 注册
 * - 锁：单飞锁 + lockedAt 抢锁；持锁期间按 LOCK_HEARTBEAT_MS 心跳续写 lockedAt
 *   （V11-COL-01：超过 LOCK_STALE_MINUTES 无心跳才视为进程崩溃遗留自动释放，
 *   消除「锁过期 < 单批最长执行」的重复启动窗口——如 collect.run 单批可达 30 分钟）
 * - 幂等：任务自行保证重跑无重复副作用；失败也推进 lastRunAt（等下一 cron 窗口，不热重试）
 * - SQLite 写并发：短事务 + 失败即放锁；如出现 SQLITE_BUSY 需在适配器层评估 busy_timeout（RISK-007）
 * - 启动：src/instrumentation.ts 钩子（dev 热重载经 globalThis 防重入）
 */
import { CronExpressionParser } from "cron-parser";
import { prisma } from "@/lib/prisma";

export const LOCK_STALE_MINUTES = 10;
/** 心跳续期间隔（V11-COL-01）：持锁期间每分钟续写 lockedAt，LOCK_STALE_MINUTES 由「硬 TTL」变为「心跳超时」 */
export const LOCK_HEARTBEAT_MS = 60_000;
const SCAN_INTERVAL_MS = 60_000;

export type JobContext = {
  jobName: string;
  lastRunAt: Date | null;
};

export type JobHandler = (ctx: JobContext) => Promise<void>;

const globalForScheduler = globalThis as unknown as {
  __hd_scheduler_running__?: boolean;
  __hd_scheduler_timer__?: ReturnType<typeof setInterval>;
};

const jobRegistry = new Map<string, JobHandler>();

/** 任务注册（模块加载时调用，同名注册后者覆盖并告警） */
export function registerJob(name: string, handler: JobHandler): void {
  if (jobRegistry.has(name)) {
    console.warn(`[scheduler] 任务 ${name} 重复注册，已覆盖`);
  }
  jobRegistry.set(name, handler);
}

export function getRegisteredJobNames(): string[] {
  return [...jobRegistry.keys()];
}

/**
 * 持锁心跳（V11-COL-01）：执行期间每 LOCK_HEARTBEAT_MS 续写 lockedAt，
 * 使 LOCK_STALE_MINUTES 的僵死判定不会误伤长任务（如 collect.run 单批 30 分钟）。
 * 仅当锁仍非空时续期（updateMany 守卫），放锁后的迟到心跳不会重新上锁。
 */
async function withHeartbeat<T>(jobId: number, jobName: string, fn: () => Promise<T>): Promise<T> {
  const heartbeat = setInterval(() => {
    prisma.cronJob
      .updateMany({ where: { id: jobId, lockedAt: { not: null } }, data: { lockedAt: new Date() } })
      .catch((err) => console.error(`[scheduler] 任务 ${jobName} 心跳续期失败：`, err));
  }, LOCK_HEARTBEAT_MS);
  heartbeat.unref?.();
  try {
    return await fn();
  } finally {
    clearInterval(heartbeat);
  }
}

/** 手动执行指定任务（管理端“立即执行”入口）：与扫描走同一 claim 路径防并发双跑 */
export async function execute(jobName: string): Promise<void> {
  const handler = jobRegistry.get(jobName);
  if (!handler) throw new Error(`未注册的调度任务：${jobName}`);
  const now = new Date();
  const row = await prisma.cronJob.findUnique({ where: { name: jobName } });
  if (!row) throw new Error(`CronJob 行不存在：${jobName}`);
  if (row.lockedAt) throw new Error(`任务 ${jobName} 正在执行中`);
  const claimed = await prisma.cronJob.updateMany({
    where: { id: row.id, lockedAt: null },
    data: { lockedAt: now },
  });
  if (claimed.count === 0) throw new Error(`任务 ${jobName} 抢锁失败（并发执行中）`);
  try {
    await withHeartbeat(row.id, jobName, () => handler({ jobName, lastRunAt: row.lastRunAt }));
  } finally {
    await prisma.cronJob.update({
      where: { id: row.id },
      data: { lastRunAt: new Date(), lockedAt: null },
    });
  }
}

/**
 * cron 是否到期（导出供单测）
 * 语义：存在调度点落在 (lastRunAt ?? -∞, now] 区间 → 到期。
 * 实现：取 ≤ now 的最近一次匹配 prev；lastRunAt 非空时要求 prev > lastRunAt。
 */
export function isDue(cron: string, lastRunAt: Date | null, now: Date): boolean {
  try {
    const interval = CronExpressionParser.parse(cron, {
      currentDate: new Date(now.getTime() + 1000),
    });
    const prev = interval.prev().toDate();
    if (!lastRunAt) return true; // 从未运行：最近的调度点已到即触发（补跑语义）
    return prev.getTime() > lastRunAt.getTime();
  } catch {
    console.error(`[scheduler] 非法 cron 表达式：${cron}`);
    return false;
  }
}

/** 释放僵死锁：LOCK_STALE_MINUTES 内无心跳续期（进程崩溃遗留）才回收；持锁任务心跳正常则不受影响 */
async function releaseStaleLocks(now: Date): Promise<void> {
  const staleBefore = new Date(now.getTime() - LOCK_STALE_MINUTES * 60_000);
  await prisma.cronJob.updateMany({
    where: { lockedAt: { not: null, lt: staleBefore } },
    data: { lockedAt: null },
  });
}

/** 单次扫描：找到期任务 → 逐个执行（并发 1） */
export async function scanOnce(now = new Date()): Promise<void> {
  await releaseStaleLocks(now);
  const jobs = await prisma.cronJob.findMany({ where: { enabled: true } });
  for (const job of jobs) {
    if (job.lockedAt) continue; // 其他进程/上一轮仍在执行
    if (!jobRegistry.has(job.name)) continue;
    if (!isDue(job.cron, job.lastRunAt, now)) continue;
    const claimed = await prisma.cronJob.updateMany({
      where: { id: job.id, lockedAt: null },
      data: { lockedAt: now },
    });
    if (claimed.count === 0) continue; // 抢锁失败
    try {
      const handler = jobRegistry.get(job.name)!;
      await withHeartbeat(job.id, job.name, () => handler({ jobName: job.name, lastRunAt: job.lastRunAt }));
      await prisma.cronJob.update({
        where: { id: job.id },
        data: { lastRunAt: new Date(), lockedAt: null },
      });
    } catch (err) {
      console.error(`[scheduler] 任务 ${job.name} 执行失败：`, err);
      // P06：任务异常 → job_failed 邮件（动态导入避免与 notify-gateway 循环依赖；提醒失败不影响放锁）
      await import("@/lib/notify-gateway")
        .then((m) => m.notifyJobFailed(job.name, err instanceof Error ? err.message : String(err)))
        .catch(() => undefined);
      // 失败同样推进 lastRunAt：等待下一 cron 窗口重试，避免每分钟热重试
      await prisma.cronJob.update({
        where: { id: job.id },
        data: { lastRunAt: new Date(), lockedAt: null },
      });
    }
  }
}

/** 启动每分钟循环（单飞锁；进程重启自动恢复） */
export function startScheduler(): void {
  if (globalForScheduler.__hd_scheduler_running__) return;
  globalForScheduler.__hd_scheduler_running__ = true;
  globalForScheduler.__hd_scheduler_timer__ = setInterval(() => {
    scanOnce().catch((err) => console.error("[scheduler] 扫描异常：", err));
  }, SCAN_INTERVAL_MS);
  // 启动即先扫一次（PM2 重启自动恢复，REQ-NF-004）
  scanOnce().catch((err) => console.error("[scheduler] 首扫异常：", err));
  console.log("[scheduler] 调度基座已启动（每分钟扫描）");
}

export function stopScheduler(): void {
  if (globalForScheduler.__hd_scheduler_timer__) {
    clearInterval(globalForScheduler.__hd_scheduler_timer__);
  }
  globalForScheduler.__hd_scheduler_running__ = false;
}
