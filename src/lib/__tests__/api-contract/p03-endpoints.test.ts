/**
 * P03 契约测试：logs / chat-history / media PATCH·batch / articles PATCH / navigations tree / campus 嵌套兼容层
 * 每个端点覆盖 200 / 401 / 403 / 400（及 404 等），直接调用路由 handler（临时库，见 harness.ts）。
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const tmp = process.env.TMPDIR || process.env.TEMP || "/tmp";
  process.env.DATABASE_URL = `file:${tmp}/hdw-contract-p03-${process.pid}-${Date.now()}.db`;
});

import { prisma } from "@/lib/prisma";
import { cleanupTestDb, createActor, ctx, initTestDb, json, req } from "./harness";
import { GET as logsGET } from "@/app/api/logs/route";
import { GET as chatGET } from "@/app/api/chat-history/route";
import { GET as chatOneGET, DELETE as chatOneDELETE } from "@/app/api/chat-history/[id]/route";
import { PATCH as mediaPATCH } from "@/app/api/media/[id]/route";
import { POST as mediaBatchPOST } from "@/app/api/media/batch/route";
import { PATCH as articlePATCH } from "@/app/api/articles/[id]/route";
import { GET as navGET } from "@/app/api/navigations/route";
import { GET as campusImgGET, POST as campusImgPOST } from "@/app/api/campus/[id]/images/route";
import { DELETE as campusImgDELETE, PUT as campusImgPUT } from "@/app/api/campus/[id]/images/[imageId]/route";

let SUPER = "";
let NOPERM = "";
let LOGVIEW = ""; // log:list only
let MEDIAVIEW = ""; // media:list + media:edit (no delete)
let ARTEDIT = ""; // article:edit only (no publish)
let superId = 0;
const mediaIds: number[] = [];
let articleId = 0;
let campusA = 0;
let campusB = 0;

beforeAll(async () => {
  await initTestDb();
  const s = await createActor(prisma, "super", [], true);
  SUPER = s.token;
  superId = s.actor.id;
  NOPERM = (await createActor(prisma, "noperm", [])).token;
  LOGVIEW = (await createActor(prisma, "logview", ["log:list"])).token;
  MEDIAVIEW = (await createActor(prisma, "mediaview", ["media:list", "media:edit"])).token;
  ARTEDIT = (await createActor(prisma, "artedit", ["article:edit", "article:list"])).token;

  await prisma.operationLog.createMany({
    data: [
      { username: "super", module: "article", action: "create", title: "A1" },
      { username: "super", module: "media", action: "delete", title: "M1" },
      { username: "editor", module: "article", action: "update", title: "A2" },
    ],
  });
  await prisma.aIChatHistory.createMany({
    data: [
      { sessionId: "sess-aaaa-0001", channel: "website", role: "user", message: "怎么报名自考？" },
      { sessionId: "sess-aaaa-0001", channel: "website", role: "assistant", message: "您好，自考报名……" },
      { sessionId: "sess-bbbb-0002", channel: "wechat", role: "user", message: "成考什么时候考试" },
    ],
  });
  for (let i = 0; i < 3; i++) {
    const m = await prisma.media.create({
      data: { filename: `f${i}.png`, path: `/uploads/f${i}.png`, url: `/uploads/f${i}.png`, mimeType: "image/png", size: 10 },
    });
    mediaIds.push(m.id);
  }
  const a = await prisma.article.create({
    data: { title: "测试文章", slug: "p03-test", content: "x", authorId: superId, status: "draft" },
  });
  articleId = a.id;
  const root = await prisma.navigation.create({ data: { name: "关于", slug: "about", link: "/about", sort: 2 } });
  await prisma.navigation.create({ data: { name: "简介", slug: "about-intro", link: "/about/intro", parentId: root.id, level: 2 } });
  await prisma.navigation.create({ data: { name: "隐藏子项", slug: "about-hidden", parentId: root.id, level: 2, isVisible: false } });
  await prisma.navigation.create({ data: { name: "首页", slug: "home", link: "/", sort: 1 } });
  await prisma.navigation.create({ data: { name: "停用", slug: "off", status: "inactive", sort: 3 } });
  campusA = (await prisma.campus.create({ data: { name: "校区A", address: "a" } })).id;
  campusB = (await prisma.campus.create({ data: { name: "校区B", address: "b" } })).id;
}, 60_000);

afterAll(async () => {
  await prisma.$disconnect();
  cleanupTestDb();
});

/** 重建 chat-history 种子（用例自包含：不依赖其他用例是否已删除会话） */
async function seedChatHistory() {
  await prisma.aIChatHistory.deleteMany({});
  await prisma.aIChatHistory.createMany({
    data: [
      { sessionId: "sess-aaaa-0001", channel: "website", role: "user", message: "怎么报名自考？" },
      { sessionId: "sess-aaaa-0001", channel: "website", role: "assistant", message: "您好，自考报名……" },
      { sessionId: "sess-bbbb-0002", channel: "wechat", role: "user", message: "成考什么时候考试" },
    ],
  });
}

describe("GET /api/logs", () => {
  it("200 分页信封", async () => {
    const res = await logsGET(req("/api/logs", { token: SUPER }), ctx());
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.code).toBe(200);
    expect(Array.isArray(body.data.list)).toBe(true);
    expect(body.data.pagination).toMatchObject({ page: 1, limit: 20 });
    expect(body.data.pagination.total).toBeGreaterThanOrEqual(3);
  });
  it("筛选 module/username", async () => {
    const body = await json(await logsGET(req("/api/logs?module=article&username=edit", { token: LOGVIEW }), ctx()));
    expect(body.data.list.map((l: { title: string }) => l.title)).toEqual(["A2"]);
  });
  it("401 无 token", async () => {
    const res = await logsGET(req("/api/logs"), ctx());
    expect(res.status).toBe(401);
    expect((await json(res)).data).toBeNull();
  });
  it("403 无 log:list", async () => {
    expect((await logsGET(req("/api/logs", { token: NOPERM }), ctx())).status).toBe(403);
  });
  it("400 非法参数（limit>100 / 时间倒置）", async () => {
    expect((await logsGET(req("/api/logs?limit=1000", { token: SUPER }), ctx())).status).toBe(400);
    expect(
      (await logsGET(req("/api/logs?startDate=2026-10-10&endDate=2026-01-01", { token: SUPER }), ctx())).status
    ).toBe(400);
  });
});

describe("GET /api/chat-history（按会话聚合）", () => {
  it("200 会话列表", async () => {
    await seedChatHistory();
    const res = await chatGET(req("/api/chat-history", { token: LOGVIEW }), ctx());
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data.pagination.total).toBe(2);
    const s1 = body.data.list.find((r: { sessionId: string }) => r.sessionId === "sess-aaaa-0001");
    expect(s1).toMatchObject({ channel: "website", messageCount: 2, lastUserMessage: "怎么报名自考？" });
  });
  it("按 channel 筛选", async () => {
    await seedChatHistory();
    const body = await json(await chatGET(req("/api/chat-history?channel=wechat", { token: SUPER }), ctx()));
    expect(body.data.list.map((r: { sessionId: string }) => r.sessionId)).toEqual(["sess-bbbb-0002"]);
  });
  it("401 / 403 / 400", async () => {
    expect((await chatGET(req("/api/chat-history"), ctx())).status).toBe(401);
    expect((await chatGET(req("/api/chat-history", { token: NOPERM }), ctx())).status).toBe(403);
    expect((await chatGET(req("/api/chat-history?channel=sms", { token: SUPER }), ctx())).status).toBe(400);
  });
});

describe("/api/chat-history/[id]", () => {
  it("GET 200 会话消息（正序）", async () => {
    const body = await json(await chatOneGET(req("/api/chat-history/sess-aaaa-0001", { token: LOGVIEW }), ctx({ id: "sess-aaaa-0001" })));
    expect(body.code).toBe(200);
    expect(body.data.messages.map((m: { role: string }) => m.role)).toEqual(["user", "assistant"]);
  });
  it("GET 404 / 400 / 401", async () => {
    expect((await chatOneGET(req("/x", { token: SUPER }), ctx({ id: "nope-0000" }))).status).toBe(404);
    expect((await chatOneGET(req("/x", { token: SUPER }), ctx({ id: "bad id!" }))).status).toBe(400);
    expect((await chatOneGET(req("/x"), ctx({ id: "sess-aaaa-0001" }))).status).toBe(401);
  });
  it("DELETE 403（仅 log:list 不可删）", async () => {
    await seedChatHistory(); // 确保目标会话存在（权限失败路径不依赖其他用例留下的数据）
    expect((await chatOneDELETE(req("/x", { method: "DELETE", token: LOGVIEW }), ctx({ id: "sess-bbbb-0002" }))).status).toBe(403);
  });
  it("DELETE 200 + 记操作日志", async () => {
    await seedChatHistory();
    await prisma.operationLog.deleteMany({ where: { module: "chat-history", action: "delete" } });
    const res = await chatOneDELETE(req("/x", { method: "DELETE", token: SUPER }), ctx({ id: "sess-bbbb-0002" }));
    expect(res.status).toBe(200);
    expect((await json(res)).data).toMatchObject({ deleted: 1 });
    expect(await prisma.aIChatHistory.count({ where: { sessionId: "sess-bbbb-0002" } })).toBe(0);
    expect(await prisma.operationLog.count({ where: { module: "chat-history", action: "delete" } })).toBe(1);
  });
});

describe("PATCH /api/media/[id]", () => {
  it("200 改名/改分类", async () => {
    const res = await mediaPATCH(
      req("/x", { method: "PATCH", token: MEDIAVIEW, body: { filename: "新名.png", category: "校园" } }),
      ctx({ id: String(mediaIds[0]) })
    );
    expect(res.status).toBe(200);
    expect((await json(res)).data).toMatchObject({ filename: "新名.png", category: "校园" });
  });
  it("400 空对象 / 未知字段 / 非法 JSON", async () => {
    const id = String(mediaIds[0]);
    expect((await mediaPATCH(req("/x", { method: "PATCH", token: SUPER, body: {} }), ctx({ id }))).status).toBe(400);
    expect((await mediaPATCH(req("/x", { method: "PATCH", token: SUPER, body: { url: "/hack" } }), ctx({ id }))).status).toBe(400);
    expect((await mediaPATCH(req("/x", { method: "PATCH", token: SUPER, body: "{bad" }), ctx({ id }))).status).toBe(400);
  });
  it("401 / 403 / 404", async () => {
    const id = String(mediaIds[0]);
    expect((await mediaPATCH(req("/x", { method: "PATCH", body: { filename: "a" } }), ctx({ id }))).status).toBe(401);
    expect((await mediaPATCH(req("/x", { method: "PATCH", token: NOPERM, body: { filename: "a" } }), ctx({ id }))).status).toBe(403);
    expect((await mediaPATCH(req("/x", { method: "PATCH", token: SUPER, body: { filename: "a" } }), ctx({ id: "999999" }))).status).toBe(404);
  });
});

/** 建一条测试媒体行（media 用例自包含，不共用 beforeAll 行，避免 delete 类用例改序后相互影响） */
async function seedMedia(filename: string) {
  return prisma.media.create({
    data: { filename, path: `/uploads/${filename}`, url: `/uploads/${filename}`, mimeType: "image/png", size: 10 },
  });
}

describe("POST /api/media/batch", () => {
  it("200 move-category", async () => {
    const m1 = await seedMedia("batch-move-1.png");
    const m2 = await seedMedia("batch-move-2.png");
    const res = await mediaBatchPOST(
      req("/x", { method: "POST", token: MEDIAVIEW, body: { action: "move-category", ids: [m1.id, m2.id, 999999], category: "证书" } }),
      ctx()
    );
    const body = await json(res);
    expect(res.status).toBe(200);
    expect(body.data).toMatchObject({ affected: 2, missing: [999999] });
  });
  it("400 超过 100 条 / 非法 action / 空 ids", async () => {
    const ids = Array.from({ length: 101 }, (_, i) => i + 1);
    expect((await mediaBatchPOST(req("/x", { method: "POST", token: SUPER, body: { action: "delete", ids } }), ctx())).status).toBe(400);
    expect((await mediaBatchPOST(req("/x", { method: "POST", token: SUPER, body: { action: "zip", ids: [1] } }), ctx())).status).toBe(400);
    expect((await mediaBatchPOST(req("/x", { method: "POST", token: SUPER, body: { action: "delete", ids: [] } }), ctx())).status).toBe(400);
  });
  it("401 / 403（无 media:list；有 list 无 delete）", async () => {
    const m = await seedMedia("batch-auth.png");
    const body = { action: "delete", ids: [m.id] };
    expect((await mediaBatchPOST(req("/x", { method: "POST", body }), ctx())).status).toBe(401);
    expect((await mediaBatchPOST(req("/x", { method: "POST", token: NOPERM, body }), ctx())).status).toBe(403);
    expect((await mediaBatchPOST(req("/x", { method: "POST", token: MEDIAVIEW, body }), ctx())).status).toBe(403);
  });
  it("200 delete", async () => {
    const m = await seedMedia("batch-del.png");
    const res = await mediaBatchPOST(req("/x", { method: "POST", token: SUPER, body: { action: "delete", ids: [m.id] } }), ctx());
    expect((await json(res)).data).toMatchObject({ affected: 1 });
    expect(await prisma.media.count({ where: { id: m.id } })).toBe(0);
  });
});

describe("PATCH /api/articles/[id]（一键上下线）", () => {
  it("200 发布写 publishedAt，下线清空", async () => {
    const id = String(articleId);
    const pub = await json(await articlePATCH(req("/x", { method: "PATCH", token: SUPER, body: { status: "published" } }), ctx({ id })));
    expect(pub.data.status).toBe("published");
    expect(pub.data.publishedAt).not.toBeNull();
    const off = await json(await articlePATCH(req("/x", { method: "PATCH", token: SUPER, body: { status: "draft" } }), ctx({ id })));
    expect(off.data).toMatchObject({ status: "draft", publishedAt: null });
    expect(await prisma.operationLog.count({ where: { module: "article", action: "status" } })).toBe(2);
  });
  it("400 非法状态 / 401 / 403（article:edit 不含 publish）/ 404", async () => {
    const id = String(articleId);
    expect((await articlePATCH(req("/x", { method: "PATCH", token: SUPER, body: { status: "online" } }), ctx({ id }))).status).toBe(400);
    expect((await articlePATCH(req("/x", { method: "PATCH", body: { status: "published" } }), ctx({ id }))).status).toBe(401);
    expect((await articlePATCH(req("/x", { method: "PATCH", token: ARTEDIT, body: { status: "published" } }), ctx({ id }))).status).toBe(403);
    expect((await articlePATCH(req("/x", { method: "PATCH", token: SUPER, body: { status: "published" } }), ctx({ id: "999999" }))).status).toBe(404);
  });
});

describe("GET /api/navigations?tree=true", () => {
  it("匿名：只返回 active+visible，按 sort 排序，子项嵌套", async () => {
    const body = await json(await navGET(req("/api/navigations?tree=true&status=inactive&isVisible=false"), ctx()));
    expect(body.code).toBe(200);
    expect(body.data.map((n: { slug: string }) => n.slug)).toEqual(["home", "about"]);
    const about = body.data[1];
    expect(about.children.map((n: { slug: string }) => n.slug)).toEqual(["about-intro"]);
  });
  it("管理端（navigation:list）可按参数取全量", async () => {
    const body = await json(await navGET(req("/api/navigations?tree=true&status=inactive", { token: SUPER }), ctx()));
    expect(body.data.map((n: { slug: string }) => n.slug)).toEqual(["off"]);
  });
  it("无 tree 参数仍为管理端分页列表（401）", async () => {
    expect((await navGET(req("/api/navigations"), ctx())).status).toBe(401);
  });
  it("400 非法 level", async () => {
    expect((await navGET(req("/api/navigations?tree=true&level=9"), ctx())).status).toBe(400);
  });
});

describe("/api/campus/[id]/images（main 嵌套路径兼容层，B6）", () => {
  it("POST 201 + GET 200 数组", async () => {
    const res = await campusImgPOST(req("/x", { method: "POST", token: SUPER, body: { image: "/images/c1.jpg", caption: "大门" } }), ctx({ id: String(campusA) }));
    expect(res.status).toBe(201);
    const list = await json(await campusImgGET(req("/x", { token: SUPER }), ctx({ id: String(campusA) })));
    expect(list.data).toHaveLength(1);
    expect(list.data[0]).toMatchObject({ campusId: campusA, image: "/images/c1.jpg" });
  });
  it("401 / 403 / 400 / 404（跨校区）", async () => {
    expect((await campusImgGET(req("/x"), ctx({ id: String(campusA) }))).status).toBe(401);
    expect((await campusImgGET(req("/x", { token: NOPERM }), ctx({ id: String(campusA) }))).status).toBe(403);
    expect((await campusImgPOST(req("/x", { method: "POST", token: SUPER, body: { caption: "无图" } }), ctx({ id: String(campusA) }))).status).toBe(400);
    // 跨校区 404：自建 campusA 图片（不依赖 POST 用例是否先执行），经 campusB 路径操作 → 404；随后清理
    const own = await campusImgPOST(req("/x", { method: "POST", token: SUPER, body: { image: "/images/c-x.jpg", caption: "跨校区" } }), ctx({ id: String(campusA) }));
    const ownId = (await json(own)).data.id as number;
    expect(
      (await campusImgDELETE(req("/x", { method: "DELETE", token: SUPER }), ctx({ id: String(campusB), imageId: String(ownId) }))).status
    ).toBe(404);
    await campusImgDELETE(req("/x", { method: "DELETE", token: SUPER }), ctx({ id: String(campusA), imageId: String(ownId) }));
  });
  it("PUT 200 + DELETE 200", async () => {
    // 自包含：本用例自建图片（POST 201），再验证 PUT/DELETE，不依赖 POST 用例先执行
    const created = await campusImgPOST(req("/x", { method: "POST", token: SUPER, body: { image: "/images/c-putdel.jpg", caption: "旧名" } }), ctx({ id: String(campusA) }));
    expect(created.status).toBe(201);
    const ownId = (await json(created)).data.id as number;
    const put = await campusImgPUT(req("/x", { method: "PUT", token: SUPER, body: { caption: "正门" } }), ctx({ id: String(campusA), imageId: String(ownId) }));
    expect((await json(put)).data.caption).toBe("正门");
    const del = await campusImgDELETE(req("/x", { method: "DELETE", token: SUPER }), ctx({ id: String(campusA), imageId: String(ownId) }));
    expect(del.status).toBe(200);
  });
});
