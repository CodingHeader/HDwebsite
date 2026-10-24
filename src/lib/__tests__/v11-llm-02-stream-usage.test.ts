/**
 * V11-LLM-02：流式 tokens 计量修正
 * ==========================================================
 * 原缺陷（现状盘点实测）：
 *  1. gatewayChatStream 在流启动时记 recordUsage(0,0,false)——tokens 恒为 0，且流中途失败时
 *     再叠加 recordGatewayFailure → 一次尝试计 2 次 calls（双计）；
 *  2. openai 适配器解析 SSE 时丢弃尾帧 usage。
 * 修复后语义：
 *  - usage 从流尾帧取值（openai 适配器解析 usage 帧 → onUsage 回调 → 网关收尾一次记录）
 *  - 无 usage 帧 → tokensIn/tokensOut 记 0（不虚构估算；ADR-034 D1 偏差保持：聚合口径，不加列）
 *  - 成功用量只在流自然读完时记一次；失败/重试路径不记成功用量、不双计
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const tmp = process.env.TMPDIR || process.env.TEMP || "/tmp";
  process.env.DATABASE_URL = `file:${tmp}/hdw-contract-v11llm02-${process.pid}-${Date.now()}.db`;
});

/** 每供应商的流式行为脚本（测试内注入） */
const streamScripts = vi.hoisted(() => ({
  byProvider: new Map<string, () => { chunks: string[]; usage?: { tokensIn: number; tokensOut: number }; failAtStart?: boolean }>(),
  onUsageSeen: [] as { tokensIn: number; tokensOut: number }[],
}));

vi.mock("@/lib/llm/registry", () => ({
  getAdapter: (kind: string) => ({
    kind,
    chat: async () => {
      throw new Error("mock 非流式不可用");
    },
    stream: async (provider: { name: string }, _k: string, _m: unknown[], _t: number, _o: unknown, onUsage?: (u: { tokensIn: number; tokensOut: number }) => void) => {
      const script = streamScripts.byProvider.get(provider.name) ?? (() => ({ chunks: [], failAtStart: true }));
      const s = script();
      if (s.failAtStart) throw new Error("mock 上游连接失败");
      const enc = new TextEncoder();
      return new ReadableStream<Uint8Array>({
        start(c) {
          for (const ch of s.chunks) c.enqueue(enc.encode(ch));
          if (s.usage) {
            streamScripts.onUsageSeen.push(s.usage);
            onUsage?.(s.usage);
          }
          c.close();
        },
      });
    },
  }),
  registeredKinds: () => ["openai"],
}));

import { prisma } from "@/lib/prisma";
import { cleanupTestDb, initTestDb } from "./api-contract/harness";
import { gatewayChatStream } from "@/lib/llm-gateway";

const BEIJING_TODAY = usageDateToday();
function usageDateToday(): string {
  return new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
}

async function seedProvider(name: string, over: Record<string, unknown> = {}): Promise<number> {
  const row = await prisma.lLMProvider.create({
    data: { name, kind: "openai", endpoint: "http://mock/v1", apiKey: "k", model: "m", status: "active", priority: 10, ...over } as never,
  });
  return row.id;
}

async function readAll(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    out += new TextDecoder().decode(value);
  }
  return out;
}

async function usageRow(providerId: number): Promise<{ calls: number; tokensIn: number; tokensOut: number; failures: number } | null> {
  return prisma.lLMUsage.findUnique({
    where: { date_providerId: { date: BEIJING_TODAY, providerId } },
    select: { calls: true, tokensIn: true, tokensOut: true, failures: true },
  });
}

beforeAll(async () => {
  await initTestDb();
});
afterAll(() => {
  cleanupTestDb();
});
beforeEach(async () => {
  streamScripts.byProvider.clear();
  streamScripts.onUsageSeen = [];
  await prisma.lLMProvider.deleteMany({});
  await prisma.lLMUsage.deleteMany({});
});
afterEach(async () => {
  await prisma.lLMProvider.deleteMany({});
  await prisma.lLMUsage.deleteMany({});
});

describe("V11-LLM-02 · 流式 usage 计量", () => {
  it("mock 流尾帧 usage → tokens 记流尾值（calls=1，无失败）", async () => {
    const id = await seedProvider("UsageTail");
    streamScripts.byProvider.set("UsageTail", () => ({
      chunks: ["您好", "，专升本", "报名请带身份证。"],
      usage: { tokensIn: 7, tokensOut: 13 },
    }));
    const r = await gatewayChatStream([{ role: "user", content: "报名材料" }], { preferredProviderIds: [id] });
    expect(r.ok).toBe(true);
    expect(await readAll((r as { stream: ReadableStream<Uint8Array> }).stream)).toBe("您好，专升本报名请带身份证。");
    const row = await usageRow(id);
    expect(row).toEqual({ calls: 1, tokensIn: 7, tokensOut: 13, failures: 0 });
    expect(streamScripts.onUsageSeen).toHaveLength(1); // usage 帧只回传一次
  });

  it("无 usage 帧 → calls=1、tokens 记 0（不虚构估算）", async () => {
    const id = await seedProvider("NoUsageFrame");
    streamScripts.byProvider.set("NoUsageFrame", () => ({ chunks: ["回答A", "回答B"] }));
    const r = await gatewayChatStream([{ role: "user", content: "hi" }], { preferredProviderIds: [id] });
    expect(r.ok).toBe(true);
    await readAll((r as { stream: ReadableStream<Uint8Array> }).stream);
    const row = await usageRow(id);
    expect(row).toEqual({ calls: 1, tokensIn: 0, tokensOut: 0, failures: 0 });
  });

  it("重试不双计：A 建连失败（记 1 call + 1 failure），B 成功（usage 只记 B 一次）", async () => {
    const a = await seedProvider("FailA", { priority: 1 });
    const b = await seedProvider("OkB", { priority: 2 });
    streamScripts.byProvider.set("FailA", () => ({ chunks: [], failAtStart: true }));
    streamScripts.byProvider.set("OkB", () => ({ chunks: ["B的回答"], usage: { tokensIn: 5, tokensOut: 9 } }));

    const r = await gatewayChatStream([{ role: "user", content: "hi" }], { preferredProviderIds: [a, b] });
    expect(r.ok).toBe(true);
    await readAll((r as { stream: ReadableStream<Uint8Array> }).stream);

    const rowA = await usageRow(a);
    expect(rowA).toEqual({ calls: 1, tokensIn: 0, tokensOut: 0, failures: 1 }); // 单次失败单计
    const rowB = await usageRow(b);
    expect(rowB).toEqual({ calls: 1, tokensIn: 5, tokensOut: 9, failures: 0 }); // 只记最终成功一次
  });

  it("流中途失败：网关不记成功 usage（失败计数由上层 recordGatewayFailure 负责），调用不双计", async () => {
    const id = await seedProvider("MidFail");
    streamScripts.byProvider.set("MidFail", () => ({ chunks: ["部分"] }));
    const r = await gatewayChatStream([{ role: "user", content: "hi" }], { preferredProviderIds: [id] });
    expect(r.ok).toBe(true);
    const stream = (r as { stream: ReadableStream<Uint8Array> }).stream;
    const reader = stream.getReader();
    // 消费到正常 chunk 后模拟上游中断（包装层会 error 出去）
    await reader.read();
    await reader.cancel("模拟消费方中断");
    await new Promise((r2) => setTimeout(r2, 20));
    const row = await usageRow(id);
    expect(row).toBeNull(); // 未读完 → 不记成功 usage（不双计）
  });

  it("openai 适配器：SSE 尾帧 usage 被解析并回调（含 choices 为空的纯 usage 帧）", async () => {
    // 直接驱动真实 openai 适配器（mock httpFetch 返回 SSE 体）
    vi.doMock("@/lib/http-client", () => ({
      httpFetch: async () =>
        new Response(
          new ReadableStream<Uint8Array>({
            start(c) {
              const enc = new TextEncoder();
              const frames = [
                `data: ${JSON.stringify({ choices: [{ delta: { content: "尾帧" } }] })}\n\n`,
                `data: ${JSON.stringify({ choices: [], usage: { prompt_tokens: 11, completion_tokens: 22 } })}\n\n`,
                "data: [DONE]\n\n",
              ];
              for (const f of frames) c.enqueue(enc.encode(f));
              c.close();
            },
          }),
          { status: 200 }
        ),
    }));
    const { openaiAdapter } = await import("@/lib/llm/openai");
    const provider = { name: "x", kind: "openai", endpoint: "http://mock/v1", apiKey: "k", model: "m" } as never;
    let usage: { tokensIn: number; tokensOut: number } | null = null;
    const stream = await openaiAdapter.stream(provider, "k", [{ role: "user", content: "hi" }], 1000, {}, (u) => (usage = u));
    const reader = stream.getReader();
    let text = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      text += new TextDecoder().decode(value);
    }
    expect(text).toBe("尾帧");
    expect(usage).toEqual({ tokensIn: 11, tokensOut: 22 });
    vi.doUnmock("@/lib/http-client");
  });
});
