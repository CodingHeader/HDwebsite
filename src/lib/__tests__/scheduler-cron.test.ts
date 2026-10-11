import { describe, expect, it } from "vitest";
import { isDue } from "@/lib/scheduler";

describe("调度器 cron 判定", () => {
  const now = new Date("2026-10-11T04:00:30+08:00");

  it("每日 04:00 到期（从未运行过）", () => {
    expect(isDue("0 4 * * *", null, now)).toBe(true);
  });

  it("刚刚运行过 → 未到期", () => {
    const lastRun = new Date("2026-10-11T04:00:10+08:00");
    expect(isDue("0 4 * * *", lastRun, now)).toBe(false);
  });

  it("昨天运行过 → 今天到期", () => {
    const lastRun = new Date("2026-10-10T04:00:10+08:00");
    expect(isDue("0 4 * * *", lastRun, now)).toBe(true);
  });

  it("每分钟任务（上次运行于上一分钟）", () => {
    const lastRun = new Date("2026-10-11T03:59:10+08:00");
    expect(isDue("* * * * *", lastRun, now)).toBe(true);
  });

  it("每分钟任务（本轮分钟内已运行）→ 未到期", () => {
    const lastRun = new Date("2026-10-11T04:00:10+08:00");
    expect(isDue("* * * * *", lastRun, now)).toBe(false);
  });

  it("非法表达式返回 false 不抛出", () => {
    expect(isDue("not-a-cron", null, now)).toBe(false);
  });
});
