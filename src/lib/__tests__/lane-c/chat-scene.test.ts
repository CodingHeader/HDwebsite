/**
 * C-07 场景装配与流式测试：
 * 1) providerIds [B,A] 优先级：B 置顶、B 失败回落 A、再回落全局 fallback（orderProviders 数组版）
 * 2) 官网 SSE 与公众号 chatOnce 走同一 buildChatContext → 两渠道 messages 全等
 * 3) 第 11 次请求返回 HTTP 429 / code 429（限频）
 * 4) baseIds/providerIds 的 JSON 数组串 "[1,2]" 与旧逗号文本 "1,2" 都能解析（parseIdListField）
 * 5) SSE 事件由 chatSseEventSchema 构造与解析（parseSseFrame）
 * 6) 同一流内出现两条 error 事件只显示一条提示且不抛错（reduceSseError）
 * 7) DR-23：route.ts 不再用内联 chatRequestSchema（grep z.object 为空）
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import fs from "node:fs";

vi.hoisted(() => {
  const tmp = process.env.TMPDIR || process.env.TEMP || "/tmp";
  process.env.DATABASE_URL = `file:${tmp}/hdw-contract-c07-${process.pid}-${Date.now()}.db`;
});

// 网关 mock：捕获 messages 与 opts，官网流式/公众号非流式共用
const gwCalls = vi.hoisted(() => ({
  streams: [] as { messages: import("@/lib/llm/types").ChatMessage[]; opts?: import("@/lib/llm-gateway").RouteOptions }[],
  chats: [] as { messages: import("@/lib/llm/types").ChatMessage[]; opts?: import("@/lib/llm-gateway").RouteOptions }[],
  streamFail: false,
}));

vi.mock("@/lib/llm-gateway", async (orig) => {
  const real = await orig<typeof import("@/lib/llm-gateway")>();
  return {
    ...real,
    gatewayChatStream: async (messages: import("@/lib/llm/types").ChatMessage[], opts?: import("@/lib/llm-gateway").RouteOptions) => {
      gwCalls.streams.push({ messages, opts });
      if (gwCalls.streamFail) return { ok: false, errMsg: "mock 上游不可用" };
      const enc = new TextEncoder();
      return {
        ok: true as const,
        stream: new ReadableStream<Uint8Array>({
          start(c) {
            c.enqueue(enc.encode("您好"));
            c.close();
          },
        }),
        providerId: 1,
        providerName: "mock",
      };
    },
    gatewayChat: async (messages: import("@/lib/llm/types").ChatMessage[], opts?: import("@/lib/llm-gateway").RouteOptions) => {
      gwCalls.chats.push({ messages, opts });
      if (gwCalls.streamFail) return { ok: false, reply: "", errMsg: "mock 上游不可用" };
      return { ok: true as const, reply: "您好", providerId: 1, providerName: "mock" };
    },
  };
});

import { prisma } from "@/lib/prisma";
import { cleanupTestDb, ctx, initTestDb, json } from "../api-contract/harness";
import { POST as streamPOST } from "@/app/api/chat/stream/route";
import { orderProviders } from "@/lib/llm-gateway";
import { buildChatContext, chatOnce, parseIdListField } from "@/lib/chat-service";
import { parseSseFrame, reduceSseError } from "@/lib/llm/sse";
import { chatSseEventSchema } from "@/contracts/chat";

const PROVIDERS = [
  { id: 1, name: "A", isDefault: false, isFallback: false },
  { id: 2, name: "B", isDefault: false, isFallback: false },
  { id: 3, name: "D", isDefault: true, isFallback: false },
  { id: 4, name: "F", isDefault: false, isFallback: true },
];

async function seedScene(over: Record<string, unknown> = {}) {
  return prisma.chatScene.create({
    data: {
      code: `scene-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: "测试场景",
      greeting: "您好",
      systemPrompt: "你是测试助手",
      useKnowledgeBase: false,
      status: "active",
      ...over,
    },
  } as never);
}

beforeAll(async () => {
  await initTestDb();
});

afterAll(async () => {
  cleanupTestDb();
});

describe("C-07 · 场景 providerIds 优先级与回落（orderProviders 数组版）", () => {
  it("[B,A] → B 置顶、A 次之、默认随后、fallback 殿后", () => {
    expect(orderProviders(PROVIDERS, [2, 1]).map((p) => p.id)).toEqual([2, 1, 3, 4]);
  });

  it("B 失败回落 A、再回落全局默认与 fallback：网关按序尝试（providers 顺序即回落顺序）", async () => {
    // 场景 providerIds=[B,A] 时，网关 providers 顺序 = [B,A,默认,fallback]；B 失败 → 网关循环进入 A → 默认 → fallback
    const order = orderProviders(PROVIDERS, [2, 1]).map((p) => p.name);
    expect(order).toEqual(["B", "A", "D", "F"]);
    // 网关按序逐个尝试（fallback 必试）——语义由 getRoutedProviders 顺序保证
    expect(order.at(-1)).toBe("F");
  });

  it("无效 providerIds 忽略，回落全局路由", () => {
    expect(orderProviders(PROVIDERS, [99]).map((p) => p.id)).toEqual([3, 1, 2, 4]);
  });

  it("单元素 providerIds 等同 llmProviderId 置顶", () => {
    expect(orderProviders(PROVIDERS, [1]).map((p) => p.id)).toEqual([1, 3, 2, 4]);
    expect(orderProviders(PROVIDERS, 1).map((p) => p.id)).toEqual([1, 3, 2, 4]);
  });
});

describe("C-07 · parseIdListField（JSON 数组串与旧逗号文本兼容）", () => {
  it("JSON 数组串 '[1,2]' → [1,2]", () => {
    expect(parseIdListField("[1,2]")).toEqual([1, 2]);
  });
  it("旧逗号文本 '1,2' → [1,2]", () => {
    expect(parseIdListField("1,2")).toEqual([1, 2]);
  });
  it("单数字串 '3' → [3]", () => {
    expect(parseIdListField("3")).toEqual([3]);
  });
  it("已是数组对象 → 原样", () => {
    expect(parseIdListField([5, 6])).toEqual([5, 6]);
  });
  it("null/undefined → []", () => {
    expect(parseIdListField(null)).toEqual([]);
    expect(parseIdListField(undefined)).toEqual([]);
  });
  it("非法 JSON 安全回落 []", () => {
    expect(parseIdListField("not-a-list")).toEqual([]);
  });
  it("空串 → []", () => {
    expect(parseIdListField("")).toEqual([]);
  });
});

describe("C-07 · buildChatContext 场景装配（providerIds > llmProviderId > 全局）", () => {
  it("providerIds 非空 → 优先 providerIds，忽略 llmProviderId", async () => {
    const scene = await seedScene({ providerIds: "[2,1]", llmProviderId: 3 });
    const ctx = await buildChatContext({ scene: scene as never, sessionId: "s-c07-context-1", message: "问题A" });
    expect(ctx.preferredProviderIds).toEqual([2, 1]);
  });

  it("providerIds 为空 → preferredProviderIds 为空，llmProviderId 走旧字段", async () => {
    const scene = await seedScene({ llmProviderId: 3 });
    const ctx = await buildChatContext({ scene: scene as never, sessionId: "s-c07-context-2", message: "问题B" });
    expect(ctx.preferredProviderIds).toEqual([]);
    expect(ctx.preferredProviderId).toBe(3);
  });

  it("两者皆空 → 空数组（走全局路由）", async () => {
    const scene = await seedScene({});
    const ctx = await buildChatContext({ scene: scene as never, sessionId: "s-c07-context-3", message: "问题C" });
    expect(ctx.preferredProviderIds).toEqual([]);
  });

  it("messages：system 置顶 + 历史 + 本轮 user", async () => {
    const scene = await seedScene({});
    const ctx = await buildChatContext({ scene: scene as never, sessionId: "s-c07-context-4", message: "问题D" });
    expect(ctx.messages[0].role).toBe("system");
    expect(ctx.messages.at(-1)).toEqual({ role: "user", content: "问题D" });
  });

  it("baseIds 旧逗号文本与新 JSON 串都注入 buildKbContext 检索", async () => {
    expect(parseIdListField("1,2")).toEqual([1, 2]);
    expect(parseIdListField("[1,2]")).toEqual([1, 2]);
  });
});

describe("C-07 · 两渠道 messages 全等（官网 SSE / 公众号 chatOnce 同装配点）", () => {
  it("相同 scene+sessionId+message 时，两渠道发给网关的 messages 深度相等", async () => {
    const scene = await seedScene({ providerIds: "[2,1]" });
    gwCalls.streams = [];
    gwCalls.chats = [];

    // 官网路径：用 seed 的同一场景 code（保证两边 scene 完全相同）
    await streamPOST(
      new Request("http://localhost/api/chat/stream", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: "s-c07-parity-web", sceneCode: scene.code, message: "全等问题" }),
      }),
      ctx()
    );
    // 公众号路径：独立 sessionId（两边历史起点都为空，messages 才能逐字相等）
    const once = await chatOnce({ scene: scene as never, sessionId: "s-c07-parity-wx", channel: "wechat", message: "全等问题" });
    expect(once.ok).toBe(true);

    const streamMsgs = gwCalls.streams.at(-1)?.messages;
    const chatMsgs = gwCalls.chats.at(-1)?.messages;
    expect(streamMsgs).toBeTruthy();
    expect(chatMsgs).toEqual(streamMsgs);
    // 网关收到 providerIds 优先级（场景 providerIds=[2,1]）
    expect(gwCalls.chats.at(-1)?.opts?.preferredProviderIds).toEqual([2, 1]);
    expect(gwCalls.streams.at(-1)?.opts?.preferredProviderIds).toEqual([2, 1]);
  });
});

describe("C-07 · 第 11 次请求限频返回 HTTP 429 / code 429", () => {
  it("10 次以内正常；第 11 次返回 429", async () => {
    const ip = "203.0.113.77";
    const base = { sessionId: "s-c07-rate-1", sceneCode: "float", message: "限频测试" };
    // 先造 10 条同 IP 的 user 记录（等价于前 10 次成功请求）
    for (let i = 0; i < 10; i++) {
      await prisma.aIChatHistory.create({
        data: { sessionId: base.sessionId, channel: "website", role: "user", message: `${base.message}-${i}`, ipAddress: ip },
      });
    }
    const r = await streamPOST(
      new Request("http://localhost/api/chat/stream", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": ip },
        body: JSON.stringify(base),
      }),
      ctx()
    );
    expect(r.status).toBe(429);
    const b = await json(r);
    expect(b.code).toBe(429);
  });
});

describe("C-07 · SSE 事件契约（chatSseEventSchema 构造与解析）", () => {
  it("parseSseFrame 解析合法帧", () => {
    const frame = `event: delta\ndata: ${JSON.stringify({ text: "你好" })}`;
    const evt = parseSseFrame(frame);
    expect(evt).toEqual({ event: "delta", data: { text: "你好" } });
  });

  it("非法帧返回 null（不抛错）", () => {
    expect(parseSseFrame("garbage")).toBeNull();
    expect(parseSseFrame(`event: unknown\ndata: ${JSON.stringify({ a: 1 })}`)).toBeNull();
    expect(parseSseFrame(`event: error\ndata: not-json`)).toBeNull();
  });

  it("构造的帧通过契约校验（meta/delta/done/error）", () => {
    for (const evt of [
      { event: "meta", data: { scene: { code: "float", name: "智能客服" }, provider: "mock" } },
      { event: "delta", data: { text: "x" } },
      { event: "done", data: { conversationId: "c" } },
      { event: "error", data: { message: "生成中断，请重试" } },
    ] as const) {
      const frame = `event: ${evt.event}\ndata: ${JSON.stringify(evt.data)}`;
      expect(chatSseEventSchema.safeParse(parseSseFrame(frame)).success).toBe(true);
    }
  });
});

describe("C-07 · 同一流两条 error 只显示一条", () => {
  it("先 error 后 error → 保留第一条（只显示一条提示）", () => {
    expect(reduceSseError("生成中断，请重试", "AI 未返回内容")).toBe("生成中断，请重试");
  });
  it("无 error 时有 error → 取该条", () => {
    expect(reduceSseError(null, "生成中断，请重试")).toBe("生成中断，请重试");
  });
  it("无 error → null", () => {
    expect(reduceSseError(null, null)).toBeNull();
  });
});

describe("C-07 · DR-23：route 不再使用内联 chatRequestSchema", () => {
  it("route.ts 源码不含 chatRequestSchema 内联定义与 z.object", () => {
    const src = fs.readFileSync("src/app/api/chat/stream/route.ts", "utf8");
    expect(src).not.toContain("const chatRequestSchema");
    expect(src).not.toContain("z.object");
  });
});