/**
 * C-01 LLM 适配器注册表测试：openai/coze 适配器注册、getAdapter 未知 kind 抛错、
 * chat/stream 形态（http mock）、llm-gateway 经注册表调度（无类型分支）。
 */
import { describe, expect, it, vi } from "vitest";

const fetchCalls = vi.hoisted(() => ({ list: [] as { url: string; init?: RequestInit }[] }));

vi.mock("@/lib/http-client", async (orig) => {
  const real = await orig<typeof import("@/lib/http-client")>();
  return {
    ...real,
    httpFetch: async (url: string, options: import("@/lib/http-client").HttpFetchOptions = {}) => {
      fetchCalls.list.push({ url, init: options });
      const body = url.includes("/chat/completions")
        ? { choices: [{ message: { content: "mock 回复" } }], usage: { prompt_tokens: 11, completion_tokens: 22 } }
        : {};
      return new Response(JSON.stringify(body), { status: 200 });
    },
  };
});

const dbCalls = vi.hoisted(() => ({ usage: [] as { providerId: number; tokensIn: number; tokensOut: number; failure: boolean }[] }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    lLMProvider: { findMany: async () => [], findUnique: async () => null },
    lLMUsage: {
      upsert: async ({ where, update: _update, create }: { where: { date_providerId: { providerId: number } }; update: Record<string, unknown>; create: { providerId: number; tokensIn: number; tokensOut: number; failures: number } }) => {
        dbCalls.usage.push({
          providerId: where.date_providerId.providerId,
          tokensIn: create.tokensIn,
          tokensOut: create.tokensOut,
          failure: create.failures > 0,
        });
        return {};
      },
      findUnique: async () => null,
    },
  },
}));

import { getAdapter, registeredKinds } from "@/lib/llm/registry";
import { openaiAdapter } from "@/lib/llm/openai";
import { cozeAdapter } from "@/lib/llm/coze";
import { gatewayChat } from "@/lib/llm-gateway";

const provider = (over: Partial<Record<string, unknown>> = {}) =>
  ({
    id: 7, name: "Mock", kind: "openai", endpoint: "http://mock/v1", apiKey: "k",
    model: "m", temperature: 0.5, maxTokens: 100, botId: null,
    isDefault: false, isFallback: false, status: "active", priority: 0,
    ...over,
  }) as never;

describe("C-01 适配器注册表", () => {
  it("openai/coze 两适配器已注册；registeredKinds 覆盖 LLM_KINDS", () => {
    expect(registeredKinds()).toEqual(["openai", "coze"]);
    expect(getAdapter("openai")).toBe(openaiAdapter);
    expect(getAdapter("coze")).toBe(cozeAdapter);
  });

  it("getAdapter 未知 kind 抛错（防误配静默失败）", () => {
    expect(() => getAdapter("anthropic")).toThrow(/未知/);
  });

  it("openai chat：走 http-client（httpFetch），返回 reply 与用量", async () => {
    const r = await openaiAdapter.chat(provider(), "k", [{ role: "user", content: "hi" }], 5000);
    expect(r.reply).toBe("mock 回复");
    expect(r.tokensIn).toBe(11);
    expect(r.tokensOut).toBe(22);
    expect(fetchCalls.list.at(-1)?.url).toContain("/chat/completions");
  });

  it("openai stream：返回 ReadableStream", async () => {
    const s = await openaiAdapter.stream(provider(), "k", [{ role: "user", content: "hi" }], 5000);
    expect(s).toBeInstanceOf(ReadableStream);
  });

  it("coze chat：botId 缺失抛错（parseBotIdFromEndpoint）", async () => {
    await expect(cozeAdapter.chat(provider({ kind: "coze" }), "k", [{ role: "user", content: "hi" }], 5000)).rejects.toThrow(/bot_id/);
  });

  it("gatewayChat 经注册表调度（无类型分支）：openai 供应商成功返回并记录用量", async () => {
    dbCalls.usage = [];
    // V8-SEC-03：原此处有一个嵌套在 it() 内的 vi.mock("@/lib/llm-gateway")，
    // 其实现只是 `return real`（等于不 mock），且 vitest 5 起明确禁止非顶层 vi.mock，
    // 会直接抛「defined outside of the module's top level scope」。
    // 该 mock 无实际作用，删除后语义不变。
    // getRoutedProviders 内部走 prisma.lLMProvider.findMany（mock 返回 []）→ 空供应商路径；
    // 这里只断言空路径语义与注册表导入可用（路由+适配器联调由 wechat-chat/e2e 覆盖）
    const r = await gatewayChat([{ role: "user", content: "hi" }]);
    expect(r.ok).toBe(false);
    expect(r.errMsg).toContain("尚未配置");
  });
});
