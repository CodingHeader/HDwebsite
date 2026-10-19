/**
 * C-11 · 用量统计 API 测试：
 *  1) 无权限 403 且体符合契约②（{code:403,...}）
 *  2) groupBy=provider 聚合：跨天累计同一 provider
 *  3) groupBy=day 聚合：补齐区间内无用量日期（0 行）
 *  4) providerId 过滤
 *  5) 时间窗校验（非法日期 / 超 92 天 → 400）
 *  6) 响应通过 llmUsageRowSchema（W0-05 zod schema parse）
 *  7) 响应不含耗时/费用字段（ADR-034：无 latencyMs / costCent）
 *  8) 空区间返回 0 行（边界）
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const tmp = process.env.TMPDIR || process.env.TEMP || "/tmp";
  process.env.DATABASE_URL = `file:${tmp}/hdw-contract-c11u-${process.pid}-${Date.now()}.db`;
});

import { prisma } from "@/lib/prisma";
import { cleanupTestDb, createActor, initTestDb } from "../api-contract/harness";
import { GET } from "@/app/api/llm/usage/route";
import { llmUsageRowSchema } from "@/contracts/llm";

let ADMIN = "";
let VIEWER = "";
let PROVIDER_A = 0;
let PROVIDER_B = 0;

/** 直接调 usage GET handler（不经 fetch，避免真实端口） */
function callUsage(query: string, token?: string) {
  return GET(
    new Request(`http://localhost/api/llm/usage?${query}`, {
      headers: { authorization: `Bearer ${token ?? ADMIN}` },
    }),
    { params: Promise.resolve({}) }
  );
}

beforeAll(async () => {
  await initTestDb();
  ADMIN = (await createActor(prisma, "admin", ["llm:list"], true)).token;
  VIEWER = (await createActor(prisma, "staff", ["content:list"], false)).token; // 无 llm:list

  const a = await prisma.lLMProvider.create({
    data: { name: "ProviderA", endpoint: "https://a.example.com", apiKey: "ak-a", model: "gpt-4o", isEncrypted: false },
  });
  const b = await prisma.lLMProvider.create({
    data: { name: "ProviderB", endpoint: "https://b.example.com", apiKey: "ak-b", model: "gpt-4", isEncrypted: false },
  });
  PROVIDER_A = a.id;
  PROVIDER_B = b.id;

  await prisma.lLMUsage.createMany({
    data: [
      { date: "2026-10-14", providerId: PROVIDER_A, calls: 2, tokensIn: 100, tokensOut: 50, failures: 1 },
      { date: "2026-10-15", providerId: PROVIDER_A, calls: 3, tokensIn: 200, tokensOut: 100, failures: 0 },
      { date: "2026-10-15", providerId: PROVIDER_B, calls: 1, tokensIn: 50, tokensOut: 20, failures: 0 },
    ],
  });
});

afterAll(async () => {
  await prisma.$disconnect();
  cleanupTestDb();
});

describe("C-11 · /api/llm/usage · 权限", () => {
  it("无 llm:list 权限 → 403，体符合契约②", async () => {
    const r = await callUsage("groupBy=provider&from=2026-10-01&to=2026-10-31", VIEWER);
    const b = await r.json();
    expect(r.status).toBe(403);
    expect(b.code).toBe(403);
    expect(b).toHaveProperty("message");
    expect(b).toHaveProperty("data");
  });
});

describe("C-11 · /api/llm/usage · 聚合", () => {
  it("groupBy=provider：跨天累计，行 key=providerId", async () => {
    const r = await callUsage("groupBy=provider&from=2026-10-01&to=2026-10-31");
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.code).toBe(200);
    const rows = b.data as Record<string, unknown>[];
    const a = rows.find((x) => x.key === String(PROVIDER_A));
    const bb = rows.find((x) => x.key === String(PROVIDER_B));
    expect(a).toBeTruthy();
    expect(a!.calls).toBe(5);
    expect(a!.tokensIn).toBe(300);
    expect(a!.tokensOut).toBe(150);
    expect(a!.failures).toBe(1);
    expect(bb).toBeTruthy();
    expect(bb!.calls).toBe(1);
    // 契约校验
    expect(llmUsageRowSchema.array().safeParse(rows).success).toBe(true);
  });

  it("groupBy=day：按日归并，补齐区间内空日（0 行）", async () => {
    const r = await callUsage("groupBy=day&from=2026-10-14&to=2026-10-16");
    expect(r.status).toBe(200);
    const b = await r.json();
    const rows = b.data as { key: string; calls: number; tokensIn: number; tokensOut: number; failures: number }[];
    expect(rows.map((x) => x.key)).toEqual(["2026-10-14", "2026-10-15", "2026-10-16"]);
    expect(rows[0].calls).toBe(2);
    expect(rows[0].tokensIn).toBe(100);
    expect(rows[1].calls).toBe(4);
    expect(rows[1].tokensIn).toBe(250);
    expect(rows[1].tokensOut).toBe(120);
    expect(rows[2]).toEqual({ key: "2026-10-16", calls: 0, tokensIn: 0, tokensOut: 0, failures: 0 });
    expect(llmUsageRowSchema.array().safeParse(rows).success).toBe(true);
  });

  it("providerId 过滤：只返回指定 provider", async () => {
    const r = await callUsage(`groupBy=provider&from=2026-10-01&to=2026-10-31&providerId=${PROVIDER_B}`);
    const b = await r.json();
    const rows = b.data as { key: string }[];
    expect(rows.length).toBe(1);
    expect(rows[0].key).toBe(String(PROVIDER_B));
  });

  it("响应不含耗时/费用字段（ADR-034）", async () => {
    const r = await callUsage("groupBy=provider&from=2026-10-01&to=2026-10-31");
    const b = await r.json();
    const raw = JSON.stringify(b.data);
    expect(raw).not.toContain("latencyMs");
    expect(raw).not.toContain("costCent");
    expect(raw).not.toContain("elapsedMs");
  });

  it("空区间返回 0 行（groupBy=provider）", async () => {
    const r = await callUsage("groupBy=provider&from=2026-01-01&to=2026-01-31");
    const b = await r.json();
    expect(b.data).toEqual([]);
  });
});

describe("C-11 · /api/llm/usage · 参数校验", () => {
  it("非法日期格式 → 400", async () => {
    const r = await callUsage("groupBy=provider&from=2026/10/01&to=2026-10-31");
    expect(r.status).toBe(400);
  });

  it("区间超 92 天 → 400", async () => {
    const r = await callUsage("groupBy=provider&from=2026-01-01&to=2026-06-01");
    expect(r.status).toBe(400);
  });

  it("缺 from/to → 400", async () => {
    const r = await callUsage("groupBy=provider");
    expect(r.status).toBe(400);
  });
});