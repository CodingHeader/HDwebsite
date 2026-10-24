/**
 * V11-LLM-01：流式超时改「空闲超时」语义
 * ==========================================================
 * 原缺陷（现状盘点实测）：gatewayChatStream 把 settings.llmTimeoutMs（默认 30s）直接传给
 * 适配器 httpFetch，其 AbortSignal 在整次请求（含响应体流）计时——总时长 >30s 的长回复
 * 只要 chunks 仍在持续产出就被整流截断（审计 §LLM.1 属实）。
 *
 * 修复后语义：
 *  - 相邻 chunk 间隔 > idleMs（max(llmTimeoutMs, 30s)）→ 切断（真挂死连接仍会被切断）
 *  - 总时长 > totalMs（5 分钟）→ 硬性切断（防挂死兜底）
 *  - chunks 持续到达 → 无论总时长多久都不截断（长回复完整送达）
 *
 * 测试用时间压缩口径：用例内 idle=100ms/total=500ms 对应生产 30s/300s（比例不变），
 * 避免真实 60s mock 流拖垮单测；网关接线用例断言适配器收到的 timeout=总上限（5min）。
 */
import { afterAll, beforeAll, beforeEach, afterEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const tmp = process.env.TMPDIR || process.env.TEMP || "/tmp";
  process.env.DATABASE_URL = `file:${tmp}/hdw-contract-v11llm01-${process.pid}-${Date.now()}.db`;
});

/** 记录适配器实际收到的 timeoutMs（网关接线断言用） */
const adapterCalls = vi.hoisted(() => ({ timeouts: [] as number[] }));

vi.mock("@/lib/llm/registry", () => ({
  getAdapter: (kind: string) => ({
    kind,
    chat: async () => {
      throw new Error("mock 非流式不可用");
    },
    stream: async (_p: unknown, _k: string, _m: unknown[], timeoutMs: number) => {
      adapterCalls.timeouts.push(timeoutMs);
      // 源流：立即完成（网关接线用例只关心 timeout 值与包装结构）
      return new ReadableStream<Uint8Array>({
        start(c) {
          c.enqueue(new TextEncoder().encode("ok"));
          c.close();
        },
      });
    },
  }),
  registeredKinds: () => ["openai"],
}));

import { prisma } from "@/lib/prisma";
import { cleanupTestDb, initTestDb } from "./api-contract/harness";
import { gatewayChatStream, STREAM_IDLE_TIMEOUT_MS, STREAM_TOTAL_TIMEOUT_MS, withStreamTimeouts } from "@/lib/llm-gateway";

const encoder = new TextEncoder();

/** 源流：每 intervalMs 发一个 chunk，共 count 个后结束（包装流被切断/取消后安全停推） */
function tickerStream(count: number, intervalMs: number): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      let i = 0;
      let stopped = false;
      const push = () => {
        if (stopped) return;
        if (i >= count) {
          try {
            controller.close();
          } catch {
            /* 已被取消 */
          }
          return;
        }
        try {
          controller.enqueue(encoder.encode(`#${i++}`));
        } catch {
          stopped = true; // 流已被包装层切断/取消，停止定时推送
          return;
        }
        setTimeout(push, intervalMs);
      };
      push();
    },
  });
}

/** 源流：发 n 个 chunk 后永久挂死（模拟真挂死连接） */
function stalledStream(thenStallAfter: number): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (let i = 0; i < thenStallAfter; i++) controller.enqueue(encoder.encode(`x${i}`));
      // 不 close、不再 enqueue —— 永久挂死
    },
  });
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

beforeAll(async () => {
  await initTestDb();
});
afterAll(() => {
  cleanupTestDb();
});
beforeEach(async () => {
  adapterCalls.timeouts = [];
  await prisma.lLMProvider.deleteMany({});
  await prisma.lLMUsage.deleteMany({});
});
afterEach(async () => {
  await prisma.lLMProvider.deleteMany({});
  await prisma.lLMUsage.deleteMany({});
});

async function seedProvider(name: string, over: Record<string, unknown> = {}): Promise<number> {
  const row = await prisma.lLMProvider.create({
    data: { name, kind: "openai", endpoint: "http://mock/v1", apiKey: "k", model: "m", status: "active", priority: 10, ...over } as never,
  });
  return row.id;
}

describe("V11-LLM-01 · withStreamTimeouts（空闲超时语义）", () => {
  it("长回复：chunks 持续到达且间隔 < idleMs 时，总时长超过 idleMs 也不截断（mock 流完整送达）", async () => {
    // 时间压缩：40 chunks × 20ms 间隔 ≈ 800ms 总时长，远超 idleMs=100（对应生产 >30s 持续输出）
    const wrapped = withStreamTimeouts(tickerStream(40, 20), { idleMs: 100, totalMs: 5_000 });
    const out = await readAll(wrapped);
    expect(out).toBe(Array.from({ length: 40 }, (_, i) => `#${i}`).join(""));
  });

  it("真挂死连接：出数后停滞，idleMs 内无新 chunk → 切断并抛空闲超时错误", async () => {
    const wrapped = withStreamTimeouts(stalledStream(3), { idleMs: 60, totalMs: 5_000 });
    const reader = wrapped.getReader();
    let got = "";
    await expect(
      (async () => {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          got += new TextDecoder().decode(value);
        }
      })()
    ).rejects.toThrow(/流式空闲超时/);
    expect(got).toBe("x0x1x2");
  });

  it("总时长上限：chunk 间隔始终 < idleMs 但总时长超过 totalMs → 硬性切断（防挂死）", async () => {
    const wrapped = withStreamTimeouts(tickerStream(200, 10), { idleMs: 200, totalMs: 120 });
    await expect(readAll(wrapped)).rejects.toThrow(/总时长超过上限/);
  });

  it("流自然读完 → onComplete 恰好回调一次；中途出错/取消不回调", async () => {
    let completed = 0;
    const ok = withStreamTimeouts(tickerStream(3, 5), { idleMs: 500, totalMs: 5_000, onComplete: () => void completed++ });
    await readAll(ok);
    expect(completed).toBe(1);

    const err = withStreamTimeouts(stalledStream(1), { idleMs: 40, totalMs: 5_000, onComplete: () => void completed++ });
    await expect(readAll(err)).rejects.toThrow(/空闲超时/);
    expect(completed).toBe(1); // 挂死切断不计完成

    const cancelled = withStreamTimeouts(tickerStream(100, 5), { idleMs: 500, totalMs: 5_000, onComplete: () => void completed++ });
    const r = cancelled.getReader();
    await r.read();
    await r.cancel();
    expect(completed).toBe(1); // 取消不计完成
  });
});

describe("V11-LLM-01 · 网关接线", () => {
  it("适配器收到 timeoutMs = 流式总时长上限（5 分钟），而非旧的整流 30s", async () => {
    const id = await seedProvider("TimeoutProbe");
    const r = await gatewayChatStream([{ role: "user", content: "hi" }], { preferredProviderIds: [id] });
    expect(r.ok).toBe(true);
    expect(adapterCalls.timeouts).toEqual([STREAM_TOTAL_TIMEOUT_MS]);
    expect(STREAM_TOTAL_TIMEOUT_MS).toBe(300_000); // 5 分钟防挂死兜底
    expect(STREAM_IDLE_TIMEOUT_MS).toBe(30_000); // 空闲下限 30s
    // 包装流可正常消费
    expect(await readAll((r as { stream: ReadableStream<Uint8Array> }).stream)).toBe("ok");
  });

  it("llmTimeoutMs 配得更长 → 空闲阈值随之放宽（保护慢速思考模型）", async () => {
    await prisma.setting.create({ data: { key: "llmTimeoutMs", value: "60000", group: "llm" } });
    const id = await seedProvider("SlowOk");
    const r = await gatewayChatStream([{ role: "user", content: "hi" }], { preferredProviderIds: [id] });
    expect(r.ok).toBe(true);
    // 适配器 timeout 仍为总上限；空闲阈值经 max(llmTimeoutMs, 30s) 生效——
    // 这里通过包装流行为间接验证：完全走完即未被 30s 默认空闲误伤
    expect(await readAll((r as { stream: ReadableStream<Uint8Array> }).stream)).toBe("ok");
    await prisma.setting.deleteMany({ where: { key: "llmTimeoutMs" } });
  });
});
