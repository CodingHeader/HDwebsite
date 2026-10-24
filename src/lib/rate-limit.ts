/**
 * 共享限流器（V11-SEC-02/03）：进程内滑动窗口 + 可信 IP 解析
 * ==========================================================
 * 背景（V1.1 审计 §安全.2/3）：
 *  - 原 `clientIp()`（src/lib/log.ts）无条件取 x-forwarded-for 首跳，客户端可伪造换键绕过限流；
 *  - 本模块提供 `trustedClientIp`：仅在 env TRUST_PROXY 为真时读 x-forwarded-for 首跳，
 *    默认（false）忽略一切转发头 —— route handler 拿不到 socket 地址，且 Next 仅在请求
 *    **未携带** XFF 时才把 socket 地址填进该头（base-server `??=`），伪造值与填充值在
 *    handler 内不可区分 → fail-closed 归入共享桶 "unknown"（伪造无法换键，即无法绕过）。
 *    部署在可信反代（如宝塔 nginx → 127.0.0.1:6789）后必须设 TRUST_PROXY=1 才有按 IP 限流。
 *  - `checkRateLimit`：进程内滑动窗口（REQ-C-003 单机口径，同 llm/limits 模式）；
 *    被限的请求**不**记录时间戳（与原 login 路由 isRateLimited 语义一致，不会自我续期）。
 *
 * 纯内存 + 可注入时钟（无 prisma/fs/网络），可被路由层与单测直接调用。
 */

/** 可注入时钟（测试用假时钟；生产默认 Date.now） */
export type Clock = () => number;

let clock: Clock = () => Date.now();

/** 测试专用：设置/重置时钟（传 null 恢复真实时钟） */
export function __setRateLimitClock(fn: Clock | null): void {
  clock = fn ?? (() => Date.now());
}

/** 滑窗桶：key → 最近命中时间戳（升序 push） */
const buckets = new Map<string, number[]>();

/** 测试专用：清空全部桶（避免用例间污染） */
export function __resetRateLimitBuckets(): void {
  buckets.clear();
}

export type RateLimitResult = {
  /** false = 本次被限 */
  allowed: boolean;
  /** 窗口内剩余可用次数（被限时为 0） */
  remaining: number;
  /** 被限时距窗口最早一条记录到期的秒数（≥1，供 Retry-After） */
  retryAfterSeconds: number;
};

export type RateLimitOptions = { limit: number; windowMs: number };

/**
 * 滑动窗口限频：key 维度最近 windowMs 内命中次数 ≥ limit 即拒绝。
 * 允许时记录时间戳；拒绝时不记录（不自我续期）。
 */
export function checkRateLimit(key: string, opts: RateLimitOptions, at: number = clock()): RateLimitResult {
  const list = (buckets.get(key) ?? []).filter((t) => at - t < opts.windowMs);
  if (list.length >= opts.limit) {
    buckets.set(key, list);
    const oldest = list[0] ?? at;
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + opts.windowMs - at) / 1000)),
    };
  }
  list.push(at);
  buckets.set(key, list);
  return { allowed: true, remaining: opts.limit - list.length, retryAfterSeconds: 0 };
}

type EnvLike = Record<string, string | undefined>;

/** TRUST_PROXY 是否为真值（"1"/"true"/"yes"/"on"，大小写不敏感；默认 false —— 不信任转发头） */
export function isTrustedProxy(env: EnvLike = process.env): boolean {
  const v = (env.TRUST_PROXY ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

/**
 * 限流键用的客户端 IP（不可被伪造）：
 * - TRUST_PROXY 为真（部署在可信反代后）：取 x-forwarded-for **首跳**（反代覆盖式写入时即真实
 *   客户端地址；追加式反代建议配合 `proxy_set_header X-Forwarded-For $remote_addr` 使用），
 *   无 XFF 时退 x-real-ip；都没有 → null。
 * - 默认（TRUST_PROXY 非 true）：**忽略** x-forwarded-for / x-real-ip 等一切客户端可控转发头，
 *   返回 null（调用方以共享键 "unknown" 限流 —— 伪造请求头无法换键绕过）。
 *   说明：App Router route handler 无 socket 访问能力，Next 服务端仅在请求未携带 XFF 时以
 *   socket 地址回填该头，handler 内无法区分"回填"与"伪造"，故默认不采信。
 */
export function trustedClientIp(request: Request, env: EnvLike = process.env): string | null {
  if (!isTrustedProxy(env)) return null;
  const xff = request.headers.get("x-forwarded-for");
  const first = xff?.split(",")[0]?.trim();
  if (first) return first;
  const xri = request.headers.get("x-real-ip")?.trim();
  return xri || null;
}
