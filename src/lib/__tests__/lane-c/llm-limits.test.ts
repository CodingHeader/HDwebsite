/**
 * C-09 LLM dailyQuota / rateLimit 测试
 * ==========================================================
 * 覆盖任务卡 4 条验收：
 *  1. 配额满 → 跳到下一个供应商（DB 口径，跨进程一致）
 *  2. 进程内滑窗第 N+1 次 → 跳过（rateLimit）
 *  3. 全部超限 → HTTP 503（/api/chat/stream 端点级；网关返回 status 503）
 *  4. 北京时间 00:00 重置（usageDate Asia/Shanghai 日界 + 假时钟）
 * 另覆盖：dailyQuota=0 不限制（契约 min(1) 防御）、成功路径回归（502 而非 503）
 *
 * 隔离：所有 gatewayChat/gatewayChatStream 调用必须显式传 preferredProviderIds，
 * 否则会把其它用例种下的供应商拉进来，破坏 status 断言。
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";

vi.hoisted(() => {
  const tmp = process.env.TMPDIR || process.env.TEMP || "/tmp";
  process.env.DATABASE_URL = `file:${tmp}/hdw-contract-c09-${process.pid}-${Date.now()}.db`;
});

/**
 * 适配器 stub：不发起真实网络调用。
 * 网关只依赖 getAdapter(kind) → 适配器接口；配额/限频在调用前拦截，
 * 成功路径用"尝试后抛错"覆盖（配额未满 → 进入适配器 → 失败 → 502 而非 503）。
 */
vi.mock("@/lib/llm/registry", () => ({
  getAdapter: (kind: string) => ({
    kind,
    chat: async () => {
      throw new Error("mock 上游网络不可达");
    },
    stream: async () => {
      throw new Error("mock 上游网络不可达");
    },
  }),
  registeredKinds: () => ["openai", "coze"],
}));

import { prisma } from "@/lib/prisma";
import { cleanupTestDb, ctx, initTestDb, json } from "../api-contract/harness";
import { POST as streamPOST } from "@/app/api/chat/stream/route";
import { gatewayChat, gatewayChatStream } from "@/lib/llm-gateway";
import {
  __resetRateCalls,
  __setClock,
  isDailyQuotaExceeded,
  isRateLimited,
  recordRateCall,
  recentRateCalls,
  usageDate,
} from "@/lib/llm/limits";

/** 固定基准：北京 2026-10-17 10:00 = UTC 2026-10-17 02:00 */
const BASE = Date.UTC(2026, 9, 17, 2, 0, 0);
const BEIJING_TODAY = "2026-10-17";
const BEIJING_TOMORROW = "2026-10-18";
/** 北京 2026-10-18 00:00 = UTC 2026-10-17 16:00 */
const BEIJING_NEXT_MIDNIGHT_UTC = Date.UTC(2026, 9, 17, 16, 0, 0);

let clockNow = BASE;
__setClock(() => clockNow);

function advanceMs(ms: number) {
  clockNow += ms;
}

async function insertProvider(name: string, over: Record<string, unknown> = {}): Promise<number> {
  const row = await prisma.lLMProvider.create({
    data: {
      name,
      kind: "openai",
      endpoint: "http://mock/v1",
      apiKey: "k",
      model: "m",
      status: "active",
      priority: 10,
      dailyQuota: 1000,
      rateLimit: 60,
      ...over,
    } as never,
  });
  return row.id;
}

async function insertUsage(providerId: number, date: string, calls = 0, failures = 0) {
  await prisma.lLMUsage.upsert({
    where: { date_providerId: { date, providerId } },
    update: { calls, failures },
    create: { date, providerId, calls, tokensIn: 0, tokensOut: 0, failures },
  } as never);
}

beforeAll(async () => {
  await initTestDb();
});
afterAll(() => {
  cleanupTestDb();
});
beforeEach(async () => {
  clockNow = BASE;
  __resetRateCalls();
  __setClock(() => clockNow);
  // 隔离：getRoutedProviders 返回所有 active 供应商，残留的"健康"供应商会破坏 503 断言
  await prisma.lLMUsage.deleteMany({});
  await prisma.lLMProvider.deleteMany({});
});
afterEach(() => {
  __resetRateCalls();
  clockNow = BASE;
  __setClock(() => clockNow);
});

describe("C-09 · usageDate（Asia/Shanghai 日界）", () => {
  it("北京 10:00（UTC 02:00）→ 当日", () => {
    expect(usageDate(BASE)).toBe(BEIJING_TODAY);
  });

  it("UTC 15:59（北京 23:59）→ 当日；UTC 16:00（北京次日 00:00）→ 次日", () => {
    expect(usageDate(Date.UTC(2026, 9, 17, 15, 59, 59))).toBe(BEIJING_TODAY);
    expect(usageDate(Date.UTC(2026, 9, 17, 16, 0, 0))).toBe(BEIJING_TOMORROW);
  });

  it("无参调用走注入时钟 __now()；越过北京午夜切换日", () => {
    __setClock(() => clockNow);
    expect(usageDate()).toBe(BEIJING_TODAY);
    advanceMs(BEIJING_NEXT_MIDNIGHT_UTC - BASE); // 北京时间次日 00:00
    expect(usageDate()).toBe(BEIJING_TOMORROW);
  });
});

describe("C-09 · isDailyQuotaExceeded / isRateLimited（纯函数）", () => {
  it("calls ≥ dailyQuota → true；未满 → false；dailyQuota=0 不限制", () => {
    expect(isDailyQuotaExceeded(100, 100)).toBe(true);
    expect(isDailyQuotaExceeded(99, 100)).toBe(false);
    expect(isDailyQuotaExceeded(999, 0)).toBe(false);
  });

  it("进程内滑窗：第 rateLimit 次命中，之后跳过；60s 后窗口滑出", () => {
    for (let i = 0; i < 5; i++) recordRateCall(9, BASE + i * 1000);
    expect(recentRateCalls(9, BASE + 5000)).toBe(5);
    expect(isRateLimited(9, 5, BASE + 5000)).toBe(true);
    expect(recentRateCalls(9, BASE + 65_000)).toBe(0);
    expect(isRateLimited(9, 5, BASE + 65_000)).toBe(false);
  });

  it("rateLimit=0 不限制", () => {
    for (let i = 0; i < 20; i++) recordRateCall(9, BASE + i);
    expect(isRateLimited(9, 0, BASE + 20)).toBe(false);
  });
});

describe("C-09 · 网关调度：配额满跳过、限频跳过、全部超限 503", () => {
  it("配额满的供应商被跳过，落到下一个（DB calls ≥ dailyQuota）", async () => {
    const a = await insertProvider("QuotaFull", { priority: 1, dailyQuota: 10, rateLimit: 0 });
    const b = await insertProvider("Healthy", { priority: 2, dailyQuota: 1000, rateLimit: 0 });
    await insertUsage(a, BEIJING_TODAY, 10, 0); // A 当日已用 10 ≥ quota 10

    const r = await gatewayChat([{ role: "user", content: "hi" }], { preferredProviderIds: [a, b] });
    expect(r.ok).toBe(false); // B 也会被尝试 → 适配器 stub 抛错 → ok=false
    expect(r.status).toBe(502); // 至少尝试了一个（B）→ 502
    expect(r.errMsg).toContain("Healthy: mock 上游网络不可达");
  });

  it("配额满且无可用供应商 → 全部超限 503", async () => {
    const a = await insertProvider("OnlyQuotaFull", { priority: 1, dailyQuota: 5, rateLimit: 0 });
    await insertUsage(a, BEIJING_TODAY, 5, 0);

    const r = await gatewayChat([{ role: "user", content: "hi" }], { preferredProviderIds: [a] });
    expect(r.ok).toBe(false);
    expect(r.status).toBe(503);
    expect(r.errMsg).toContain("已达上限");
    // 未调用适配器 → 未记 usage（calls 仍 5，未 +1）
    const row = await prisma.lLMUsage.findUnique({ where: { date_providerId: { date: BEIJING_TODAY, providerId: a } } });
    expect(row?.calls).toBe(5);
  });

  it("进程内滑窗：rateLimit 满 → 该供应商本轮跳过（不消耗配额、不记失败）", async () => {
    const id = await insertProvider("RateLimited", { priority: 1, dailyQuota: 1000, rateLimit: 3 });
    recordRateCall(id, BASE);
    recordRateCall(id, BASE + 1000);
    recordRateCall(id, BASE + 2000);

    const r = await gatewayChat([{ role: "user", content: "hi" }], { preferredProviderIds: [id] });
    expect(r.ok).toBe(false);
    expect(r.status).toBe(503); // 唯一供应商限频 → 全部超限 → 503
    expect(r.errMsg).toContain("频率超限");
    const row = await prisma.lLMUsage.findUnique({ where: { date_providerId: { date: BEIJING_TODAY, providerId: id } } });
    expect(row?.calls ?? 0).toBe(0);
  });

  it("全部超限（配额 + 限频）→ 网关 status 503；/api/chat/stream 返回 HTTP 503", async () => {
    const a = await insertProvider("QuotaFullR", { priority: 1, dailyQuota: 5, rateLimit: 0 });
    const b = await insertProvider("RateFullR", { priority: 2, dailyQuota: 0, rateLimit: 2 });
    await insertUsage(a, BEIJING_TODAY, 5, 0);
    recordRateCall(b, BASE);
    recordRateCall(b, BASE + 1000);

    const g = await gatewayChat([{ role: "user", content: "hi" }], { preferredProviderIds: [a, b] });
    expect(g.ok).toBe(false);
    expect(g.status).toBe(503);
    expect(g.errMsg).toContain("已达上限");
    expect(g.errMsg).toContain("频率超限");

    // 端点层（独立供应商集合，避免与前面的混在一起）
    const a2 = await insertProvider("EndpointQuotaFull", { priority: 1, dailyQuota: 3, rateLimit: 0 });
    await insertUsage(a2, BEIJING_TODAY, 3, 0);
    const scene = await prisma.chatScene.create({
      data: {
        code: `s09-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: "C09 测试",
        greeting: "hi",
        systemPrompt: "you",
        useKnowledgeBase: false,
        status: "active",
        providerIds: JSON.stringify([a2]),
      },
    } as never);
    const res = await streamPOST(
      new Request("http://localhost/api/chat/stream", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: "s09-quota-endpoint", sceneCode: scene.code, message: "在吗" }),
      }),
      ctx()
    );
    expect(res.status).toBe(503);
    const j = await json(res);
    expect(j.code).toBe(503);
    expect(j.message).toContain("已达上限");
  });

  it("配额未满 + 限频未满 → 尝试适配器后失败（502 而非 503）", async () => {
    const id = await insertProvider("HealthySuccess", { priority: 1, dailyQuota: 1000, rateLimit: 100 });
    const r = await gatewayChat([{ role: "user", content: "hi" }], { preferredProviderIds: [id] });
    expect(r.ok).toBe(false);
    expect(r.status).toBe(502); // 尝试过了 → 502
    expect(r.errMsg).not.toContain("已达上限");
    expect(r.errMsg).not.toContain("频率超限");
  });

  it("gatewayChatStream 同样受配额闸门保护：全部超限 → status 503", async () => {
    const a = await insertProvider("QuotaFullStream", { priority: 1, dailyQuota: 1, rateLimit: 0 });
    await insertUsage(a, BEIJING_TODAY, 1, 0);
    const r = await gatewayChatStream([{ role: "user", content: "hi" }], { preferredProviderIds: [a] });
    expect(r.ok).toBe(false);
    expect((r as { status?: number }).status).toBe(503);
  });

  it("默认路由（不传 providerIds）：全部 active 供应商被跳过 → 503；空供应商表 → 502", async () => {
    // 两个 active 供应商，一个配额满、一个限频满
    const a = await insertProvider("DefaultQuotaFull", { priority: 1, dailyQuota: 5, rateLimit: 0 });
    const b = await insertProvider("DefaultRateFull", { priority: 2, dailyQuota: 0, rateLimit: 2 });
    await insertUsage(a, BEIJING_TODAY, 5, 0);
    recordRateCall(b, BASE);
    recordRateCall(b, BASE + 1000);

    const r = await gatewayChat([{ role: "user", content: "hi" }]); // 不指定 providerIds
    expect(r.ok).toBe(false);
    expect(r.status).toBe(503);
    expect(r.errMsg).toContain("已达上限");
    expect(r.errMsg).toContain("频率超限");

    // 清空供应商 → 空表 → 502（不是"超配额"，属未配置）
    await prisma.lLMProvider.deleteMany({});
    await prisma.lLMUsage.deleteMany({});
    const r2 = await gatewayChat([{ role: "user", content: "hi" }]);
    expect(r2.ok).toBe(false);
    expect(r2.status).toBe(502);
    expect(r2.errMsg).toContain("尚未配置");
  });

  it("熔断先于滑窗：被熔断跳过的供应商不占滑窗名额", async () => {
    const id = await insertProvider("CircuitBroken", { priority: 1, dailyQuota: 1000, rateLimit: 2 });
    await insertUsage(id, BEIJING_TODAY, 0, 3); // failures=3 ≥ FAILURE_CIRCUIT=3

    const r = await gatewayChat([{ role: "user", content: "hi" }], { preferredProviderIds: [id] });
    expect(r.ok).toBe(false);
    expect(r.errMsg).toContain("熔断");
    // 滑窗不应新增记录：recentRateCalls 仍 0
    expect(recentRateCalls(id)).toBe(0);
  });

  it("北京时间 00:00 重置：昨日满额不再拦截今日", async () => {
    const a = await insertProvider("YesterdayFull", { priority: 1, dailyQuota: 5, rateLimit: 0 });
    await insertUsage(a, BEIJING_TODAY, 5, 0); // 今日满

    const r1 = await gatewayChat([{ role: "user", content: "hi" }], { preferredProviderIds: [a] });
    expect(r1.ok).toBe(false);
    expect(r1.status).toBe(503);
    expect(r1.errMsg).toContain("已达上限");

    advanceMs(BEIJING_NEXT_MIDNIGHT_UTC - clockNow); // 越过北京午夜
    expect(usageDate()).toBe(BEIJING_TOMORROW);

    const r2 = await gatewayChat([{ role: "user", content: "hi" }], { preferredProviderIds: [a] });
    expect(r2.ok).toBe(false);
    expect(r2.status).toBe(502); // 今日 calls=0 → 放行 → 尝试 → 502
    expect(r2.errMsg).not.toContain("已达上限");
  });
});

describe("C-09 · DR-23 契约（不引入内联 schema）", () => {
  it("route.ts 无 z.object（契约引用来自 chatRequestSchema）", () => {
    const src = fs.readFileSync("src/app/api/chat/stream/route.ts", "utf8");
    expect(src.includes("z.object")).toBe(false);
  });
});