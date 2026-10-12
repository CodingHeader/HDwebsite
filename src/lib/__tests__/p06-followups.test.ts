/** P06 承接项：crud runHook 错误映射 / 空 cron（仅手动）/ 发布任务列表带标题 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const tmp = process.env.TMPDIR || "/tmp";
  process.env.DATABASE_URL = `file:${tmp}/hdw-contract-p06fu-${process.pid}-${Date.now()}.db`;
});

import { prisma } from "@/lib/prisma";
import { cleanupTestDb, createActor, ctx, initTestDb, json, req } from "./api-contract/harness";
import { crudCreate, type CrudSpec } from "@/lib/crud";
import { badRequest } from "@/lib/api-handler";
import { collectSourceCreateSchema, tagCreateSchema } from "@/contracts/resources";
import { GET as jobsGET } from "@/app/api/publish-jobs/route";

let SUPER = "";
beforeAll(async () => {
  await initTestDb();
  SUPER = (await createActor(prisma, "super", [], true)).token;
});
afterAll(async () => {
  await prisma.$disconnect();
  cleanupTestDb();
});

const base: CrudSpec = { model: "tag", permission: "tag", label: "标签", searchFields: [], createSchema: tagCreateSchema };

describe("crud runHook", () => {
  it("钩子抛 badRequest → 400", async () => {
    const route = crudCreate({ ...base, beforeCreate: async () => { throw badRequest("名称重复"); } });
    const res = await route(req("/api/tags", { method: "POST", token: SUPER, body: { name: "a" } }), ctx());
    expect(res.status).toBe(400);
    expect((await json(res)).message).toBe("名称重复");
  });
  it("钩子抛 TypeError → 500（触发 onApiError，不再伪装成 400）", async () => {
    const route = crudCreate({ ...base, beforeCreate: async () => { throw new TypeError("x is undefined"); } });
    const res = await route(req("/api/tags", { method: "POST", token: SUPER, body: { name: "b" } }), ctx());
    expect(res.status).toBe(500);
  });
});

describe("采集源 cron", () => {
  it("空串 = 仅手动执行（允许）；非法表达式拒绝", () => {
    expect(collectSourceCreateSchema.safeParse({ name: "s", url: "https://a.com", cron: "" }).success).toBe(true);
    expect(collectSourceCreateSchema.safeParse({ name: "s", url: "https://a.com", cron: "bad" }).success).toBe(false);
    expect(collectSourceCreateSchema.parse({ name: "s", url: "https://a.com" }).autoToKb).toBe(true);
  });
});

describe("发布任务列表", () => {
  it("返回内容标题", async () => {
    const item = await prisma.contentItem.create({ data: { title: "带标题的稿件", content: "c", status: "approved" } });
    await prisma.publishJob.create({ data: { itemId: item.id } });
    await prisma.publishJob.create({ data: {} });
    const body = await json(await jobsGET(req("/api/publish-jobs", { token: SUPER }), ctx()));
    const titles = body.data.list.map((j: { title: string }) => j.title);
    expect(titles).toContain("带标题的稿件");
    expect(titles.some((t: string) => /^发布任务 #\d+$/.test(t))).toBe(true);
  });
});

import { POST as srcPOST } from "@/app/api/collect-sources/route";
import { PUT as srcPUT } from "@/app/api/collect-sources/[id]/route";

describe("autoApprove 仅超管可开启", () => {
  it("collect:edit 非超管创建/更新 autoApprove=true → 403；超管 → 201", async () => {
    const ed = (await createActor(prisma, "colleditor", ["collect:create", "collect:edit", "collect:list"])).token;
    const r1 = await srcPOST(req("/api/collect-sources", { method: "POST", token: ed, body: { name: "x", url: "https://a.com", autoApprove: true } }), ctx());
    expect(r1.status).toBe(403);
    const ok = await srcPOST(req("/api/collect-sources", { method: "POST", token: ed, body: { name: "y", url: "https://a.com", cron: "" } }), ctx());
    expect(ok.status).toBe(201);
    const id = (await json(ok)).data.id;
    const r2 = await srcPUT(req(`/api/collect-sources/${id}`, { method: "PUT", token: ed, body: { autoApprove: true } }), ctx({ id: String(id) }));
    expect(r2.status).toBe(403);
    const r3 = await srcPUT(req(`/api/collect-sources/${id}`, { method: "PUT", token: SUPER, body: { autoApprove: true } }), ctx({ id: String(id) }));
    expect(r3.status).toBe(200);
    const r4 = await srcPUT(req(`/api/collect-sources/${id}`, { method: "PUT", token: ed, body: { name: "改名", autoApprove: true } }), ctx({ id: String(id) }));
    expect(r4.status).toBe(200); // 未改动 autoApprove 不拦截
  });
});
