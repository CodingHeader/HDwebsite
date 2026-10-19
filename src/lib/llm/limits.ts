/**
 * llm/limits（C-09 / WPC.9 配额与限频）
 * ==========================================================
 * 模型用量受控的两个闸门，均在 llm-gateway 调度前检查：
 *  1. dailyQuota：当日 LLMUsage.calls ≥ dailyQuota 的供应商被跳过（跨进程、落库、可审计）
 *  2. rateLimit：进程内每分钟滑动窗口（跨进程无法共享内存 → 每实例独立；任务卡明示"进程内"）
 * 日界口径：Asia/Shanghai（UTC+8）——原 llm-gateway 用 UTC 日期，熔断统计同口径修正（ADR-029 §2 D4）
 *
 * 纯函数设计：不 import prisma / 适配器 / 供应商类型，避免循环依赖与测试负担。
 * DB 读取（LLMUsage.calls）与供应商字段（dailyQuota/rateLimit）由 llm-gateway 负责。
 */

/** 可注入时钟（测试用假时钟；生产默认 Date.now） */
export type Clock = () => number;

let clock: Clock = () => Date.now();
export function __now(): number {
  return clock();
}
/** 测试专用：设置/重置时钟（传 null 恢复真实时钟） */
export function __setClock(fn: Clock | null): void {
  clock = fn ?? (() => Date.now());
}

const RATE_WINDOW_MS = 60_000;

/** 进程内滑动窗口：providerId → 最近调用时间戳（升序 push） */
const rateCalls = new Map<number, number[]>();

/** 测试专用：清空进程内滑窗（避免用例间污染） */
export function __resetRateCalls(): void {
  rateCalls.clear();
}

/**
 * 当日日期（Asia/Shanghai 日界，YYYY-MM-DD）
 * 实现：UTC 时间 + 8h 后再取 UTC 日期 = 北京时间的日期部分。
 * 边界：UTC 16:00 整点 = 北京次日 00:00 → 切换为新一天。
 */
export function usageDate(nowMs: number = __now()): string {
  const d = new Date(nowMs + 8 * 3_600_000);
  return d.toISOString().slice(0, 10);
}

/** 当日配额是否已满：calls ≥ dailyQuota（dailyQuota≤0 视为不限制，防御契约 min(1) 被绕过） */
export function isDailyQuotaExceeded(calls: number, dailyQuota: number): boolean {
  return dailyQuota > 0 && calls >= dailyQuota;
}

/** 记录一次调用进入进程内滑窗（每次尝试都记——供应商侧的限频统计同样计入失败请求） */
export function recordRateCall(providerId: number, at: number = __now()): void {
  const arr = rateCalls.get(providerId) ?? [];
  arr.push(at);
  rateCalls.set(providerId, arr);
}

/** 最近 60 秒内的调用次数（滑动窗口） */
export function recentRateCalls(providerId: number, at: number = __now()): number {
  const cutoff = at - RATE_WINDOW_MS;
  const arr = rateCalls.get(providerId) ?? [];
  let n = 0;
  for (const t of arr) if (t > cutoff) n++;
  return n;
}

/** 进程内限频是否命中：最近 60 秒内调用数 ≥ rateLimit（rateLimit≤0 视为不限制） */
export function isRateLimited(providerId: number, rateLimit: number, at: number = __now()): boolean {
  return rateLimit > 0 && recentRateCalls(providerId, at) >= rateLimit;
}

export const RATE_WINDOW_MS_EXPORTED = RATE_WINDOW_MS;