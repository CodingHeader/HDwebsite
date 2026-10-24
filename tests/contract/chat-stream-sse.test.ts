/**
 * V8-T-02：/api/chat/stream SSE 契约测试（清零最后 1 条契约 skip）
 *
 * 背景：`tests/contract/rules.ts` 里 /chat/stream 长期标 skip，理由「SSE 非 JSON 信封」。
 * 该理由只说明「不能用通用的四场景断言」，不等于「无法测」——SSE 有自己的线格式契约
 * （`src/contracts/chat.ts` 的 `chatSseEventSchema`：meta → delta* → done，异常时 error）。
 *
 * 本文件把 SSE 拆成 3 个场景，逐帧按契约校验：
 *   1. 正常流：首帧 meta，中间 delta，末帧 done（且每帧都能被 chatSseEventSchema 解析）
 *   2. 上游失败：HTTP 422/502 的 JSON 信封（流开始前的失败不走 SSE，见 contracts/chat.ts 注释）
 *   3. 流中途失败：发出 error 帧（不再有 done）
 *
 * 手法：mock @/lib/llm-gateway 与 @/lib/chat-service，不触网、不依赖真实 DB 数据。
 * 真实 handler 直接调用，验证的是路由的真实装配逻辑（不是另写一份假实现）。
 */
import { describe, expect, it, vi } from "vitest";
import { chatSseEventSchema } from "@/contracts/chat";

// ── 可控的网关/场景 mock ──────────────────────────────────────
type StreamBehavior =
  | { kind: "ok"; chunks: string[]; providerName?: string }
  | { kind: "fail"; status?: number; errMsg: string }
  | { kind: "throwMid"; chunks: string[]; errMsg: string };

const state: { behavior: StreamBehavior } = { behavior: { kind: "ok", chunks: ["你好", "，我是客服"] } };

vi.mock("@/lib/llm-gateway", () => ({
  gatewayChatStream: async () => {
    const b = state.behavior;
    if (b.kind === "fail") {
      return { ok: false, status: b.status ?? 502, errMsg: b.errMsg };
    }
    const enc = new TextEncoder();
    const chunks = b.chunks;
    const midThrow = b.kind === "throwMid" ? b.errMsg : null;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const c of chunks) controller.enqueue(enc.encode(c));
        if (midThrow) controller.error(new Error(midThrow));
        else controller.close();
      },
    });
    return { ok: true, providerName: "mock-provider", providerId: 1, stream };
  },
  recordGatewayFailure: async () => undefined,
}));

vi.mock(import("@/lib/chat-service"), async (importOriginal) => ({
  ...(await importOriginal()),
  findScene: async () => ({ code: "float", name: "智能客服", greeting: null }),
  buildChatContext: async () => ({
    messages: [{ role: "user", content: "hi" }],
    preferredProviderId: null,
    preferredProviderIds: [],
    overrides: {},
    isRetry: false,
    guard: { kind: "ok" },
  }),
  recordMessage: async () => undefined,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    aIChatHistory: {
      count: async () => 0,
      create: async () => ({}),
    },
  },
}));

vi.mock("@/lib/api-handler", async (orig) => {
  const actual = await orig<typeof import("@/lib/api-handler")>();
  return actual; // 保留真实实现（我们要验证真实 withApi 装配）
});

const { POST } = await import("@/app/api/chat/stream/route");
// V11-SEC-04：会话改服务端签发——测试用同源 helper 生成签名 cookie
const { signChatSession } = await import("@/lib/chat-service");

function req(body: unknown) {
  return new Request("http://localhost/api/chat/stream", {
    method: "POST",
    headers: { "content-type": "application/json", Cookie: `chat_sid=${signChatSession(String((body as { sessionId: string }).sessionId))}` },
    body: JSON.stringify(body),
  });
}

/** 把 ReadableStream 读完并按帧切分，逐帧过契约校验 */
async function readSse(res: Response): Promise<ReturnType<typeof chatSseEventSchema.parse>[]> {
  const text = await res.text();
  const frames = text.split("\n\n").filter((f) => f.trim());
  return frames.map((f) => {
    const parsed = parseFrame(f);
    // 每一帧都必须满足契约，否则 parseFrame 会抛
    return chatSseEventSchema.parse(parsed);
  });
}

function parseFrame(frame: string): unknown {
  const lines = frame.split("\n");
  const event = lines.find((l) => l.startsWith("event:"))?.slice(6).trim();
  const dataLine = lines.find((l) => l.startsWith("data:"))?.slice(5).trim();
  return { event, data: dataLine ? JSON.parse(dataLine) : undefined };
}

describe("V8-T-02 · POST /api/chat/stream SSE 契约", () => {
  it("正常流：meta → delta* → done，且每帧满足 chatSseEventSchema", async () => {
    state.behavior = { kind: "ok", chunks: ["你好", "，我是客服"] };

    const res = await POST(
      req({ sessionId: "sess-t02-0001", sceneCode: "float", message: "我想咨询专升本" })
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");

    const events = await readSse(res);

    // 首帧必须是 meta（携带场景与供应方）
    expect(events[0].event).toBe("meta");
    // 中间是 delta，拼接后等于上游输出的完整文本
    const deltas = events.filter((e) => e.event === "delta") as { event: "delta"; data: { text: string } }[];
    expect(deltas.map((d) => d.data.text).join("")).toBe("你好，我是客服");
    // 末帧必须是 done，且带 conversationId
    const last = events[events.length - 1];
    expect(last.event).toBe("done");
    expect((last as { data: { conversationId: string } }).data.conversationId).toBe("sess-t02-0001");
    // 正常流不应出现 error
    expect(events.some((e) => e.event === "error")).toBe(false);
  });

  it("流开始前的上游失败 → JSON 信封（不走 SSE），状态码与 message 符合契约", async () => {
    state.behavior = { kind: "fail", status: 502, errMsg: "mock 上游不可用" };

    const res = await POST(
      req({ sessionId: "sess-t02-0002", sceneCode: "float", message: "hi" })
    );

    // contracts/chat.ts：「流开始前」的失败仍是 JSON 信封
    expect(res.status).toBe(502);
    expect(res.headers.get("content-type") ?? "").toContain("application/json");
    const body = (await res.json()) as { code: number; message: string };
    expect(body.code).toBe(502);
    expect(body.message).toContain("mock 上游不可用");
  });

  it("流中途失败 → 发出 error 帧（且不再发 done）", async () => {
    state.behavior = { kind: "throwMid", chunks: ["部分"], errMsg: "断了" };

    const res = await POST(
      req({ sessionId: "sess-t02-0003", sceneCode: "float", message: "hi" })
    );
    expect(res.status).toBe(200);

    const events = await readSse(res);

    // 至少一帧 error，且 message 非空
    const errors = events.filter((e) => e.event === "error") as { event: "error"; data: { message: string } }[];
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0].data.message.length).toBeGreaterThan(0);
    // 中断后不应再有 done
    expect(events.some((e) => e.event === "done")).toBe(false);
  });

  it("请求体非法 → 400 JSON 信封（不是 SSE）", async () => {
    state.behavior = { kind: "ok", chunks: ["x"] };

    const res = await POST(req({ sessionId: "short", message: "" }));

    expect(res.status).toBe(400);
    expect(res.headers.get("content-type") ?? "").toContain("application/json");
  });
});
