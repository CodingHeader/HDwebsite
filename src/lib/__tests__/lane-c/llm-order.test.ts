/**
 * C-11 · 模型优先级批量排序 API 测试：
 *  1) 正常排序：ids=[B,A] → priority 分别写 1,2（priority 字段生效）
 *  2) ids 包含不存在的 provider → 400 fieldErrors
 *  3) ids 重复 → 400（契约 refine）
 *  4) ids 为空 → 400
 *  5) 无 llm:edit 权限 → 403
 *  6) PATCH 与 PUT 均可用（契约注释用 PUT，卡输出用 PATCH）
 *  7) 排序后列表 orderBy priority asc 正确反映新序
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const tmp = process.env.TMPDIR || process.env.TEMP || "/tmp";
  process.env.DATABASE_URL = `file:${tmp}/hdw-contract-c11o-${process.pid}-${Date.now()}.db`;
});

import { prisma } from "@/lib/prisma";
import { cleanupTestDb, createActor, initTestDb } from "../api-contract/harness";
import { PATCH, PUT } from "@/app/api/llm/providers/order/route";

let ADMIN = "";
let VIEWER = "";
let PROVIDERS: { id: number }[] = [];

beforeAll(async () => {
  await initTestDb();
  ADMIN = (await createActor(prisma, "admin", ["llm:edit"], true)).token;
  VIEWER = (await createActor(prisma, "staff", ["content:list"], false)).token; // 无 llm:edit

  const ids = [];
  for (const name of ["ProviderA", "ProviderB", "ProviderC"]) {
    const p = await prisma.lLMProvider.create({
      data: { name, endpoint: `https://${name.toLowerCase()}.example.com`, apiKey: `ak-${name}`, model: "gpt-4o", isEncrypted: false, priority: 10 },
    });
    ids.push(p.id);
  }
  PROVIDERS = ids.map((id) => ({ id }));
});

afterAll(async () => {
  await prisma.$disconnect();
  cleanupTestDb();
});

async function callRoute(handler: typeof PATCH, body: unknown, token?: string) {
  const res = await handler(
    new Request("http://localhost/api/llm/providers/order", {
      method: handler === PUT ? "PUT" : "PATCH",
      headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({}) }
  );
  return { status: res.status, body: await res.json().catch(() => null) };
}

describe("C-11 · /api/llm/providers/order · 正常排序", () => {
  it("[B,A,C] → priority 分别为 2,1,3；列表按 priority asc 反映新序", async () => {
    const ids = [PROVIDERS[1].id, PROVIDERS[0].id, PROVIDERS[2].id];
    const { status, body } = await callRoute(PATCH, { ids }, ADMIN);
    expect(status).toBe(200);
    expect(body.code).toBe(200);
    expect(body.data.priority).toEqual([1, 2, 3]); // 契约字段，实际写 priority=position+1

    // 实际落库
    const rows = await prisma.lLMProvider.findMany({ orderBy: { priority: "asc" }, select: { id: true, priority: true } });
    expect(rows.map((r) => r.id)).toEqual(ids);
    expect(rows.map((r) => r.priority)).toEqual([1, 2, 3]);
  });

  it("PUT 与 PATCH 行为一致", async () => {
    const ids = [PROVIDERS[0].id, PROVIDERS[1].id];
    const viaPut = await callRoute(PUT, { ids }, ADMIN);
    const viaPatch = await callRoute(PATCH, { ids }, ADMIN);
    expect(viaPut.status).toBe(200);
    expect(viaPatch.status).toBe(200);
  });
});

describe("C-11 · /api/llm/providers/order · 参数校验", () => {
  it("ids 包含不存在 id → 400 fieldErrors", async () => {
    const ids = [PROVIDERS[0].id, 99999];
    const { status, body } = await callRoute(PATCH, { ids }, ADMIN);
    expect(status).toBe(400);
    expect(body.code).toBe(400);
    expect(JSON.stringify(body.message)).toContain("供应商不存在");
  });

  it("ids 重复 → 400（契约 refine）", async () => {
    const ids = [PROVIDERS[0].id, PROVIDERS[0].id];
    const { status } = await callRoute(PATCH, { ids }, ADMIN);
    expect(status).toBe(400);
  });

  it("ids 为空 → 400", async () => {
    const { status } = await callRoute(PATCH, { ids: [] }, ADMIN);
    expect(status).toBe(400);
  });
});

describe("C-11 · /api/llm/providers/order · 权限", () => {
  it("无 llm:edit → 403", async () => {
    const ids = [PROVIDERS[0].id];
    const { status, body } = await callRoute(PATCH, { ids }, VIEWER);
    expect(status).toBe(403);
    expect(body.code).toBe(403);
  });
});