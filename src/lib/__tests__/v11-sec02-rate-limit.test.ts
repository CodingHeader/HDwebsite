/**
 * V11-SEC-02：限流真实 IP 与登录限流 429 回归测试。
 *
 * 缺陷（V1.1 审计 §安全.2/3）：
 *  - 原限流键取自 clientIp()：无条件读 x-forwarded-for 首跳 → 客户端每次换一个伪造 XFF
 *    即换一个限流键，爆破可无限绕过。
 *  - 登录被限流返回 400（非 429），客户端无法据 Retry-After 退避。
 *
 * 修复口径（src/lib/rate-limit.ts）：
 *  - TRUST_PROXY（默认 false）为真才采信 x-forwarded-for 首跳；否则忽略转发头 → 共享键
 *    "unknown"（route handler 无 socket 访问；伪造与 Next 服务端回填在 handler 内不可区分，
 *    fail-closed）。
 *  - 登录限流 429 + Retry-After（ApiHttpError 附加头，api-handler 统一映射）。
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const tmp = process.env.TMPDIR || process.env.TEMP || "/tmp";
  process.env.DATABASE_URL = `file:${tmp}/hdw-contract-v11sec02-${process.pid}-${Date.now()}.db`;
});

import { cleanupTestDb, ctx, initTestDb, json } from "./api-contract/harness";

import {
  __resetRateLimitBuckets,
  __setRateLimitClock,
  checkRateLimit,
  isTrustedProxy,
  trustedClientIp,
} from "@/lib/rate-limit";
import { POST as loginPOST } from "@/app/api/auth/login/route";

// ── 纯函数：checkRateLimit ────────────────────────────────────

describe("rate-limit/checkRateLimit", () => {
  it("窗口内达到 limit 即拒绝，retryAfterSeconds ≥1", () => {
    __setRateLimitClock(() => 1_000_000);
    __resetRateLimitBuckets();
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit("k", { limit: 5, windowMs: 60_000 }).allowed).toBe(true);
    }
    const blocked = checkRateLimit("k", { limit: 5, windowMs: 60_000 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("被限的请求不记录时间戳（不自我续期）：窗口过后恢复", () => {
    let now = 2_000_000;
    __setRateLimitClock(() => now);
    __resetRateLimitBuckets();
    for (let i = 0; i < 3; i++) checkRateLimit("k2", { limit: 3, windowMs: 10_000 });
    expect(checkRateLimit("k2", { limit: 3, windowMs: 10_000 }).allowed).toBe(false);
    // 被限后推进 11 秒：窗口内记录全部过期（被限请求未续期）→ 恢复
    now += 11_000;
    expect(checkRateLimit("k2", { limit: 3, windowMs: 10_000 }).allowed).toBe(true);
  });

  it("不同 key 互不影响", () => {
    __setRateLimitClock(() => 3_000_000);
    __resetRateLimitBuckets();
    checkRateLimit("a", { limit: 1, windowMs: 60_000 });
    expect(checkRateLimit("a", { limit: 1, windowMs: 60_000 }).allowed).toBe(false);
    expect(checkRateLimit("b", { limit: 1, windowMs: 60_000 }).allowed).toBe(true);
  });
});

// ── 纯函数：trustedClientIp（TRUST_PROXY 口径）────────────────

function fakeRequest(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/auth/login", { method: "POST", headers });
}

describe("rate-limit/trustedClientIp", () => {
  it("默认（TRUST_PROXY 未设）：伪造 X-Forwarded-For 不被采信 → null", () => {
    delete process.env.TRUST_PROXY;
    expect(trustedClientIp(fakeRequest({ "x-forwarded-for": "9.9.9.9" }))).toBeNull();
    expect(trustedClientIp(fakeRequest({ "x-forwarded-for": "9.9.9.9", "x-real-ip": "8.8.8.8" }))).toBeNull();
    expect(trustedClientIp(fakeRequest({}))).toBeNull();
  });

  it("默认：无论伪造值如何变化，返回值恒为 null（限流键不因伪造改变）", () => {
    delete process.env.TRUST_PROXY;
    const ips = new Set(
      ["1.2.3.4", "5.6.7.8", "1.2.3.4, 10.0.0.1", "fe80::1", ""].map((v) =>
        trustedClientIp(fakeRequest(v ? { "x-forwarded-for": v } : {}))
      )
    );
    expect([...ips]).toEqual([null]);
  });

  it("TRUST_PROXY=true：取 x-forwarded-for 首跳", () => {
    process.env.TRUST_PROXY = "true";
    expect(trustedClientIp(fakeRequest({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
    expect(trustedClientIp(fakeRequest({ "x-forwarded-for": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(trustedClientIp(fakeRequest({ "x-real-ip": "192.0.2.9" }))).toBe("192.0.2.9");
    expect(trustedClientIp(fakeRequest({}))).toBeNull();
  });

  it("TRUST_PROXY 真值口径：1/yes/on 为真，0/false/乱值为假", () => {
    for (const v of ["1", "true", "TRUE", "Yes", "on"]) {
      process.env.TRUST_PROXY = v;
      expect(isTrustedProxy()).toBe(true);
    }
    for (const v of ["0", "false", "no", "off", "junk"]) {
      process.env.TRUST_PROXY = v;
      expect(isTrustedProxy()).toBe(false);
    }
    delete process.env.TRUST_PROXY;
    expect(isTrustedProxy()).toBe(false);
  });
});

// ── 集成：登录限流（真实路由 + 临时库）────────────────────────

beforeAll(async () => {
  await initTestDb();
  delete process.env.TRUST_PROXY;
  __resetRateLimitBuckets();
}, 60_000);

afterAll(async () => {
  __resetRateLimitBuckets();
  __setRateLimitClock(null);
  delete process.env.TRUST_PROXY;
  const { prisma } = await import("@/lib/prisma");
  await prisma.$disconnect();
  cleanupTestDb();
});

function loginRequest(xff?: string): Request {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (xff) headers["x-forwarded-for"] = xff;
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers,
    body: JSON.stringify({ username: "bruteforce-probe", password: "x" }),
  });
}

describe("auth/login：伪造 XFF 不能绕过限流 + 429 语义", () => {
  it("10 次不同伪造 XFF 全部计入同一键：前 10 次 400，第 11 次 429 + Retry-After", async () => {
    __resetRateLimitBuckets();
    delete process.env.TRUST_PROXY;
    // 每次伪造不同来源 IP（原实现会得到 10 个独立键 → 全部 400 不触限）
    for (let i = 1; i <= 10; i++) {
      const res = await loginPOST(loginRequest(`203.0.113.${i}`), ctx());
      expect(res.status).toBe(400); // 用户不存在 → 400（未被限流）
    }
    const blocked = await loginPOST(loginRequest("203.0.113.999"), ctx());
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBeTruthy();
    const ra = Number(blocked.headers.get("retry-after"));
    expect(ra).toBeGreaterThanOrEqual(1);
    expect(ra).toBeLessThanOrEqual(60);
    const body = await json(blocked);
    expect(body.code).toBe(429);
    expect(body.message).toBe("尝试过于频繁，请稍后再试");
    expect(body.data).toBeNull();
    // 不带 XFF 的第 12 次：同样命中共享键 → 仍 429（换"不带头"也绕不过）
    const again = await loginPOST(loginRequest(), ctx());
    expect(again.status).toBe(429);
  });

  it("TRUST_PROXY=true：按 XFF 首跳分键，不同来源互不影响", async () => {
    __resetRateLimitBuckets();
    process.env.TRUST_PROXY = "true";
    for (let i = 1; i <= 10; i++) {
      const res = await loginPOST(loginRequest("198.51.100.7"), ctx());
      expect(res.status).toBe(400);
    }
    const blockedSameIp = await loginPOST(loginRequest("198.51.100.7"), ctx());
    expect(blockedSameIp.status).toBe(429);
    // 另一来源不受前者影响（TRUST_PROXY 下按真实首跳分桶）
    const otherIp = await loginPOST(loginRequest("198.51.100.8"), ctx());
    expect(otherIp.status).toBe(400);
  });
});
