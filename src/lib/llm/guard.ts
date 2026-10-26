/**
 * llm/guard（C-10 / WPC.4 AI 客服风控）
 * ==========================================================
 * 三项风控，均在「调用模型之前」统一检查（官网 SSE 与公众号 chatOnce 共用 chat-service 入口）：
 *   1. 黑名单：identifier（官网 sessionId / 公众号 openId）命中 chatGuardBlacklist → 直接拒绝
 *   2. 敏感词：message 命中 chatGuardSensitiveWords → 返回固定兜底回复，**不调用模型**
 *   3. 限频：同一「场景 + 用户标识」超过 chatGuardRateLimitPerMin 次/分钟 → 429
 *
 * 设置键（W0-10 冻结，扁平键，ADR-009；group=llm，isPublic=false）：
 *   chatGuardRateLimitPerMin   （默认 "20"）
 *   chatGuardSensitiveWords    （JSON 数组串，默认 "[]"）
 *   chatGuardBlacklist         （JSON 数组串，默认 "[]"）
 *
 * 限频实现：进程内滑动窗口（键=scene.code+":"+identifier）。跨实例共享需要共享存储，
 * 卡内明示「进程内」保留（升级条件：多实例部署时记 ADR，本卡不引入 Redis）。
 *
 * 纯函数核心（checkSensitiveWords / isBlacklisted / isChatRateLimited）不 import prisma / 适配器，
 * 便于 lane-c/chat-guard.test.ts 直测；设置读取集中在 loadChatGuardSettings()。
 */

import { getAllSettings } from "@/lib/settings";

/** 固定兜底回复（敏感词命中时原样返回，前端正常展示；与公众号 wechatFallbackReply 分工） */
export const GUARD_FALLBACK_REPLY = "抱歉，我暂时无法回答这个问题。请换个说法，或直接联系招生老师咨询。";

/** 设置键缺失/非法时的代码内默认值（卡 Execution Step 2 要求：键缺失时用代码内默认值） */
// V13-RL-01 / V13-Q2-01（2026-10-26 用户裁决：每分钟 10 次）：
// 原为 20（ADR-034 §2.3 冻结值），与 REQ-F-009:38「默认 10 次/分钟」构成 MUST 冲突。
// 用户裁决取 10，本常量与 settings-registry 默认值、settings-registry.test 断言三处必须保持一致。
export const GUARD_DEFAULT_RATE_LIMIT = 10;
export const GUARD_RATE_WINDOW_MS = 60_000;

/**
 * IP 级兜底（V13-RL-01）。
 *
 * 为什么需要它：按会话限频（scene:identifier）可被"换会话"绕过——清空 localStorage
 * 重新签发 chat_sid 即可重置窗口。原实现用一条独立的「按 IP 10 次/分」硬编码通道堵这个口子，
 * 但它带来双重缺陷：①阈值与设置键无关，后台改限流对它无效 ②阈值写死，无法随业务调整。
 *
 * 现在的做法：**不再保留独立阈值**，IP 兜底直接使用同一个设置值（chatGuardRateLimitPerMin），
 * 因此只有一个真实数值来源，后台改它两侧同步生效；严格程度与旧实现完全一致（不会再放宽）。
 */
export function ipCapFor(rateLimitPerMin: number): number {
  return rateLimitPerMin > 0 ? rateLimitPerMin : 0;
}

/** IP 兜底是否命中（count 为窗口内该 IP 的请求数） */
export function isIpCapped(count: number, rateLimitPerMin: number): boolean {
  const cap = ipCapFor(rateLimitPerMin);
  return cap > 0 && count >= cap;
}

export type ChatGuardSettings = {
  /** 每分钟阈值（≤0 视为不限制） */
  rateLimitPerMin: number;
  sensitiveWords: string[];
  blacklist: string[];
};

export type ChatGuardResult =
  | { type: "ok"; identifier: string }
  | { type: "rate" }
  | { type: "sensitive"; matched: string }
  | { type: "blacklist" };

// ── 设置读取 ──────────────────────────────────────────────────

/** 解析设置里的 JSON 数组串；非法/空 → []（不抛错） */
export function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw || !raw.trim()) return [];
  const s = raw.trim();
  try {
    const arr = JSON.parse(s);
    if (Array.isArray(arr)) return arr.filter((v): v is string => typeof v === "string" && v.trim() !== "").map((v) => v.trim());
  } catch {
    /* 非法 JSON → 空 */
  }
  return [];
}

/** 解析限频阈值；非法/空 → 代码内默认值 */
export function safeRateLimit(raw: string | null | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : GUARD_DEFAULT_RATE_LIMIT;
}

/** 读取风控三键（缺失键回落到 Registry 默认值语义：getAllSettings 已与 defaultValues 合并） */
export async function loadChatGuardSettings(): Promise<ChatGuardSettings> {
  const s = await getAllSettings();
  return {
    rateLimitPerMin: safeRateLimit(s.chatGuardRateLimitPerMin),
    sensitiveWords: parseJsonArray(s.chatGuardSensitiveWords),
    blacklist: parseJsonArray(s.chatGuardBlacklist),
  };
}

// ── 纯函数：敏感词 / 黑名单 ──────────────────────────────────

/**
 * 敏感词匹配（大小写不敏感，逐词 substring 包含）。
 * 返回命中的原词（用于证据与测试断言）；未命中返回 null。
 */
export function checkSensitiveWords(message: string, words: string[]): string | null {
  const m = message.toLowerCase();
  for (const w of words) {
    if (!w) continue;
    if (m.includes(w.toLowerCase())) return w;
  }
  return null;
}

/** 黑名单精确匹配（identifier 完全等于列表中某一项） */
export function isBlacklisted(identifier: string, list: string[]): boolean {
  if (!identifier) return false;
  return list.includes(identifier);
}

// ── 纯函数：进程内滑动窗口限频 ──────────────────────────────

const rateCalls = new Map<string, number[]>();

/** 测试专用：清空进程内滑窗（避免用例间污染） */
export function __resetChatRate(): void {
  rateCalls.clear();
}

/** 记录一次放行（命中风控不记录；仅 ok 时记录） */
export function recordChatCall(key: string, at: number = Date.now()): void {
  const arr = rateCalls.get(key) ?? [];
  arr.push(at);
  rateCalls.set(key, arr);
}

/** 最近 GUARD_RATE_WINDOW_MS 内 key 的放行次数 */
export function recentChatCalls(key: string, at: number = Date.now()): number {
  const cutoff = at - GUARD_RATE_WINDOW_MS;
  const arr = rateCalls.get(key) ?? [];
  let n = 0;
  for (const t of arr) if (t > cutoff) n++;
  return n;
}

/** 是否限频命中：最近窗口内放行数 ≥ rateLimitPerMin（≤0 视为不限制） */
export function isChatRateLimited(key: string, rateLimitPerMin: number, at: number = Date.now()): boolean {
  return rateLimitPerMin > 0 && recentChatCalls(key, at) >= rateLimitPerMin;
}

// ── 组合检查 ────────────────────────────────────────────────

/**
 * 组合风控（黑名单 → 敏感词 → 限频）。
 * 顺序刻意保持：黑名单优先级最高（拒绝），敏感词其次（固定兜底），限频最后（429）。
 * 命中限频时**不**记录本次调用（recordChatCall 只在 ok 时调用）。
 * 返回 ok 时调用方负责在真正调用模型/写入会话记录后调用 recordChatCall 以计入窗口。
 * 为避免调用方遗漏，本函数在返回 ok 时自行 recordChatCall(key)。
 */
export async function checkChatGuard(input: {
  sceneCode?: string | null;
  identifier: string;
  message: string;
  settings?: ChatGuardSettings;
}): Promise<ChatGuardResult> {
  const settings = input.settings ?? (await loadChatGuardSettings());

  // 1. 黑名单
  if (isBlacklisted(input.identifier, settings.blacklist)) return { type: "blacklist" };

  // 2. 敏感词
  const matched = checkSensitiveWords(input.message, settings.sensitiveWords);
  if (matched) return { type: "sensitive", matched };

  // 3. 限频（进程内滑窗）
  const key = `${input.sceneCode ?? "default"}:${input.identifier}`;
  if (isChatRateLimited(key, settings.rateLimitPerMin)) return { type: "rate" };
  recordChatCall(key);
  return { type: "ok", identifier: input.identifier };
}

/**
 * V13-RL-01：IP 级兜底判定（与会话级限频共用同一个设置值）。
 *
 * 调用方（官网 SSE）在进入会话级检查之前调用；命中则返回 rate 语义（429）。
 * 之所以不做成独立阈值：独立阈值会让后台设置对一侧失效（V13-RL-01 的原始缺陷）。
 */
export async function checkIpCap(input: {
  countInWindow: number;
  settings?: ChatGuardSettings;
}): Promise<{ type: "ok" } | { type: "rate" }> {
  const settings = input.settings ?? (await loadChatGuardSettings());
  return isIpCapped(input.countInWindow, settings.rateLimitPerMin) ? { type: "rate" } : { type: "ok" };
}