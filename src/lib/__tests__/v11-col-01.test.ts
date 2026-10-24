/**
 * V11-COL-01：调度锁语义与手动执行并发保护。
 * 1) 锁心跳续期：持锁期间每 LOCK_HEARTBEAT_MS 续写 lockedAt，消除「锁过期(10min) < 单批上限(30min)」
 *    的重复启动窗口——长任务（collect.run 批次）执行中 scanOnce 不再重复调度；
 *    无心跳（崩溃遗留）超过 LOCK_STALE_MINUTES 仍自动释放。
 * 2) 手动执行互斥：runSource 入口同源互斥（未过宽限期的 running 任务 → SourceBusyError）；
 *    调度路径遇同源占用跳过且不误报告警；手动路由 409 且不告警。
 * 3) 手动立即执行失败 → collect_failed 告警（与调度路径同口径）。
 */
process.env.COLLECT_ALLOW_PRIVATE_TARGETS = "1"; // V11-SEC-04：测试用本地地址当采集源

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── 通用工具 ──────────────────────────────────────────────

/** runSource 互斥测试用 prisma collect 域桩 */
const engineMocks = vi.hoisted(() => ({
  collectTaskFindFirst: vi.fn(),
  collectTaskCreate: vi.fn(),
  collectTaskUpdate: vi.fn(),
  collectSourceUpdate: vi.fn(),
}));

/** 手动路由测试桩（runSource / notifyCollectFailed） */
const routeMocks = vi.hoisted(() => ({
  runSource: vi.fn(),
  notifyCollectFailed: vi.fn(),
}));

/** 调度路径测试桩（notifyCollectFailed） */
const jobMocks = vi.hoisted(() => ({
  notifyCollectFailed: vi.fn(),
}));

type CronRow = {
  id: number;
  name: string;
  cron: string;
  enabled: boolean;
  lastRunAt: Date | null;
  lockedAt: Date | null;
};

/** 内存版 CronJob 模型：精确复刻 scheduler 用到的查询语义（null 守卫 / not+lt 僵死判定） */
function makeCronJobModel(rows: CronRow[]) {
  const matchLocked = (row: CronRow, cond: unknown): boolean => {
    if (cond === null) return row.lockedAt === null;
    if (typeof cond === "object" && cond !== null) {
      const c = cond as { not?: unknown; lt?: Date };
      if (c.not === null && row.lockedAt === null) return false;
      if (c.lt && !(row.lockedAt && row.lockedAt.getTime() < c.lt.getTime())) return false;
      return true;
    }
    return true;
  };
  return {
    findUnique: vi.fn(async ({ where }: { where: { name: string } }) => rows.find((r) => r.name === where.name) ?? null),
    findMany: vi.fn(async () => rows),
    updateMany: vi.fn(async ({ where, data }: { where: { id?: number; lockedAt?: unknown }; data: Partial<CronRow> }) => {
      let count = 0;
      for (const r of rows) {
        if (where.id !== undefined && r.id !== where.id) continue;
        if ("lockedAt" in where && !matchLocked(r, where.lockedAt)) continue;
        Object.assign(r, data);
        count++;
      }
      return { count };
    }),
    update: vi.fn(async ({ where, data }: { where: { id: number }; data: Partial<CronRow> }) => {
      const r = rows.find((x) => x.id === where.id);
      if (r) Object.assign(r, data);
      return r;
    }),
  };
}

/** 挂起式 handler：测试内手动放行 */
function makeHangingHandler() {
  let release!: () => void;
  const handler = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        release = resolve;
      })
  );
  return { handler, finish: () => release() };
}

/** 固定时钟：锚在 :30 秒，避免 lastRunAt/scan 边界跨分钟导致 isDue 抖动 */
function useDeterministicClock() {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-23T10:07:30.000Z"));
}

afterEach(() => {
  vi.useRealTimers();
});

// ── 1. 调度锁心跳（mock prisma.cronJob，真实 scheduler） ──

describe("V11-COL-01：调度锁心跳续期", () => {
  async function setupScheduler(rows: CronRow[]) {
    vi.resetModules();
    vi.doMock("@/lib/prisma", () => ({ prisma: { cronJob: makeCronJobModel(rows) } }));
    return import("@/lib/scheduler");
  }

  it("手动执行长任务 25 分钟：锁持续续期、扫描不重复调度；结束后正常放锁", async () => {
    const rows: CronRow[] = [{ id: 1, name: "collect.run", cron: "* * * * *", enabled: true, lastRunAt: null, lockedAt: null }];
    const { execute, scanOnce, registerJob, LOCK_HEARTBEAT_MS, LOCK_STALE_MINUTES } = await setupScheduler(rows);
    expect(LOCK_HEARTBEAT_MS).toBe(60_000);
    expect(LOCK_STALE_MINUTES).toBe(10);
    const { handler, finish } = makeHangingHandler();
    registerJob("collect.run", handler);

    useDeterministicClock();
    const start = Date.now();
    const pending = execute("collect.run"); // 挂起：handler 未完成
    await vi.advanceTimersByTimeAsync(25 * 60 * 1000); // 远超旧硬 TTL 10 分钟

    // 心跳把 lockedAt 保持在新鲜状态（距当前 < 2 分钟）
    const lockedAt = rows[0].lockedAt?.getTime() ?? 0;
    expect(lockedAt).toBeGreaterThan(start + 23 * 60 * 1000);
    expect(Date.now() - lockedAt).toBeLessThan(2 * 60 * 1000);

    // 长任务期间扫描：锁未被误释放，不产生第二次执行
    await scanOnce();
    expect(handler).toHaveBeenCalledTimes(1);

    finish();
    await pending;
    expect(rows[0].lockedAt).toBeNull();
    expect(rows[0].lastRunAt).not.toBeNull();
    // 放锁后 lastRunAt 已推进，isDue 不成立，不会被下一轮扫描重复拉起
    await scanOnce();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("扫描启动的长任务 25 分钟：锁不被僵死回收、第二轮扫描不重复执行（AC：单批 30 分钟内不重复调度）", async () => {
    const rows: CronRow[] = [{ id: 1, name: "collect.run", cron: "* * * * *", enabled: true, lastRunAt: null, lockedAt: null }];
    const { scanOnce, registerJob } = await setupScheduler(rows);
    const { handler, finish } = makeHangingHandler();
    registerJob("collect.run", handler);

    useDeterministicClock();
    const start = Date.now();
    const scanning = scanOnce(); // 抢锁并挂起于 handler
    await vi.advanceTimersByTimeAsync(25 * 60 * 1000);
    await scanOnce(); // 第二轮：锁新鲜（心跳续期）→ 跳过
    expect(handler).toHaveBeenCalledTimes(1);
    const lockedAt = rows[0].lockedAt?.getTime() ?? 0;
    expect(lockedAt).toBeGreaterThan(start + 23 * 60 * 1000);

    finish();
    await scanning;
    expect(rows[0].lockedAt).toBeNull();
    expect(rows[0].lastRunAt).not.toBeNull();
  });

  it("崩溃遗留（无心跳超 10 分钟）仍自动释放并允许重新调度", async () => {
    const rows: CronRow[] = [{ id: 1, name: "collect.run", cron: "* * * * *", enabled: true, lastRunAt: null, lockedAt: null }];
    const { scanOnce, registerJob } = await setupScheduler(rows);
    const handler = vi.fn(async () => undefined);
    registerJob("collect.run", handler);

    useDeterministicClock();
    rows[0].lockedAt = new Date(Date.now() - 11 * 60 * 1000); // 模拟进程崩溃遗留的锁（不会再有心跳）
    await scanOnce();
    expect(handler).toHaveBeenCalledTimes(1); // 僵死锁被回收后任务正常执行
    expect(rows[0].lockedAt).toBeNull();

    await scanOnce();
    expect(handler).toHaveBeenCalledTimes(1); // lastRunAt 已推进，不热重试
  });

  it("手动执行入口互斥：lockedAt 非空时 execute 抛「正在执行中」", async () => {
    const rows: CronRow[] = [{ id: 1, name: "collect.run", cron: "* * * * *", enabled: true, lastRunAt: null, lockedAt: new Date() }];
    const { execute, registerJob } = await setupScheduler(rows);
    registerJob("collect.run", vi.fn(async () => undefined));
    await expect(execute("collect.run")).rejects.toThrow(/正在执行中/);
  });
});

// ── 2. runSource 同源互斥（真实 collect-engine，mock prisma collect 域） ──

describe("V11-COL-01：runSource 同源互斥", () => {
  const busySource = { id: 7, name: "互斥源", type: "html", url: "http://localhost:1/list.html", parser: null, autoToKb: false, autoApprove: false } as never;

  async function setupEngine() {
    vi.resetModules();
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        collectTask: {
          findFirst: engineMocks.collectTaskFindFirst,
          create: engineMocks.collectTaskCreate,
          update: engineMocks.collectTaskUpdate,
        },
        collectSource: { update: engineMocks.collectSourceUpdate },
      },
    }));
    vi.doMock("@/lib/settings", () => ({
      getAllSettings: vi.fn(async () => ({ collectUserAgent: "V11COL01-UA", collectTimeoutMs: "5000", collectRateLimitMs: "0" })),
    }));
    return import("@/lib/collect-engine");
  }

  beforeEach(() => {
    engineMocks.collectTaskFindFirst.mockReset();
    engineMocks.collectTaskCreate.mockReset().mockResolvedValue({ id: 1 });
    engineMocks.collectTaskUpdate.mockReset().mockResolvedValue({});
    engineMocks.collectSourceUpdate.mockReset().mockResolvedValue({});
    process.env.APP_ORIGIN = "http://localhost:1";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed (ECONNREFUSED)");
      })
    );
  });

  afterEach(() => {
    delete process.env.APP_ORIGIN;
    vi.unstubAllGlobals();
  });

  it("同源已有未过宽限期的 running 任务 → SourceBusyError，且不再往下走", async () => {
    engineMocks.collectTaskFindFirst.mockResolvedValue({ id: 99 });
    const { runSource } = await setupEngine();
    await expect(runSource(busySource)).rejects.toThrow(/正在执行中/);
    expect(engineMocks.collectTaskFindFirst).toHaveBeenCalledTimes(1);
    expect(engineMocks.collectTaskCreate).not.toHaveBeenCalled(); // 未创建新批次
  });

  it("无 running 任务 → 通过互斥检查继续执行（fetch 失败走 failed 收尾，非 busy 错误）", async () => {
    engineMocks.collectTaskFindFirst.mockResolvedValue(null);
    const { runSource, SourceBusyError } = await setupEngine();
    const err = await runSource(busySource).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err instanceof SourceBusyError).toBe(false);
    expect(engineMocks.collectTaskFindFirst).toHaveBeenCalledTimes(1);
    expect(engineMocks.collectTaskCreate).toHaveBeenCalledTimes(1); // 互斥通过后创建批次
    expect(engineMocks.collectTaskUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "failed" }) })
    );
  });

  it("互斥宽限期常量 = 批次上限 30min + 5min 余量", async () => {
    const { COLLECT_BATCH_TIMEOUT_MS, COLLECT_RUN_MUTEX_GRACE_MS } = await setupEngine();
    expect(COLLECT_RUN_MUTEX_GRACE_MS).toBe(5 * 60 * 1000);
    expect(COLLECT_BATCH_TIMEOUT_MS + COLLECT_RUN_MUTEX_GRACE_MS).toBe(35 * 60 * 1000);
  });
});

// ── 3. 手动立即执行路由：busy 409 不告警 / 失败 502 + collect_failed 告警 ──

describe("V11-COL-01：手动执行失败告警与 409", () => {
  /** 路由用 SourceBusyError 桩：与路由 instanceof 判定配对 */
  class StubSourceBusyError extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = "SourceBusyError";
    }
  }

  async function setupRoute() {
    vi.resetModules();
    vi.doMock("@/lib/api-auth", () => ({
      requireAuth: vi.fn(async () => ({
        ok: true,
        session: { id: 1, username: "admin", role: { isSuper: true, permissions: ["collect:edit"] } },
      })),
    }));
    vi.doMock("@/lib/prisma", () => ({
      prisma: { collectSource: { findUnique: vi.fn(async () => ({ id: 5, name: "告警源" })) } },
    }));
    vi.doMock("@/lib/collect-engine", () => ({
      runSource: routeMocks.runSource,
      SourceBusyError: StubSourceBusyError,
    }));
    vi.doMock("@/lib/notify-gateway", () => ({ notifyCollectFailed: routeMocks.notifyCollectFailed }));
    return import("@/app/api/collect-sources/[id]/run/route");
  }

  const call = () => new Request("http://localhost/api/collect-sources/5/run", { method: "POST", body: "{}" });
  const ctx = { params: Promise.resolve({ id: "5" }) };

  beforeEach(() => {
    routeMocks.runSource.mockReset();
    routeMocks.notifyCollectFailed.mockReset().mockResolvedValue(undefined);
  });

  it("执行失败 → collect_failed 告警（与调度路径同口径）+ 502", async () => {
    routeMocks.runSource.mockRejectedValueOnce(new Error("HTTP 503"));
    const { POST } = await setupRoute();
    const res = await POST(call(), ctx);
    expect(res.status).toBe(502);
    expect(routeMocks.notifyCollectFailed).toHaveBeenCalledTimes(1);
    expect(routeMocks.notifyCollectFailed).toHaveBeenCalledWith("告警源", "HTTP 503");
  });

  it("同源执行中（SourceBusyError）→ 409 且不触发告警", async () => {
    routeMocks.runSource.mockRejectedValueOnce(new StubSourceBusyError("采集源「告警源」正在执行中，请勿重复触发"));
    const { POST } = await setupRoute();
    const res = await POST(call(), ctx);
    expect(res.status).toBe(409);
    expect(routeMocks.notifyCollectFailed).not.toHaveBeenCalled();
  });

  it("执行成功 → 200 且无告警", async () => {
    routeMocks.runSource.mockResolvedValueOnce({ newCount: 3, skipCount: 1, fetched: 4, failed: 0 });
    const { POST } = await setupRoute();
    const res = await POST(call(), ctx);
    expect(res.status).toBe(200);
    expect(routeMocks.notifyCollectFailed).not.toHaveBeenCalled();
  });
});

// ── 4. 调度路径遇同源占用：跳过不告警；后续源失败仍正常告警 ──

describe("V11-COL-01：调度路径 SourceBusyError 跳过", () => {
  it("源 A busy → continue 不告警；源 B 失败 → collect_failed 照常；锁正常放回", async () => {
    vi.resetModules();
    const rows: CronRow[] = [{ id: 1, name: "collect.run", cron: "* * * * *", enabled: true, lastRunAt: null, lockedAt: null }];
    const cronJobModel = makeCronJobModel(rows);
    const sources = [
      { id: 7, name: "占用源A", type: "html", url: "http://localhost:1/a.html", cron: "* * * * *", enabled: true, parser: null, autoToKb: false, autoApprove: false, lastRunAt: null },
      { id: 8, name: "失败源B", type: "html", url: "http://localhost:1/b.html", cron: "* * * * *", enabled: true, parser: null, autoToKb: false, autoApprove: false, lastRunAt: null },
    ];
    let findFirstCalls = 0;
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        cronJob: cronJobModel,
        collectSource: {
          findMany: vi.fn(async () => sources),
          update: vi.fn(async () => ({})),
        },
        collectTask: {
          findFirst: vi.fn(async () => {
            findFirstCalls++;
            return findFirstCalls === 1 ? { id: 55 } : null; // A busy，B 放行
          }),
          create: vi.fn(async () => ({ id: 9 })),
          update: vi.fn(async () => ({})),
        },
      },
    }));
    vi.doMock("@/lib/settings", () => ({
      getAllSettings: vi.fn(async () => ({ collectUserAgent: "V11COL01-UA", collectTimeoutMs: "5000", collectRateLimitMs: "0" })),
    }));
    vi.doMock("@/lib/kb-sync", () => ({
      ingestCollectItem: vi.fn(async () => undefined),
      pendingKbSync: vi.fn(async () => []),
      processKbSyncQueue: vi.fn(async () => ({ synced: 0, failed: 0, adapter: "none" })),
    }));
    // part 3 曾 mock collect-engine（路由桩）：此处还原真实实现验证真实互斥路径
    vi.doMock("@/lib/collect-engine", async () => await vi.importActual("@/lib/collect-engine"));
    vi.doMock("@/lib/notify-gateway", () => ({ notifyCollectFailed: jobMocks.notifyCollectFailed }));
    process.env.APP_ORIGIN = "http://localhost:1";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed (ECONNREFUSED)");
      })
    );
    jobMocks.notifyCollectFailed.mockReset().mockResolvedValue(undefined);
    try {
      await import("@/lib/jobs"); // 注册 collect.run
      const { scanOnce } = await import("@/lib/scheduler");
      await scanOnce();
      // A busy 被跳过、B 失败照常告警；任务锁正常放回
      expect(jobMocks.notifyCollectFailed).toHaveBeenCalledTimes(1);
      expect(jobMocks.notifyCollectFailed).toHaveBeenCalledWith("失败源B", expect.stringContaining("fetch failed"));
      expect(rows[0].lockedAt).toBeNull();
      expect(rows[0].lastRunAt).not.toBeNull();
    } finally {
      delete process.env.APP_ORIGIN;
      vi.unstubAllGlobals();
    }
  });
});
