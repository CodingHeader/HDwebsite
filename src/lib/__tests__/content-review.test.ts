/**
 * P06 评审 #1：审核门强制（ADR-017）。content:edit 非超管不能经通用 CRUD 置 approved/published，
 * 也不能调用专用审核端点；SuperAdmin 经 /review 通过/拒绝。
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const tmp = process.env.TMPDIR || "/tmp";
  process.env.DATABASE_URL = `file:${tmp}/hdw-contract-p06rev-${process.pid}-${Date.now()}.db`;
});

import { prisma } from "@/lib/prisma";
import { cleanupTestDb, createActor, ctx, initTestDb, json, req } from "./api-contract/harness";
import { PUT as itemPUT } from "@/app/api/content-items/[id]/route";
import { POST as itemPOST } from "@/app/api/content-items/route";
import { POST as reviewPOST } from "@/app/api/content-items/[id]/review/route";

let SUPER = "";
let EDITOR = "";
let itemId = 0;

beforeAll(async () => {
  await initTestDb();
  SUPER = (await createActor(prisma, "super", [], true)).token;
  EDITOR = (await createActor(prisma, "editor", ["content:list", "content:create", "content:edit"])).token;
  const row = await prisma.contentItem.create({ data: { title: "待审内容", content: "正文", status: "pending_review" } });
  itemId = row.id;
});
afterAll(async () => {
  await prisma.$disconnect();
  cleanupTestDb();
});

describe("内容审核门", () => {
  it("content:edit 经 PUT 置 published → 400", async () => {
    const res = await itemPUT(req(`/api/content-items/${itemId}`, { method: "PUT", token: EDITOR, body: { status: "published" } }), ctx({ id: String(itemId) }));
    expect(res.status).toBe(400);
    expect((await prisma.contentItem.findUnique({ where: { id: itemId } }))?.status).toBe("pending_review");
  });
  it("content:edit 经 PUT 置 approved → 400", async () => {
    const res = await itemPUT(req(`/api/content-items/${itemId}`, { method: "PUT", token: EDITOR, body: { status: "approved" } }), ctx({ id: String(itemId) }));
    expect(res.status).toBe(400);
  });
  it("content:create 经 POST 直接建 approved → 400", async () => {
    const res = await itemPOST(req(`/api/content-items`, { method: "POST", token: EDITOR, body: { title: "x", content: "y", status: "approved" } }), ctx());
    expect(res.status).toBe(400);
  });
  it("content:edit 可在 draft/pending_review/offline 之间切换", async () => {
    const res = await itemPUT(req(`/api/content-items/${itemId}`, { method: "PUT", token: EDITOR, body: { status: "pending_review", title: "改标题" } }), ctx({ id: String(itemId) }));
    expect(res.status).toBe(200);
  });
  it("非超管调用 /review → 403；未登录 → 401", async () => {
    const r1 = await reviewPOST(req(`/api/content-items/${itemId}/review`, { method: "POST", token: EDITOR, body: { decision: "approved" } }), ctx({ id: String(itemId) }));
    expect(r1.status).toBe(403);
    const r2 = await reviewPOST(req(`/api/content-items/${itemId}/review`, { method: "POST", body: { decision: "approved" } }), ctx({ id: String(itemId) }));
    expect(r2.status).toBe(401);
  });
  it("超管 /review 非法参数 → 400；通过 → approved 且留痕", async () => {
    const bad = await reviewPOST(req(`/api/content-items/${itemId}/review`, { method: "POST", token: SUPER, body: { decision: "published" } }), ctx({ id: String(itemId) }));
    expect(bad.status).toBe(400);
    const ok = await reviewPOST(req(`/api/content-items/${itemId}/review`, { method: "POST", token: SUPER, body: { decision: "approved" } }), ctx({ id: String(itemId) }));
    expect(ok.status).toBe(200);
    expect((await json(ok)).data.status).toBe("approved");
    expect((await prisma.contentItem.findUnique({ where: { id: itemId } }))?.status).toBe("approved");
    expect(await prisma.operationLog.count({ where: { module: "review", action: "approve" } })).toBe(1);
  });
  it("已 approved 再审 → 400（非法迁移）", async () => {
    const res = await reviewPOST(req(`/api/content-items/${itemId}/review`, { method: "POST", token: SUPER, body: { decision: "rejected" } }), ctx({ id: String(itemId) }));
    expect(res.status).toBe(400);
  });
});
