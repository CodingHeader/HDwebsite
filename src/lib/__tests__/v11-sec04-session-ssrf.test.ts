/**
 * V11-SEC-04：会话归属 + 采集 SSRF 防护。
 * 1) chat 会话：服务端签发（HMAC 签名 cookie）——签名校验、篡改拒绝、
 *    stream 路由无 cookie/不匹配时 400；
 * 2) 采集出网：assertPublicHttpUrl 黑名单（环回/私网/链路本地/内网主机名/非法协议）。
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { chatSessionCookieHeader, signChatSession, verifyChatSession } from "@/lib/chat-service";
import { assertPublicHttpUrl } from "@/lib/collect-engine";

describe("V11-SEC-04：chat 会话签发与校验", () => {
  it("签发→校验往返一致", () => {
    const id = "6f1c2a4e-0000-4000-8000-000000000001";
    expect(verifyChatSession(signChatSession(id))).toBe(id);
  });

  it("篡改 id 或签名 → null（timingSafeEqual 长度守卫不抛异常）", () => {
    const signed = signChatSession("victim-session-0001");
    const [, sig] = signed.split(".");
    expect(verifyChatSession(`victim-session-0002.${sig}`)).toBeNull();
    expect(verifyChatSession(`victim-session-0001.${"A".repeat(sig.length)}`)).toBeNull();
    expect(verifyChatSession("no-signature-here")).toBeNull();
    expect(verifyChatSession(undefined)).toBeNull();
  });

  it("cookie 头构造含 HttpOnly/SameSite", () => {
    const h = chatSessionCookieHeader("abc12345");
    expect(h).toMatch(/^chat_sid=/);
    expect(h).toContain("HttpOnly");
    expect(h).toContain("SameSite=Lax");
  });

  it("stream 路由：无 cookie → 400；body 与 cookie 不一致 → 400；一致 → 放行进入后续逻辑", async () => {
    vi.resetModules();
    vi.doMock("@/lib/prisma", () => ({ prisma: { aIChatHistory: { count: async () => 0 } } }));
    vi.doMock("@/lib/llm-gateway", () => ({
      gatewayChatStream: async () => ({ ok: true, providerName: "m", providerId: 1, stream: new ReadableStream({ start(c) { c.close(); } }) }),
      recordGatewayFailure: async () => undefined,
    }));
    vi.doMock("@/lib/chat-service", async (orig) => ({
      ...(await orig<typeof import("@/lib/chat-service")>()),
      findScene: async () => null,
      buildChatContext: async () => ({ messages: [], preferredProviderId: null, preferredProviderIds: [], overrides: {}, isRetry: false, guard: { kind: "ok" } }),
      recordMessage: async () => undefined,
    }));
    const { POST } = await import("@/app/api/chat/stream/route");
    const { error } = await import("@/lib/api-response");
    const sid = "sess-1234567890";
    const cookie = chatSessionCookieHeader(sid);
    const req = (body: object, withCookie: boolean) =>
      new Request("http://localhost/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(withCookie ? { Cookie: cookie } : {}) },
        body: JSON.stringify({ sessionId: sid, sceneCode: "faq", message: "你好" }),
      });

    const noCookie = await POST(req({ sessionId: sid }, false) as never);
    expect(noCookie.status).toBe(400);

    const mismatch = await POST(
      new Request("http://localhost/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: chatSessionCookieHeader("other-session-999") },
        body: JSON.stringify({ sessionId: sid, sceneCode: "faq", message: "你好" }),
      }) as never
    );
    expect(mismatch.status).toBe(400);

    const ok = await POST(req({ sessionId: sid }, true) as never);
    expect(ok.status).not.toBe(400);
    void error;
  });
});

describe("V11-SEC-04：采集 SSRF 黑名单", () => {
  it("环回/私网/链路本地字面量 IP 拒绝", async () => {
    for (const u of ["http://127.0.0.1/x", "http://10.1.2.3/x", "http://192.168.1.1/x", "http://172.16.0.9/x", "http://169.254.169.254/latest/meta-data", "http://0.0.0.0/x", "http://[::1]/x", "http://[fe80::1]/x", "http://[fc00::1]/x"]) {
      await expect(assertPublicHttpUrl(u), u).rejects.toThrow(/SSRF/);
    }
  });

  it("内网主机名与非法协议拒绝", async () => {
    for (const u of ["http://localhost/x", "http://db.internal/x", "file:///etc/passwd", "ftp://example.com/x"]) {
      await expect(assertPublicHttpUrl(u), u).rejects.toThrow(/SSRF/);
    }
  });

  it("公网字面量 IP 放行；解析失败 fail-closed", async () => {
    await expect(assertPublicHttpUrl("https://93.184.216.34/x")).resolves.toBeUndefined();
    await expect(assertPublicHttpUrl("https://nonexistent-host-v11-test.invalid/x")).rejects.toThrow(/SSRF/);
  });
});
 afterEach(() => { vi.restoreAllMocks(); });
