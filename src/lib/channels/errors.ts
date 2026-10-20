/**
 * 渠道层共享错误（B-07 P2-1 修复）
 *
 * ADR-030 原则：executor 只做状态机/审核门/提醒/退避，不做渠道差异分支。
 * 但节流（60s）是"跨渠道可抽象的可重试瞬态错误"——executor 识别后重排期，
 * 不视为失败（不增 attemptCount、不写 failed ContentChannel）。
 *
 * 放在 channels/ 共享模块避免 executor 直接依赖具体渠道实现（wechat.ts）。
 */
export class ChannelThrottledError extends Error {
  /** 距节流窗口解除的剩余毫秒 */
  readonly remainingMs: number;
  constructor(message: string, remainingMs: number) {
    super(message);
    this.name = "ChannelThrottledError";
    this.remainingMs = remainingMs;
  }
}

/** 判定任意错误是否为节流错误（供 executor 在 catch 中做语义分支） */
export function isThrottledError(err: unknown): err is ChannelThrottledError {
  return err instanceof ChannelThrottledError || (err instanceof Error && err.name === "ChannelThrottledError");
}
