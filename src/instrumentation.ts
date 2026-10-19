/**
 * Next 16 启动钩子（TN-009）：调度基座初始化点
 * dev 热重载经 globalThis 锁防重入；任务注册先于 startScheduler。
 * D-03：先集中校验环境变量（生产缺失即退出），再启动调度器。
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { assertProductionEnv } = await import("@/lib/env");
  assertProductionEnv();
  await import("@/lib/jobs");
  const { startScheduler } = await import("@/lib/scheduler");
  startScheduler();
}
