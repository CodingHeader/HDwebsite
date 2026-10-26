/**
 * V13-RL-01：限流单源化 + 设置驱动（用户裁决 10 次/分钟）
 * ==========================================================
 * 原缺陷（本轮取证）：/api/chat/stream 内硬编码 `RATE_LIMIT_PER_MINUTE = 10` 并按 IP 计数，
 * 与 llm/guard.ts 的设置驱动限频（默认 20、按 scene:identifier）并存 →
 *   ① 后台改「客服限流」对 IP 通道完全无效（配置失真）
 *   ② 阈值/粒度两套口径，实际有效阈值取决于谁先触发
 *
 * 修复后契约（本文件钉住）：
 *   1) **唯一数值来源** = 设置键 chatGuardRateLimitPerMin；会话级与 IP 级共用同一值
 *   2) 改设置 → IP 通道同步生效（旧代码在 rate=2 时不会触发 → 本文件即回归测试）
 *   3) 默认值 10（用户裁决），registry / guard 常量 / 此处三处一致
 *   4) IP 兜底仍存在（堵"换会话绕过"），但不是独立阈值
 */
import { signChatSession } from "@/lib/chat-service";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const tmp = process.env.TMPDIR || process.env.TEMP || "/tmp";
  process.env.DATABASE_URL = `file:${tmp}/hdw-contract-v13rl-${process.pid}-${Date.now()}.db`;
});

const gwCalls = vi.hoisted(() => ({ streamCount: 0 as number }));

vi.mock("@/lib/llm-gateway", async (orig) => {
  const real = await orig<typeof import("@/lib/llm-gateway")>();
  return {
    ...real,
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
import { cleanupTestDb, ctx, initTestDb } from "./api-contract/harness";
import { POST as streamPOST } from "@/app/api/chat/stream/route";
import { GUARD_DEFAULT_RATE_LIMIT, ipCapFor, isIpCapped, __resetChatRate } from "@/lib/llm/guard";
import { getSettingDefinition } from "@/lib/settings-registry";

/** 每个用例用独立 IP，避免 DB 内 ipAddress 计数跨用例污染 */
let ipSeq = 0;
const nextIp = () => `203.0.113.${++ipSeq}`;

beforeAll(async () => {
  await initTestDb();
  // 场景数据由路由内 findScene 读取；本测试的断言不依赖 scene id，故只建不取
  await prisma.chatScene.create({
    data: {
      code: "float",
      name: "智能客服",
      greeting: "您好",
      systemPrompt: "你是弘道教育的客服助手",
      useKnowledgeBase: false,
      status: "active",
    },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
  cleanupTestDb();
});

beforeEach(() => {
  gwCalls.streamCount = 0;
  __resetChatRate();
});

async function setGuardSetting(key: string, value: string) {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value, group: "llm", isPublic: false },
  });
}

/** 带可控 IP 与签名 cookie 的 stream 请求（IP 由 x-forwarded-for 决定） */
function streamReq(body: Record<string, unknown>, ip: string): Request {
  const sid = String(body.sessionId);
  return new Request("http://localhost/api/chat/stream", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
      Cookie: `chat_sid=${signChatSession(sid)}`,
    },
    body: JSON.stringify(body),
  });
}

const newSid = () => `v13rl-sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

describe("V13-RL-01 · 默认值与单一数值来源", () => {
  it("默认值 10：guard 常量与 settings-registry 默认值一致", () => {
    expect(GUARD_DEFAULT_RATE_LIMIT).toBe(10);
    expect(getSettingDefinition("chatGuardRateLimitPerMin")?.defaultValue).toBe("10");
  });

  it("ipCapFor 由同一设置值决定（非独立硬编码阈值）", () => {
    expect(ipCapFor(2)).toBe(2);
    expect(ipCapFor(10)).toBe(10);
    expect(ipCapFor(100)).toBe(100);
    expect(ipCapFor(0)).toBe(0); // ≤0 视为不限制
    expect(isIpCapped(2, 2)).toBe(true);
    expect(isIpCapped(1, 2)).toBe(false);
    expect(isIpCapped(999, 0)).toBe(false);
  });
});

describe("V13-RL-01 · 设置驱动 IP 通道（旧代码在此必失败）", () => {
  it("设置 2 次/分 → 同一 IP 的不同会话第 3 次 429（旧代码硬编码 10 会放行）", async () => {
    await setGuardSetting("chatGuardSensitiveWords", "[]");
    await setGuardSetting("chatGuardBlacklist", "[]");
    await setGuardSetting("chatGuardRateLimitPerMin", "2");
    const ip = nextIp();

    const r1 = await streamPOST(streamReq({ sessionId: newSid(), sceneCode: "float", message: "你好" }, ip), ctx());
    const r2 = await streamPOST(streamReq({ sessionId: newSid(), sceneCode: "float", message: "你好" }, ip), ctx());
    const r3 = await streamPOST(streamReq({ sessionId: newSid(), sceneCode: "float", message: "你好" }, ip), ctx());

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r3.status).toBe(429); // ← 旧代码此处为 200（硬编码 10 不触发）
    expect(gwCalls.streamCount).toBe(2);
  });

  it("阈值调高后同一 IP 继续放行（证明跟随设置，而非写死）", async () => {
    await setGuardSetting("chatGuardSensitiveWords", "[]");
    await setGuardSetting("chatGuardRateLimitPerMin", "50");
    const ip = nextIp();

    const results: number[] = [];
    for (let i = 0; i < 5; i++) {
      const r = await streamPOST(streamReq({ sessionId: newSid(), sceneCode: "float", message: "你好" }, ip), ctx());
      results.push(r.status);
    }
    expect(results).toEqual([200, 200, 200, 200, 200]);
  });

  it("不同 IP 互不影响（IP 兜底按 IP 隔离）", async () => {
    await setGuardSetting("chatGuardSensitiveWords", "[]");
    await setGuardSetting("chatGuardRateLimitPerMin", "1");
    const ipA = nextIp();
    const ipB = nextIp();

    const a1 = await streamPOST(streamReq({ sessionId: newSid(), sceneCode: "float", message: "你好" }, ipA), ctx());
    const b1 = await streamPOST(streamReq({ sessionId: newSid(), sceneCode: "float", message: "你好" }, ipB), ctx());
    const a2 = await streamPOST(streamReq({ sessionId: newSid(), sceneCode: "float", message: "你好" }, ipA), ctx());

    expect(a1.status).toBe(200);
    expect(b1.status).toBe(200); // B 不受 A 的计数影响
    expect(a2.status).toBe(429); // A 自身超限
  });
});

describe("V13-RL-01 · 会话级限频仍由同一设置键驱动", () => {
  it("同一会话超过阈值 → 429，且网关调用次数等于放行次数", async () => {
    await setGuardSetting("chatGuardSensitiveWords", "[]");
    await setGuardSetting("chatGuardRateLimitPerMin", "2");
    const sid = newSid();
    const ip = nextIp();

    const r1 = await streamPOST(streamReq({ sessionId: sid, sceneCode: "float", message: "你好" }, ip), ctx());
    const r2 = await streamPOST(streamReq({ sessionId: sid, sceneCode: "float", message: "你好" }, ip), ctx());
    const r3 = await streamPOST(streamReq({ sessionId: sid, sceneCode: "float", message: "你好" }, ip), ctx());

    expect([r1.status, r2.status, r3.status]).toEqual([200, 200, 429]);
    expect(gwCalls.streamCount).toBe(2);
  });
});
