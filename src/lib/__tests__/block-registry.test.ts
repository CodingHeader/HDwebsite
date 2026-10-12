/**
 * P06 评审 #8 / ADR-024：首页区块配置
 * - 无配置 = main 默认顺序；禁用某区块后不渲染；排序生效；未知 code 忽略
 * - content-blocks / page-templates / template-blocks / element-configs 四资源 CRUD 契约（200/401/403/400）
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const tmp = process.env.TMPDIR || "/tmp";
  process.env.DATABASE_URL = `file:${tmp}/hdw-contract-p06blk-${process.pid}-${Date.now()}.db`;
});

import { prisma } from "@/lib/prisma";
import { cleanupTestDb, createActor, ctx, initTestDb, json, req } from "./api-contract/harness";
import { DEFAULT_HOME_BLOCK_ORDER, getBlockDefinition, getBlockRegistry, resolveHomeBlocks } from "@/lib/block-registry";
import * as blocksList from "@/app/api/content-blocks/route";
import * as blocksOne from "@/app/api/content-blocks/[id]/route";
import * as tplList from "@/app/api/page-templates/route";
import * as tplOne from "@/app/api/page-templates/[id]/route";
import * as tbList from "@/app/api/template-blocks/route";
import * as tbOne from "@/app/api/template-blocks/[id]/route";
import * as ecList from "@/app/api/element-configs/route";
import * as ecOne from "@/app/api/element-configs/[id]/route";

const MAIN_ORDER = [
  "home-banner", "home-cards", "home-topbar", "home-entrance", "home-stats", "home-partners",
  "home-courses", "home-intro", "home-news", "home-certificates", "home-campus", "home-cta",
];

let SUPER = "";
let NOPERM = "";
let VIEWER = "";

beforeAll(async () => {
  await initTestDb();
  SUPER = (await createActor(prisma, "super", [], true)).token;
  NOPERM = (await createActor(prisma, "noperm", [])).token;
  VIEWER = (await createActor(prisma, "viewer", ["block:list"])).token;
});
afterAll(async () => {
  await prisma.$disconnect();
  cleanupTestDb();
});

describe("block-registry", () => {
  it("注册表覆盖首页 12 区块，默认顺序 = main", () => {
    expect([...DEFAULT_HOME_BLOCK_ORDER]).toEqual(MAIN_ORDER);
    expect(getBlockRegistry().map((b) => b.code)).toEqual(expect.arrayContaining(MAIN_ORDER));
    expect(getBlockDefinition("home-banner")?.name).toBeTruthy();
    expect(getBlockDefinition("nope")).toBeUndefined();
  });

  it("无 home 模板 → main 默认顺序", async () => {
    expect((await resolveHomeBlocks()).map((b) => b.code)).toEqual(MAIN_ORDER);
  });

  it("home 模板存在但无 TemplateBlock → main 默认顺序", async () => {
    await prisma.pageTemplate.create({ data: { code: "home", name: "首页", templateFile: "app/(web)/page.tsx" } });
    expect((await resolveHomeBlocks()).map((b) => b.code)).toEqual(MAIN_ORDER);
  });

  it("按 TemplateBlock.sort 排序；禁用（block.status=inactive 或 config.enabled=false）不渲染；未知 code 忽略", async () => {
    const home = (await prisma.pageTemplate.findUnique({ where: { code: "home" } }))!;
    const codes = [...MAIN_ORDER, "legacy-unknown"];
    for (const [i, code] of codes.entries()) {
      const b = await prisma.contentBlock.create({ data: { code, name: code, type: "x" } });
      await prisma.templateBlock.create({ data: { templateId: home.id, blockId: b.id, sort: (i + 1) * 10 } });
    }
    expect((await resolveHomeBlocks()).map((b) => b.code)).toEqual(MAIN_ORDER);

    // 把 home-cta 排到最前
    const cta = (await prisma.contentBlock.findUnique({ where: { code: "home-cta" } }))!;
    await prisma.templateBlock.updateMany({ where: { blockId: cta.id }, data: { sort: 1 } });
    // 禁用 home-stats（区块停用）与 home-news（模板内关闭）
    await prisma.contentBlock.update({ where: { code: "home-stats" }, data: { status: "inactive" } });
    const news = (await prisma.contentBlock.findUnique({ where: { code: "home-news" } }))!;
    await prisma.templateBlock.updateMany({ where: { blockId: news.id }, data: { config: JSON.stringify({ enabled: false }) } });

    const order = (await resolveHomeBlocks()).map((b) => b.code);
    expect(order[0]).toBe("home-cta");
    expect(order).not.toContain("home-stats");
    expect(order).not.toContain("home-news");
    expect(order).not.toContain("legacy-unknown");
    expect(order).toHaveLength(10);
  });

  it("home 模板停用 → 回落 main 默认顺序", async () => {
    await prisma.pageTemplate.update({ where: { code: "home" }, data: { status: "inactive" } });
    expect((await resolveHomeBlocks()).map((b) => b.code)).toEqual(MAIN_ORDER);
    await prisma.pageTemplate.update({ where: { code: "home" }, data: { status: "active" } });
  });
});

type Mod = { GET?: any; POST?: any; PUT?: any; DELETE?: any }; // eslint-disable-line @typescript-eslint/no-explicit-any

const RESOURCES: { name: string; list: Mod; one: Mod; valid: () => Promise<Record<string, unknown>>; invalid: Record<string, unknown>; update: Record<string, unknown> }[] = [
  { name: "content-blocks", list: blocksList, one: blocksOne, valid: async () => ({ code: `blk-${Date.now()}`, name: "测试区块", type: "list" }), invalid: { name: "缺 code" }, update: { name: "改名" } },
  { name: "page-templates", list: tplList, one: tplOne, valid: async () => ({ code: `tpl-${Date.now()}`, name: "测试模板", templateFile: "x.tsx" }), invalid: { code: "" }, update: { name: "改名" } },
  {
    name: "template-blocks", list: tbList, one: tbOne,
    valid: async () => {
      const t = await prisma.pageTemplate.create({ data: { code: `t-${Date.now()}`, name: "t", templateFile: "x" } });
      const b = await prisma.contentBlock.create({ data: { code: `b-${Date.now()}`, name: "b", type: "x" } });
      return { templateId: t.id, blockId: b.id, sort: 5, config: { enabled: true } };
    },
    invalid: { templateId: "abc" }, update: { sort: 99 },
  },
  { name: "element-configs", list: ecList, one: ecOne, valid: async () => ({ elementId: `e-${Date.now()}`, elementName: "元素", layer: 5, layerName: "Banner" }), invalid: { elementId: "x", layer: 99 }, update: { elementName: "改名" } },
];

describe.each(RESOURCES)("$name CRUD 契约", (r) => {
  let id = 0;
  it("401 / 403", async () => {
    expect((await r.list.GET(req(`/api/${r.name}`), ctx())).status).toBe(401);
    expect((await r.list.GET(req(`/api/${r.name}`, { token: NOPERM }), ctx())).status).toBe(403);
    expect((await r.list.POST(req(`/api/${r.name}`, { method: "POST", token: VIEWER, body: await r.valid() }), ctx())).status).toBe(403);
  });
  it("400", async () => {
    expect((await r.list.POST(req(`/api/${r.name}`, { method: "POST", token: SUPER, body: r.invalid }), ctx())).status).toBe(400);
  });
  it("200 create / list / get / update / delete", async () => {
    const c = await r.list.POST(req(`/api/${r.name}`, { method: "POST", token: SUPER, body: await r.valid() }), ctx());
    expect(c.status).toBe(201);
    id = (await json(c)).data.id;
    const l = await r.list.GET(req(`/api/${r.name}?limit=100`, { token: VIEWER }), ctx());
    expect(l.status).toBe(200);
    expect((await json(l)).data.list.some((x: { id: number }) => x.id === id)).toBe(true);
    expect((await r.one.GET(req(`/api/${r.name}/${id}`, { token: VIEWER }), ctx({ id: String(id) }))).status).toBe(200);
    const u = await r.one.PUT(req(`/api/${r.name}/${id}`, { method: "PUT", token: SUPER, body: r.update }), ctx({ id: String(id) }));
    expect(u.status).toBe(200);
    expect((await r.one.DELETE(req(`/api/${r.name}/${id}`, { method: "DELETE", token: SUPER }), ctx({ id: String(id) }))).status).toBe(200);
  });
});
