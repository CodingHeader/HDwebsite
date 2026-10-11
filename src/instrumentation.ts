/**
 * Next 16 启动钩子（TN-009）：调度基座初始化点
 * dev 热重载经 globalThis 锁防重入；任务注册先于 startScheduler。
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  await import("@/lib/jobs");
  const { startScheduler } = await import("@/lib/scheduler");
  startScheduler();
}
