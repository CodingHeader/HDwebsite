/**
 * C-10 AI 客服风控测试：
 *  1) 纯函数：parseJsonArray / safeRateLimit / checkSensitiveWords / isBlacklisted /
 *     isChatRateLimited（进程内滑窗，键=scene+identifier）
 *  2) chatOnce（公众号路径）：
 *     - 命中敏感词 → 返回固定兜底回复（ok=true），且 llm-gateway 调用次数为 0
 *     - 命中黑名单 → 不调用模型，返回 ok=false
 *     - 超过每分钟阈值 → 返回 ok=false（限频）
 *  3) 官网 SSE（/api/chat/stream）：
 *     - 黑名单 → HTTP 429 / code 429
 *     - 限频 → HTTP 429 / code 429
 *     - 敏感词 → 200 SSE，data 含固定兜底回复，且 gatewayChatStream 调用次数为 0
 *
 * 设置键读取：loadChatGuardSettings → getAllSettings（registry 默认值合并，无缓存）；
 * 测试通过 prisma.setting 覆盖三键（chatGuardRateLimitPerMin / chatGuardSensitiveWords / chatGuardBlacklist）。
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const tmp = process.env.TMPDIR || process.env.TEMP || "/tmp";
  process.env.DATABASE_URL = `file:${tmp}/hdw-contract-c10-${process.pid}-${Date.now()}.db`;
});

// 网关 mock：捕获调用次数（断言命中敏感词/黑名单/限频时调用次数为 0）
const gwCalls = vi.hoisted(() => ({
  streamCount: 0 as number,
  chatCount: 0 as number,
}));

vi.mock("@/lib/llm-gateway", async (orig) => {
  const real = await orig<typeof import("@/lib/llm-gateway")>();
  return {
    ...real,
    gatewayChat: async () => {
      gwCalls.chatCount++;
      return { ok: true as const, reply: "模型回答", providerId: 1, providerName: "mock" };
    },
    gatewayChatStream: async () => {
      gwCalls.streamCount++;
      const enc = new TextEncoder();
      return {
        ok: true as const,
        stream: new ReadableStream<Uint8Array>({
          start(c) {
            c.enqueue(enc.encode("模型流"));
            c.close();
          },
        }),
        providerId: 1,
        providerName: "mock",
      };
    },
  };
});

import { prisma } from "@/lib/prisma";
import { cleanupTestDb, ctx, initTestDb, json } from "../api-contract/harness";
import { POST as streamPOST } from "@/app/api/chat/stream/route";
import { chatOnce } from "@/lib/chat-service";
import { parseSseFrame } from "@/lib/llm/sse";
import {
  __resetChatRate,
  checkSensitiveWords,
  GUARD_DEFAULT_RATE_LIMIT,
  GUARD_FALLBACK_REPLY,
  isBlacklisted,
  isChatRateLimited,
  parseJsonArray,
  recentChatCalls,
  recordChatCall,
  safeRateLimit,
} from "@/lib/llm/guard";

let sceneId = 0;

beforeAll(async () => {
  await initTestDb();
  const scene = await prisma.chatScene.create({
    data: {
      code: "float",
      name: "智能客服",
      greeting: "您好",
      systemPrompt: "你是弘道教育的客服助手",
      useKnowledgeBase: false,
      status: "active",
    },
  });
  sceneId = scene.id;
});

afterAll(async () => {
  await prisma.$disconnect();
  cleanupTestDb();
});

beforeEach(() => {
  gwCalls.streamCount = 0;
  gwCalls.chatCount = 0;
  __resetChatRate();
});

/** 覆盖设置键（缺省走 registry 默认值） */
async function setGuardSetting(key: string, value: string) {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value, group: "llm", isPublic: false },
  });
}

const sessionId = () => `c10-sess-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

describe("C-10 · 纯函数：设置解析与风控判定", () => {
  it("parseJsonArray：合法 JSON 数组串 → 数组；非法/空 → []", () => {
    expect(parseJsonArray('["foo","bar"]')).toEqual(["foo", "bar"]);
    expect(parseJsonArray("not-json")).toEqual([]);
    expect(parseJsonArray("")).toEqual([]);
    expect(parseJsonArray(null)).toEqual([]);
  });

  it("safeRateLimit：非法/空回落到代码内默认值 20", () => {
    expect(safeRateLimit("10")).toBe(10);
    expect(safeRateLimit("")).toBe(GUARD_DEFAULT_RATE_LIMIT);
    expect(safeRateLimit("abc")).toBe(GUARD_DEFAULT_RATE_LIMIT);
    expect(safeRateLimit(null)).toBe(GUARD_DEFAULT_RATE_LIMIT);
    expect(safeRateLimit("-1")).toBe(GUARD_DEFAULT_RATE_LIMIT);
  });

  it("checkSensitiveWords：大小写不敏感、返回命中原词", () => {
    expect(checkSensitiveWords("如何代考", ["代考", "保过"])).toBe("代考");
    expect(checkSensitiveWords("怎么保过", ["代考", "保过"])).toBe("保过");
    expect(checkSensitiveWords("报名咨询", ["代考", "保过"])).toBeNull();
  });

  it("isBlacklisted：精确匹配", () => {
    expect(isBlacklisted("openid-bad", ["openid-bad"])).toBe(true);
    expect(isBlacklisted("openid-good", ["openid-bad"])).toBe(false);
    expect(isBlacklisted("", ["openid-bad"])).toBe(false);
  });

  it("isChatRateLimited：进程内滑动窗口达到阈值即限频，未达到不限", () => {
    const key = "float:c10-window-1";
    for (let i = 0; i < GUARD_DEFAULT_RATE_LIMIT; i++) recordChatCall(key, 1000 + i);
    expect(isChatRateLimited(key, GUARD_DEFAULT_RATE_LIMIT, 1000 + GUARD_DEFAULT_RATE_LIMIT)).toBe(true);
    expect(recentChatCalls(key, 1000 + GUARD_DEFAULT_RATE_LIMIT)).toBe(GUARD_DEFAULT_RATE_LIMIT);
    // 窗口过期后回落
    expect(isChatRateLimited(key, GUARD_DEFAULT_RATE_LIMIT, 1000 + GUARD_DEFAULT_RATE_LIMIT + 61_000)).toBe(false);
  });
});

describe("C-10 · 公众号 chatOnce：敏感词 / 黑名单 / 限频（同一入口）", () => {
  it("命中敏感词 → 返回固定兜底回复且 llm-gateway 调用 0 次", async () => {
    await setGuardSetting("chatGuardSensitiveWords", JSON.stringify(["代考", "保过"]));
    const sid = sessionId();
    const res = await chatOnce({
      scene: (await prisma.chatScene.findUnique({ where: { id: sceneId } })) as never,
      sessionId: sid,
      channel: "wechat",
      message: "有没有代考服务",
      identifier: "wx-openid-1",
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.reply).toBe(GUARD_FALLBACK_REPLY);
    expect(gwCalls.chatCount).toBe(0);
  });

  it("命中黑名单 → 不调用模型，返回 ok=false", async () => {
    await setGuardSetting("chatGuardBlacklist", JSON.stringify(["wx-openid-bad"]));
    await setGuardSetting("chatGuardSensitiveWords", "[]");
    const sid = sessionId();
    const res = await chatOnce({
      scene: (await prisma.chatScene.findUnique({ where: { id: sceneId } })) as never,
      sessionId: sid,
      channel: "wechat",
      message: "你好",
      identifier: "wx-openid-bad",
    });
    expect(res.ok).toBe(false);
    expect(gwCalls.chatCount).toBe(0);
  });

  it("超过每分钟阈值 → 不调用模型，返回 ok=false（限频）", async () => {
    await setGuardSetting("chatGuardBlacklist", "[]");
    await setGuardSetting("chatGuardSensitiveWords", "[]");
    await setGuardSetting("chatGuardRateLimitPerMin", "2");
    const sid = sessionId();
    // 前 2 次放行（第 2 次开始限频，因为 window 内已经 record 2 次）
    const r1 = await chatOnce({
      scene: (await prisma.chatScene.findUnique({ where: { id: sceneId } })) as never,
      sessionId: sid,
      channel: "wechat",
      message: "咨询1",
      identifier: "wx-rate-1",
    });
    const r2 = await chatOnce({
      scene: (await prisma.chatScene.findUnique({ where: { id: sceneId } })) as never,
      sessionId: sid,
      channel: "wechat",
      message: "咨询2",
      identifier: "wx-rate-1",
    });
    const r3 = await chatOnce({
      scene: (await prisma.chatScene.findUnique({ where: { id: sceneId } })) as never,
      sessionId: sid,
      channel: "wechat",
      message: "咨询3",
      identifier: "wx-rate-1",
    });
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r3.ok).toBe(false);
    // 只放行 2 次 → 网关也只被调用 2 次
    expect(gwCalls.chatCount).toBe(2);
  });
});

describe("C-10 · 官网 SSE /api/chat/stream：同一风控入口", () => {
  it("命中黑名单 → HTTP 429 / code 429，不调用网关", async () => {
    await setGuardSetting("chatGuardBlacklist", JSON.stringify(["sess-black-1"]));
    const r = await streamPOST(
      new Request("http://localhost/api/chat/stream", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: "sess-black-1", sceneCode: "float", message: "你好" }),
      }),
      ctx()
    );
    expect(r.status).toBe(429);
    expect((await json(r)).code).toBe(429);
    expect(gwCalls.streamCount).toBe(0);
  });

  it("命中敏感词 → 200 SSE 含固定兜底回复，不调用网关", async () => {
    await setGuardSetting("chatGuardBlacklist", "[]");
    await setGuardSetting("chatGuardSensitiveWords", JSON.stringify(["代考"]));
    const r = await streamPOST(
      new Request("http://localhost/api/chat/stream", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: "sess-sensitive-1", sceneCode: "float", message: "有代考吗" }),
      }),
      ctx()
    );
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toContain("text/event-stream");
    const text = await r.text();
    expect(text).toContain(GUARD_FALLBACK_REPLY);
    expect(text).toContain("event: done");
    expect(gwCalls.streamCount).toBe(0);
  });

  it("超过每分钟阈值 → HTTP 429 / code 429", async () => {
    await setGuardSetting("chatGuardSensitiveWords", "[]");
    await setGuardSetting("chatGuardRateLimitPerMin", "2");
    const sid = "sess-rate-web-1";
    const send = () =>
      streamPOST(
        new Request("http://localhost/api/chat/stream", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sessionId: sid, sceneCode: "float", message: "你好" }),
        }),
        ctx()
      );
    const r1 = await send();
    const r2 = await send();
    const r3 = await send();
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r3.status).toBe(429);
    expect(gwCalls.streamCount).toBe(2);
  });

  it("未命中任何风控 → 正常走网关", async () => {
    await setGuardSetting("chatGuardBlacklist", "[]");
    await setGuardSetting("chatGuardSensitiveWords", "[]");
    await setGuardSetting("chatGuardRateLimitPerMin", "20");
    const r = await streamPOST(
      new Request("http://localhost/api/chat/stream", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: "sess-normal-1", sceneCode: "float", message: "专升本报名" }),
      }),
      ctx()
    );
    expect(r.status).toBe(200);
    const text = await r.text();
    // SSE 里应出现网关 mock 的"模型流"
    expect(text).toContain("模型流");
    expect(gwCalls.streamCount).toBe(1);
  });

  it("敏感词 SSE 流可被 chatSseEventSchema 解析（meta/delta/done）", async () => {
    await setGuardSetting("chatGuardSensitiveWords", JSON.stringify(["代考"]));
    const r = await streamPOST(
      new Request("http://localhost/api/chat/stream", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: "sess-sensitive-schema", sceneCode: "float", message: "代考怎么搞" }),
      }),
      ctx()
    );
    const text = await r.text();
    const frames = text.split("\n\n").filter(Boolean).map((f) => parseSseFrame(f));
    const events = frames.map((f) => f?.event);
    expect(events).toEqual(["meta", "delta", "done"]);
    const delta = frames.find((f) => f?.event === "delta");
    expect(delta?.data).toHaveProperty("text", GUARD_FALLBACK_REPLY);
  });
});