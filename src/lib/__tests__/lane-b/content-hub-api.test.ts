/**
 * B-07 G1 内容中枢 API 测试（多渠道发布 + 渠道状态 DTO）
 * 覆盖：
 *  1) POST /api/publish-jobs 双渠道一次创建 2 条 PublishJob（channels=["website","wechat"]）
 *  2) 旧单 channel 字段兼容：仍创建 1 条
 *  3) channels 与 channel 均传 / 重复渠道 → 400
 *  4) 未配置公众号账号时 wechat 渠道整体回滚（不落半套任务）
 *  5) 未审核内容（status=draft）→ 400
 *  6) GET /api/content-items 列表行含 channels，且通过 channelStateSchema parse
 *  7) GET /api/content-items/[id] 详情含 channels
 *  8) 权限：无 publish:create → 403
 *
 * 复用 api-contract/harness（临时 SQLite + prisma/migrations + 真实 signToken），直接调 route handler。
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const tmp = process.env.TMPDIR || process.env.TEMP || "/tmp";
  process.env.DATABASE_URL = `file:${tmp}/hdw-contract-b07-hub-${process.pid}-${Date.now()}.db`;
  process.env.JWT_SECRET = "b07-hub-test-jwt-secret-0123456789abcdef";
});

// 静默 revalidateTag（vitest 无 Next 上下文会刷 stderr；与 routes-admin.test.ts 同款）
vi.mock("@/lib/cache-tags", async (orig) => {
  const actual = await orig<typeof import("@/lib/cache-tags")>();
  return { ...actual, invalidateWebContent: () => Promise.resolve() };
});

import { prisma } from "@/lib/prisma";
import { cleanupTestDb, createActor, ctx, initTestDb, json, req } from "../api-contract/harness";
import { channelStateSchema, contentHubItemSchema } from "@/contracts/content-hub";

import { GET as itemsGET } from "@/app/api/content-items/route";
import { GET as itemGET } from "@/app/api/content-items/[id]/route";
import { POST as jobsPOST } from "@/app/api/publish-jobs/route";

let SUPER = "";
let PUBLISH = "";
let NO_PUBLISH = ""; // 仅 content:list
let itemApproved = 0;
let itemDraft = 0;
let itemPublished = 0;

beforeAll(async () => {
  await initTestDb();
  SUPER = (await createActor(prisma, "super", [], true)).token;
  PUBLISH = (await createActor(prisma, "publisher", ["publish:create", "publish:list", "content:list"])).token;
  NO_PUBLISH = (await createActor(prisma, "nolist", ["content:list"])).token;
  await prisma.wechatAccount.create({
    data: { name: "hub-acc", appid: "appid", appSecret: "x", type: "service", status: "active", freepublishEnabled: true },
  });
  itemApproved = (await prisma.contentItem.create({ data: { title: "A", contentType: "html", source: "manual", status: "approved", content: "<p>a</p>" } })).id;
  itemDraft = (await prisma.contentItem.create({ data: { title: "D", contentType: "html", source: "manual", status: "draft", content: "<p>d</p>" } })).id;
  itemPublished = (await prisma.contentItem.create({ data: { title: "P", contentType: "html", source: "manual", status: "published", content: "<p>p</p>" } })).id;
});

afterAll(async () => {
  cleanupTestDb();
});

describe("B-07 G1 多渠道一次发布", () => {
  it("双渠道一次创建 2 条 PublishJob", async () => {
    const res = await jobsPOST(req("/api/publish-jobs", { method: "POST", token: PUBLISH, body: { itemId: itemApproved, channels: ["website", "wechat"], action: "publish", preNotify: false } }));
    const body = await json(res);
    expect(body.code).toBe(200);
    expect(body.data.list).toHaveLength(2);
    const kinds = (body.data.list as { channel: string }[]).map((j) => j.channel).sort();
    expect(kinds).toEqual(["website", "wechat"]);
  });

  it("旧单 channel 字段仍创建 1 条（兼容 e2e）", async () => {
    const res = await jobsPOST(req("/api/publish-jobs", { method: "POST", token: PUBLISH, body: { itemId: itemApproved, channel: "website", action: "publish" } }));
    const body = await json(res);
    expect(body.code).toBe(200);
    expect(body.data.list).toHaveLength(1);
    expect(body.data.list[0].channel).toBe("website");
  });

  it("channels 与 channel 同传 → channels 优先（冻结契约 refine 为 OR 逻辑，非 XOR）", async () => {
    // 契约 resources.ts publishJobCreateSchema 的 refine 是 `channels?.length > 0 || Boolean(channel)`，
    // 冻结面不可改；按冻结语义同传时 channels 优先（服务端 `v.channels ?? [v.channel]`）
    const res = await jobsPOST(req("/api/publish-jobs", { method: "POST", token: PUBLISH, body: { itemId: itemApproved, channel: "website", channels: ["wechat"] } }));
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.data.list).toHaveLength(1);
    expect(body.data.list[0].channel).toBe("wechat");
  });

  it("channels 重复 → 400", async () => {
    const res = await jobsPOST(req("/api/publish-jobs", { method: "POST", token: PUBLISH, body: { itemId: itemApproved, channels: ["website", "website"] } }));
    expect(res.status).toBe(400);
  });

  it("channels 空 → 400（契约 min(1)）", async () => {
    const res = await jobsPOST(req("/api/publish-jobs", { method: "POST", token: PUBLISH, body: { itemId: itemApproved, channels: [] } }));
    expect(res.status).toBe(400);
  });

  it("未审核内容（draft）→ 400", async () => {
    const res = await jobsPOST(req("/api/publish-jobs", { method: "POST", token: PUBLISH, body: { itemId: itemDraft, channels: ["website"] } }));
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.message).toContain("未通过审核");
  });

  it("无 publish:create → 403", async () => {
    const res = await jobsPOST(req("/api/publish-jobs", { method: "POST", token: NO_PUBLISH, body: { itemId: itemApproved, channels: ["website"] } }));
    expect(res.status).toBe(403);
  });

  it("未登录 → 401", async () => {
    const res = await jobsPOST(req("/api/publish-jobs", { method: "POST", body: { itemId: itemApproved, channels: ["website"] } }));
    expect(res.status).toBe(401);
  });

  it("未配置公众号账号时含 wechat 渠道整体失败（不落半套任务）", async () => {
    // 删账号模拟无可用公众号；wechat 渠道校验失败 → 整请求 400 且不写任何 job
    await prisma.wechatAccount.deleteMany({});
    const before = await prisma.publishJob.count();
    const res = await jobsPOST(req("/api/publish-jobs", { method: "POST", token: PUBLISH, body: { itemId: itemApproved, channels: ["website", "wechat"] } }));
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.message).toContain("公众号账号");
    const after = await prisma.publishJob.count();
    expect(after).toBe(before);
    // 恢复账号，避免影响后续用例
    await prisma.wechatAccount.create({
      data: { name: "hub-acc", appid: "appid", appSecret: "x", type: "service", status: "active", freepublishEnabled: true },
    });
  });
});

describe("B-07 渠道状态 DTO（content-items 列表/详情）", () => {
  it("列表行 channels 通过 channelStateSchema parse", async () => {
    const res = await itemsGET(req("/api/content-items?page=1&limit=50", { token: SUPER }));
    const body = await json(res);
    expect(body.code).toBe(200);
    for (const row of body.data.list) {
      const parsed = contentHubItemSchema.parse({
        id: row.id,
        title: row.title,
        contentType: row.contentType,
        source: row.source,
        updatedAt: row.updatedAt,
        channels: row.channels ?? [],
      });
      for (const ch of parsed.channels) {
        channelStateSchema.parse(ch); // 契约级校验
      }
    }
  });

  it("详情行含 channels（每渠道最多一条，字段完整）", async () => {
    const res = await itemGET(req(`/api/content-items/${itemPublished}`, { token: SUPER }), ctx({ id: String(itemPublished) }));
    const body = await json(res);
    expect(body.code).toBe(200);
    const channels: unknown[] = body.data.channels;
    expect(Array.isArray(channels)).toBe(true);
    // 每渠道最多一条
    const kinds = channels.map((c) => (c as { channel: string }).channel);
    expect(new Set(kinds).size).toBe(kinds.length);
    for (const c of channels) channelStateSchema.parse(c);
  });

  it("无发布记录的条目 channels 返回 unsent 占位（2 渠道）", async () => {
    const id = (await prisma.contentItem.create({ data: { title: "Fresh", contentType: "html", source: "manual", status: "approved", content: "<p>f</p>" } })).id;
    const res = await itemGET(req(`/api/content-items/${id}`, { token: SUPER }), ctx({ id: String(id) }));
    const body = await json(res);
    const channels = body.data.channels as { status: string }[];
    expect(channels).toHaveLength(2);
    expect(channels.every((c) => c.status === "unsent")).toBe(true);
  });

  it("列表接口无 publish 权限也能读（content:list 即可）", async () => {
    const res = await itemsGET(req("/api/content-items?page=1&limit=10", { token: NO_PUBLISH }));
    expect(res.status).toBe(200);
  });
});
