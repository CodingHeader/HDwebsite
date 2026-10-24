/**
 * V11-COMPAT-01：旧 API 入口兼容（契约级：状态码 + 落点）
 * ==========================================================
 * 映射表（main@94dbbbb → upgrade 现役）：
 *   GET  /api/ai-config       → 307 /api/llm/providers
 *   POST /api/ai-config       → 307 /api/llm/providers
 *   GET  /api/ai-config/[id]  → 307 /api/llm/providers/[id]
 *   PUT  /api/ai-config/[id]  → 307 /api/llm/providers/[id]
 *   DEL  /api/ai-config/[id]  → 307 /api/llm/providers/[id]
 *   POST /api/chat/completion → 适配转发 chat-service#chatOnce（旧 JSON 信封）
 * 现役端点行为不受影响：/api/chat/stream、/api/llm/providers 既有用例在本套件之外全部保持绿。
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const tmp = process.env.TMPDIR || process.env.TEMP || "/tmp";
  process.env.DATABASE_URL = `file:${tmp}/hdw-contract-v11compat-${process.pid}-${Date.now()}.db`;
});

const gatewayState = vi.hoisted(() => ({ fail: false, calls: [] as { messages: unknown; opts: unknown }[] }));

vi.mock("@/lib/llm-gateway", async (orig) => {
  const real = await orig<typeof import("@/lib/llm-gateway")>();
  return {
    ...real,
    gatewayChat: async (messages: unknown, opts: unknown) => {
      gatewayState.calls.push({ messages, opts });
      if (gatewayState.fail) return { ok: false, reply: "", errMsg: "MockProvider: mock 上游失败", status: 502 };
      return { ok: true, reply: "您好，专升本报名请携带身份证。", providerId: 1, providerName: "MockProvider" };
    },
  };
});

import { prisma } from "@/lib/prisma";
import { cleanupTestDb, initTestDb } from "./api-contract/harness";
import { GET as aiConfigGET, POST as aiConfigPOST } from "@/app/api/ai-config/route";
import { GET as aiConfigIdGET, PUT as aiConfigIdPUT, DELETE as aiConfigIdDELETE } from "@/app/api/ai-config/[id]/route";
import { POST as chatCompletionPOST } from "@/app/api/chat/completion/route";

function jsonReq(url: string, body?: unknown, init: RequestInit = {}): Request {
  return new Request(`http://localhost${url}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "10.0.0.1" },
    body: body === undefined ? undefined : JSON.stringify(body),
    ...init,
  });
}

beforeAll(async () => {
  await initTestDb();
});
afterAll(async () => {
  await prisma.$disconnect();
  cleanupTestDb();
});

describe("V11-COMPAT-01 · /api/ai-config → /api/llm/providers（307）", () => {
  it("GET /api/ai-config → 307，落点 /api/llm/providers，查询串透传", async () => {
    const res = await aiConfigGET(new Request("http://localhost/api/ai-config?page=2&keyword=a"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/api/llm/providers?page=2&keyword=a");
  });

  it("POST /api/ai-config → 307 同落点（方法保留语义由 307 承担）", async () => {
    const res = await aiConfigPOST(new Request("http://localhost/api/ai-config", { method: "POST" }));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/api/llm/providers");
  });

  it.each([
    ["GET", aiConfigIdGET],
    ["PUT", aiConfigIdPUT],
    ["DELETE", aiConfigIdDELETE],
  ] as const)("%s /api/ai-config/123 → 307，落点 /api/llm/providers/123", async (_method, handler) => {
    const res = await handler(new Request("http://localhost/api/ai-config/123", { method: _method }), {
      params: Promise.resolve({ id: "123" }),
    });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/api/llm/providers/123");
  });
});

describe("V11-COMPAT-01 · POST /api/chat/completion（适配转发 chat-service）", () => {
  it("旧契约请求 → 200 旧 JSON 信封（reply/model/responseTime/scene）", async () => {
    const res = await chatCompletionPOST(
      jsonReq("/api/chat/completion", {
        messages: [
          { role: "system", content: "sys" },
          { role: "user", content: "报名需要什么材料" },
        ],
        sceneCode: "float",
        sessionId: "abc123",
      })
    );
    expect(res.status).toBe(200);
    const j = (await res.json()) as { code: number; data: Record<string, unknown>; message: string };
    expect(j.code).toBe(200);
    expect(j.message).toBe("ok");
    expect(j.data.reply).toContain("身份证");
    expect(j.data.model).toBe("MockProvider");
    expect(j.data.tokensUsed).toBeNull();
    expect(typeof j.data.responseTime).toBe("number");
    expect(j.data.scene).toBeNull(); // 测试库无 float 场景 → 旧契约口径 scene=null
    // 转发内容：最后一条 user 消息进入网关
    const call = gatewayState.calls.at(-1) as { messages: { role: string; content: string }[] };
    expect(call.messages.at(-1)).toMatchObject({ role: "user", content: "报名需要什么材料" });
  });

  it("无 user 消息 / messages 为空 / 超长 → 400", async () => {
    const noUser = await chatCompletionPOST(
      jsonReq("/api/chat/completion", { messages: [{ role: "assistant", content: "hi" }] })
    );
    expect(noUser.status).toBe(400);

    const empty = await chatCompletionPOST(jsonReq("/api/chat/completion", { messages: [] }));
    expect(empty.status).toBe(400);

    const tooLong = await chatCompletionPOST(
      jsonReq("/api/chat/completion", { messages: [{ role: "user", content: "x".repeat(4001) }] })
    );
    expect(tooLong.status).toBe(400);
  });

  it("网关失败 → 502 信封（错误透传，旧客户端可感知）", async () => {
    gatewayState.fail = true;
    const res = await chatCompletionPOST(
      jsonReq("/api/chat/completion", { messages: [{ role: "user", content: "在吗" }] })
    );
    expect(res.status).toBe(502);
    const j = (await res.json()) as { code: number; data: null; message: string };
    expect(j.data).toBeNull();
    expect(j.message).toContain("mock 上游失败");
    gatewayState.fail = false;
  });

  it("会话隔离：旧 sessionId 以 legacy- 前缀落库，不与官网 UUID 会话混淆", async () => {
    await chatCompletionPOST(
      jsonReq("/api/chat/completion", { messages: [{ role: "user", content: "学费多少" }], sessionId: "legacy-check" })
    );
    const rows = await prisma.aIChatHistory.findMany({ where: { sessionId: "legacy-legacy-check" } });
    expect(rows.length).toBeGreaterThanOrEqual(2); // user + assistant
  });
});
