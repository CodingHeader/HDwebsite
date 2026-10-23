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
    // V9-T-05：自建稿——共享 itemId 会被「超管通过」用例置为 approved，shuffle 下
    // 状态不变断言会漂移；自建后本用例完全自包含。
    const row = await prisma.contentItem.create({ data: { title: "守门稿1", content: "正文", status: "pending_review" } });
    const res = await itemPUT(req(`/api/content-items/${row.id}`, { method: "PUT", token: EDITOR, body: { status: "published" } }), ctx({ id: String(row.id) }));
    expect(res.status).toBe(400);
    expect((await prisma.contentItem.findUnique({ where: { id: row.id } }))?.status).toBe("pending_review");
  });
  it("content:edit 经 PUT 置 approved → 400", async () => {
    const row = await prisma.contentItem.create({ data: { title: "守门稿2", content: "正文", status: "pending_review" } });
    const res = await itemPUT(req(`/api/content-items/${row.id}`, { method: "PUT", token: EDITOR, body: { status: "approved" } }), ctx({ id: String(row.id) }));
    expect(res.status).toBe(400);
  });
  it("content:create 经 POST 直接建 approved → 400", async () => {
    const res = await itemPOST(req(`/api/content-items`, { method: "POST", token: EDITOR, body: { title: "x", content: "y", status: "approved" } }), ctx());
    expect(res.status).toBe(400);
  });
  it("content:edit 可在 draft/pending_review/offline 之间切换", async () => {
    // V9-T-05：自建稿——共享 itemId 会被「超管通过」用例置为 approved，
    // shuffle 下先跑 approved 再跑本用例会撞状态门禁；自建 draft 稿解除顺序依赖。
    const row = await prisma.contentItem.create({ data: { title: "切换稿", content: "正文", status: "draft" } });
    const res = await itemPUT(req(`/api/content-items/${row.id}`, { method: "PUT", token: EDITOR, body: { status: "pending_review", title: "改标题" } }), ctx({ id: String(row.id) }));
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
    // V9-T-05：日志断言改增量式——shuffle 下其他用例可能已产生 approve 留痕，
    // 绝对计数会随用例顺序漂移；这里只断言本用例自己 +1。
    const before = await prisma.operationLog.count({ where: { module: "review", action: "approve" } });
    const ok = await reviewPOST(req(`/api/content-items/${itemId}/review`, { method: "POST", token: SUPER, body: { decision: "approved" } }), ctx({ id: String(itemId) }));
    expect(ok.status).toBe(200);
    expect((await json(ok)).data.status).toBe("approved");
    expect((await prisma.contentItem.findUnique({ where: { id: itemId } }))?.status).toBe("approved");
    expect(await prisma.operationLog.count({ where: { module: "review", action: "approve" } })).toBe(before + 1);
  });
  it("已 approved 再审 → 400（非法迁移）", async () => {
    // V9-T-05：自建 approved 稿——原实现依赖前一个用例把共享 itemId 审成 approved，
    // shuffle 下先跑本用例时 item 还是 pending_review，400 断言失败（V8-SEC-03 返工）。
    const row = await prisma.contentItem.create({ data: { title: "已审稿", content: "正文", status: "approved" } });
    const res = await reviewPOST(req(`/api/content-items/${row.id}/review`, { method: "POST", token: SUPER, body: { decision: "rejected" } }), ctx({ id: String(row.id) }));
    expect(res.status).toBe(400);
  });
});

describe("表单回传未改动的审核态", () => {
  it("approved 内容 PUT {status:approved,title} → 200（状态未变不拦截）", async () => {
    const row = await prisma.contentItem.create({ data: { title: "已通过稿", content: "正文", status: "approved" } });
    const res = await itemPUT(req(`/api/content-items/${row.id}`, { method: "PUT", token: EDITOR, body: { status: "approved", title: "已通过稿-改" } }), ctx({ id: String(row.id) }));
    expect(res.status).toBe(200);
    const after = await prisma.contentItem.findUnique({ where: { id: row.id } });
    expect(after?.status).toBe("approved");
    expect(after?.tags).toBeNull(); // 部分更新不再套用默认值（tags 未发送）
  });
  it("PUT 仅改标题不会把状态重置为 draft", async () => {
    const row = await prisma.contentItem.create({ data: { title: "待审稿2", content: "正文", status: "pending_review" } });
    await itemPUT(req(`/api/content-items/${row.id}`, { method: "PUT", token: EDITOR, body: { title: "只改标题" } }), ctx({ id: String(row.id) }));
    expect((await prisma.contentItem.findUnique({ where: { id: row.id } }))?.status).toBe("pending_review");
  });
  it("校验错误返回字段级中文说明", async () => {
    const res = await itemPOST(req(`/api/content-items`, { method: "POST", token: EDITOR, body: { title: "", content: "y", contentType: "pdf" } }), ctx());
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.data.fieldErrors.contentType).toBe("取值不在允许范围内");
    expect(body.data.fieldErrors.title).toBeTruthy();
    expect(body.message).toMatch(/^参数校验失败/);
  });
});
