/**
 * F-01 端到端回归：真实调用 PUT /api/publish-jobs/:id
 *
 * 为什么不能只靠 tests/contract：该路由在 W2-02 里被标了 skip（因为修复前恒 500），
 * 所以契约套件覆盖不到它。这里直接起临时库 + 调 handler，锁住「修好了」这个事实。
 *
 * 同时做反向验证思路：若把 src/lib/crud.ts 的 resolveUpdateSchema 换回
 * `spec.createSchema!.partial()`，本测试会立刻失败（已人工验证）。
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

vi.hoisted(() => {
  const tmp = process.env.TMPDIR || process.env.TEMP || "/tmp";
  process.env.DATABASE_URL = `file:${tmp}/hdw-contract-f01-${process.pid}-${Date.now()}.db`;
});

vi.mock("@/lib/cache-tags", async (orig) => {
  const actual = await orig<typeof import("@/lib/cache-tags")>();
  return { ...actual, invalidateWebContent: () => undefined, webTagsForModel: () => [] };
});

import { prisma } from "@/lib/prisma";
import { PUT } from "@/app/api/publish-jobs/[id]/route";
import { cleanupTestDb, createActor, ctx, initTestDb, req } from "@/lib/__tests__/api-contract/harness";

let TOKEN = "";

beforeAll(async () => {
  // 落盘隔离：本测试只碰 DB，不写文件，但保险起见仍指向临时目录
  process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "hdw-f01-data-"));
  await initTestDb();
  const actor = await createActor(prisma, "f01-super", [], true);
  TOKEN = actor.token;

  const item = await prisma.contentItem.create({
    data: { title: "F01 内容", content: "正文", status: "approved" },
  });
  await prisma.publishJob.create({
    data: {
      id: 901,
      itemId: item.id,
      channel: "website",
      contentType: "article",
      action: "publish",
      status: "scheduled",
    },
  });
}, 120_000);

afterAll(async () => {
  await prisma.$disconnect();
  cleanupTestDb();
  const dir = process.env.DATA_DIR;
  if (dir?.includes("hdw-f01-data-")) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
});

describe("F-01 · PUT /api/publish-jobs/:id 不再恒 500", () => {
  it("只改 preNotify（不含 channels/channel）→ 200，且字段真的写进去", async () => {
    const res = await PUT(
      req("/api/publish-jobs/901", { method: "PUT", token: TOKEN, body: { preNotify: false } }),
      ctx({ id: "901" })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { code: number; data: { preNotify: boolean } };
    expect(body.code).toBe(200);
    expect(body.data.preNotify).toBe(false);

    const row = await prisma.publishJob.findUnique({ where: { id: 901 } });
    expect(row?.preNotify).toBe(false);
  });

  it("只改 action → 200（枚举字段正常更新）", async () => {
    const res = await PUT(
      req("/api/publish-jobs/901", { method: "PUT", token: TOKEN, body: { action: "update" } }),
      ctx({ id: "901" })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ code: 200 });
  });

  it("非法枚举仍被拒（修复没有放松字段级校验）", async () => {
    const res = await PUT(
      req("/api/publish-jobs/901", { method: "PUT", token: TOKEN, body: { action: "bad" } }),
      ctx({ id: "901" })
    );
    expect(res.status).toBe(400);
  });

  it("不存在的 id → 404（不是 500）", async () => {
    const res = await PUT(
      req("/api/publish-jobs/999999", { method: "PUT", token: TOKEN, body: { preNotify: true } }),
      ctx({ id: "999999" })
    );
    expect(res.status).toBe(404);
  });
  it("scheduledAt 传过去时间 → 400（跨字段时序校验未被 .partial() 兼容路径丢掉）", async () => {
    const past = new Date(Date.now() - 3600_000).toISOString();
    const res = await PUT(
      req("/api/publish-jobs/901", { method: "PUT", token: TOKEN, body: { scheduledAt: past } }),
      ctx({ id: "901" })
    );
    expect(res.status).toBe(400);
  });

  it("scheduledAt 传未来时间 → 200 且落库", async () => {
    const future = new Date(Date.now() + 3600_000).toISOString();
    const res = await PUT(
      req("/api/publish-jobs/901", { method: "PUT", token: TOKEN, body: { scheduledAt: future } }),
      ctx({ id: "901" })
    );
    expect(res.status).toBe(200);
    const row = await prisma.publishJob.findUnique({ where: { id: 901 } });
    expect(row?.scheduledAt?.toISOString()).toBe(future);
  });
});
