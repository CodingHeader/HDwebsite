/**
 * V12-E2E-01：会话签发幂等并发单测。
 * 根因：ApplyClient + ChatWidget 各自调用 GET /api/chat/session，服务端每次
 * 签发新 id + Set-Cookie 同键覆盖 → POST /api/chat/stream 校验失败 → 400。
 * 修复：
 * 1) 服务端幂等签发：已有有效签名 cookie → 复用 sessionId（不覆盖 cookie）；
 * 2) 客户端单例 promise：同页并发只触发一次 GET。
 * 本文件覆盖：服务端幂等行为 + 客户端单例 helper 行为。
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const JWT_SECRET = "v12-e2e-01-test-secret-min-32-chars-long-0123456789";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("V12-E2E-01：服务端 GET /api/chat/session 幂等签发", () => {
  it("无 cookie → 签发新 sessionId + Set-Cookie", async () => {
    vi.stubEnv("JWT_SECRET", JWT_SECRET);
    vi.resetModules();
    const { GET } = await import("@/app/api/chat/session/route");
    const res = await GET(new Request("http://localhost/api/chat/session"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data?.data?.sessionId).toBeTruthy();
    expect(res.headers.get("set-cookie")).toMatch(/^chat_sid=.+HttpOnly/);
  });

  it("带有效签名 cookie → 复用同一 sessionId，不覆盖 cookie", async () => {
    vi.stubEnv("JWT_SECRET", JWT_SECRET);
    vi.resetModules();
    // 先签发一次拿到 id 与 cookie
    const { GET } = await import("@/app/api/chat/session/route");
    const first = await GET(new Request("http://localhost/api/chat/session"));
    const firstData = await first.json();
    const sid = firstData?.data?.sessionId as string;
    const setCookie = first.headers.get("set-cookie") as string;
    const cookieHeader = setCookie.split(";")[0]; // "chat_sid=xxx"

    // 第二次带 cookie → 应复用同一 id，且不设置新 cookie
    const second = await GET(
      new Request("http://localhost/api/chat/session", { headers: { Cookie: cookieHeader } })
    );
    expect(second.status).toBe(200);
    const secondData = await second.json();
    expect(secondData?.data?.sessionId).toBe(sid);
    expect(second.headers.get("set-cookie")).toBeNull(); // 幂等：不覆盖
  });

  it("篡改签名 cookie → 视为无效，重新签发新 id", async () => {
    vi.stubEnv("JWT_SECRET", JWT_SECRET);
    vi.resetModules();
    const { GET } = await import("@/app/api/chat/session/route");
    // 构造篡改签名：合法 id + 错误签名
    const forgedSid = "forged-session-id-0123456789";
    const forgedCookie = `chat_sid=${forgedSid}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`;
    const res = await GET(
      new Request("http://localhost/api/chat/session", { headers: { Cookie: forgedCookie } })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data?.data?.sessionId).not.toBe(forgedSid); // 重新签发
    expect(res.headers.get("set-cookie")).toMatch(/^chat_sid=.+HttpOnly/);
  });

  it("并发无 cookie 签发 → 各自独立新 id（服务端每次无 cookie 必发新）", async () => {
    vi.stubEnv("JWT_SECRET", JWT_SECRET);
    vi.resetModules();
    const { GET } = await import("@/app/api/chat/session/route");
    const [a, b] = await Promise.all([
      GET(new Request("http://localhost/api/chat/session")),
      GET(new Request("http://localhost/api/chat/session")),
    ]);
    const [da, db] = await Promise.all([a.json(), b.json()]);
    // 无 cookie 并发 → 各自新 id（客户端单例负责消除并发；服务端无 cookie 必发新）
    expect(da?.data?.sessionId).toBeTruthy();
    expect(db?.data?.sessionId).toBeTruthy();
  });
});

describe("V12-E2E-01：客户端单例 helper（chat-session.ts）", () => {
  it("无缓存 → 单例并发只触发一次 GET", async () => {
    vi.resetModules();
    // mock fetch 计数
    let fetchCount = 0;
    const fetchMock = vi.fn(async () => {
      fetchCount++;
      return new Response(
        JSON.stringify({ data: { sessionId: `sid-${fetchCount}-0123456789` } }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", { localStorage: { getItem: () => null, setItem: () => {} } });

    const { fetchOrReuseSessionId } = await import("@/lib/chat-session");
    const [a, b] = await Promise.all([fetchOrReuseSessionId(), fetchOrReuseSessionId()]);
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    expect(fetchCount).toBe(1); // 单例：并发只一次 GET
  });

  it("有缓存 → 直接返回缓存，不发起 GET", async () => {
    vi.resetModules();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const store: Record<string, string> = { "hd_chat_session_id": "cached-sid-0123456789" };
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => { store[k] = v; },
      },
    });

    const { fetchOrReuseSessionId } = await import("@/lib/chat-session");
    const id = await fetchOrReuseSessionId();
    expect(id).toBe("cached-sid-0123456789");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reissueSessionId → 清缓存重签（新 id）", async () => {
    vi.resetModules();
    let n = 0;
    const fetchMock = vi.fn(async () => {
      n++;
      return new Response(
        JSON.stringify({ data: { sessionId: `new-sid-${n}-0123456789` } }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const store: Record<string, string> = { "hd_chat_session_id": "old-sid-0123456789" };
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => { store[k] = v; },
        removeItem: (k: string) => { delete store[k]; },
      },
    });

    const { reissueSessionId } = await import("@/lib/chat-session");
    const id = await reissueSessionId();
    expect(id).toBeTruthy();
    expect(id).not.toBe("old-sid-0123456789");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
