/** ADR-026：按日浏览统计 upsert（P06 接入） */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const tmp = process.env.TMPDIR || "/tmp";
  process.env.DATABASE_URL = `file:${tmp}/hdw-contract-p06vs-${process.pid}-${Date.now()}.db`;
});

import { prisma } from "@/lib/prisma";
import { cleanupTestDb, initTestDb } from "./api-contract/harness";
import { recordView, shanghaiDay } from "@/lib/view-stats";
import { orderProviders } from "@/lib/llm-gateway";

beforeAll(async () => {
  await initTestDb();
});
afterAll(async () => {
  await prisma.$disconnect();
  cleanupTestDb();
});

describe("ViewStats", () => {
  it("shanghaiDay：UTC 16:30 属于上海次日", () => {
    expect(shanghaiDay(new Date("2026-10-12T16:30:00Z")).toISOString()).toBe("2026-10-12T16:00:00.000Z");
    expect(shanghaiDay(new Date("2026-10-12T15:59:00Z")).toISOString()).toBe("2026-10-11T16:00:00.000Z");
  });
  it("同日多次浏览累加为一行", async () => {
    await recordView("article", 7);
    await recordView("article", 7);
    await recordView("article", 8);
    const rows = await prisma.viewStats.findMany({ orderBy: { contentId: "asc" } });
    expect(rows.map((r) => [r.contentId, r.pageViews])).toEqual([[7, 2], [8, 1]]);
  });
});

describe("模型路由（场景 → 默认 → 优先级 → 兜底）", () => {
  const rows = [
    { id: 1, isDefault: false, isFallback: true },
    { id: 2, isDefault: false, isFallback: false },
    { id: 3, isDefault: true, isFallback: false },
    { id: 4, isDefault: false, isFallback: false },
  ];
  it("无场景模型：default 优先、fallback 殿后", () => {
    expect(orderProviders(rows).map((r) => r.id)).toEqual([3, 2, 4, 1]);
  });
  it("场景模型置顶，其余顺序不变；场景模型不存在则忽略", () => {
    expect(orderProviders(rows, 4).map((r) => r.id)).toEqual([4, 3, 2, 1]);
    expect(orderProviders(rows, 99).map((r) => r.id)).toEqual([3, 2, 4, 1]);
  });
});
