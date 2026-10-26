/**
 * 客户端会话签发统一入口（V12-E2E-01）。
 *
 * 根因：ApplyClient 与 ChatWidget 各自调用 GET /api/chat/session，
 * 服务端每次生成新 sessionId + Set-Cookie（同键 chat_sid）互相覆盖 →
 * POST /api/chat/stream 校验 cookieSession === body.sessionId 失败 → 400。
 *
 * 修复：
 * 1. 本模块导出模块级单例 promise——同页并发只触发一次 GET；
 * 2. 服务端幂等签发兜底（有有效签名 cookie → 复用 sessionId）；
 * 3. 400 重试语义收紧：仅当服务端证明 cookie 失效时重签，且串行化。
 */

const SESSION_KEY = "hd_chat_session_id";
const LEGACY_SESSION_KEY = "hd_session_id";

/** 模块级单例 promise：同页并发调用共享同一签发结果 */
let sessionPromise: Promise<string | null> | null = null;

/** 读取 localStorage 缓存的 sessionId（无则 null） */
export function getCachedSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SESSION_KEY) ?? window.localStorage.getItem(LEGACY_SESSION_KEY);
}

/**
 * 获取/签发会话 id（幂等）。
 * - 本地有缓存 → 直接返回（cookie 未过期时与 cookie 一致）；
 * - 无缓存 → 发起 GET /api/chat/session（单例 promise，并发共享）；
 * - 返回 null 表示签发失败（网络等）。
 */
export async function fetchOrReuseSessionId(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const cached = getCachedSessionId();
  if (cached && cached.length >= 8) return cached;
  if (!sessionPromise) {
    sessionPromise = (async () => {
      try {
        const res = await fetch("/api/chat/session", { cache: "no-store" });
        if (!res.ok) return null;
        const data = await res.json();
        const id: string | undefined = data?.data?.sessionId;
        if (!id) return null;
        window.localStorage.setItem(SESSION_KEY, id);
        return id;
      } catch {
        return null;
      } finally {
        // 请求结束后清空单例，允许后续失效后重新签发
        sessionPromise = null;
      }
    })();
  }
  return sessionPromise;
}

/** 会话失效（400）时清缓存重签一次（串行化：await 完成后才返回） */
export async function reissueSessionId(): Promise<string | null> {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(LEGACY_SESSION_KEY);
  }
  sessionPromise = null;
  return fetchOrReuseSessionId();
}
