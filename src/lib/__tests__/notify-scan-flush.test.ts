/**
 * W2-08：notify.scan 必须调用 flushDeferred（B-06 CCR 落地守卫）
 *
 * 为什么需要这条测试：
 *   B-06 的 notifyEvent 在静默时段内不直接发送，而是把通知记为 deferred 状态；
 *   若没有任何调用点去 flush，静默期结束后这些通知会永久滞留（用户永远收不到）。
 *   W2-08 把 flushDeferred 接进 notify.scan，这条测试锁死该接线，防止后续重构误删。
 *
 * 手法：mock @/lib/prisma 让 scanOnce 只看到一条到期的 notify.scan 任务行，
 *   再 mock notify-gateway 的三个函数并记录调用顺序，走真实 scanOnce 路径执行 handler。
 *   这样验证的是「调度真实链路会调到 flushDeferred」，而不是只验证源码里出现字符串。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const calls: string[] = [];

vi.mock("@/lib/notify-gateway", () => ({
  publishRemindScan: async () => {
    calls.push("publishRemindScan");
  },
  notifyRetryScan: async () => {
    calls.push("notifyRetryScan");
  },
  flushDeferred: async () => {
    calls.push("flushDeferred");
  },
  notifyCollectFailed: async () => undefined,
  notifyEvent: async () => undefined,
  llmBalanceCheck: async () => undefined,
}));

vi.mock("@/lib/jobs/backup", () => ({ backupJob: async () => undefined }));
vi.mock("@/lib/collect-engine", () => ({ runSource: async () => undefined }));
vi.mock("@/lib/kb-sync", () => ({ processKbSyncQueue: async () => undefined }));
vi.mock("@/lib/publish-executor", () => ({
  publishScan: async () => undefined,
  retryFailedScan: async () => undefined,
  executePublishJob: async () => "published",
}));

/** 只放一条到期的 notify.scan 行；cron "* * * * *" + lastRunAt=null → isDue 必为 true */
vi.mock("@/lib/prisma", () => ({
  prisma: {
    cronJob: {
      findMany: async () => [
        { id: 1, name: "notify.scan", cron: "* * * * *", enabled: true, lockedAt: null, lastRunAt: null },
      ],
      updateMany: async () => ({ count: 1 }),
      update: async () => ({}),
      findUnique: async () => ({ id: 1, name: "notify.scan", lockedAt: null, lastRunAt: null }),
    },
    collectSource: { findMany: async () => [] },
  },
}));

describe("W2-08 · notify.scan 接线", () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it("调度执行 notify.scan 时依次调用 publishRemindScan / notifyRetryScan / flushDeferred", async () => {
    await import("@/lib/jobs"); // 触发任务注册
    const { scanOnce, getRegisteredJobNames } = await import("@/lib/scheduler");

    expect(getRegisteredJobNames()).toContain("notify.scan");

    await scanOnce(new Date("2026-10-21T12:00:00Z"));

    expect(calls).toEqual(["publishRemindScan", "notifyRetryScan", "flushDeferred"]);
  });

  it("flushDeferred 在最后执行（保证本轮新产生的 deferred 也被覆盖）", async () => {
    await import("@/lib/jobs");
    const { scanOnce } = await import("@/lib/scheduler");

    await scanOnce(new Date("2026-10-21T12:00:00Z"));

    expect(calls.indexOf("flushDeferred")).toBe(calls.length - 1);
  });
});
