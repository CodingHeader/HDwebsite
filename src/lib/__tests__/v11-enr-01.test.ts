/**
 * V11-ENR-01：招生同步与学费回写移植 + 唯一性防重（对照 main/hdwebsite_0429）
 * - 纯函数（normalizeBlankLevel/inheritEnrollmentLevels/getLowestTotalTuition）行为与 main 对齐
 * - 重复推送不产生重复行（含 level/majorCode 空值归一、并发推送串行化）
 * - 最低学费回写 Course.price/priceText；无价 → "--"
 * - 同步路由（POST /api/enrollment-offerings/sync）鉴权 + 幂等；PUT/DELETE 回写
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const tmp = process.env.TMPDIR || "/tmp";
  process.env.DATABASE_URL = `file:${tmp}/hdw-contract-v11enr01-${process.pid}-${Date.now()}.db`;
});

import { prisma } from "@/lib/prisma";
import { cleanupTestDb, createActor, ctx, initTestDb, req } from "./api-contract/harness";
import {
  formatTotalTuitionPrice,
  getLowestTotalTuition,
  inheritEnrollmentLevels,
  normalizeBlankLevel,
} from "@/lib/enrollment-pricing";
import { upsertEnrollmentOffering } from "@/lib/enrollment-sync";
import { POST as syncPOST } from "@/app/api/enrollment-offerings/sync/route";
import { DELETE as syncDELETE, PUT as syncPUT } from "@/app/api/enrollment-offerings/sync/[id]/route";

vi.setConfig({ testTimeout: 20_000 });

let token: string;

beforeAll(async () => {
  await initTestDb();
  token = (await createActor(prisma, "enr-admin", ["enrollment:create", "enrollment:edit", "enrollment:delete", "enrollment:list"])).token;
});

afterAll(async () => {
  await prisma.$disconnect();
  cleanupTestDb();
});

describe("纯函数与 main 对齐", () => {
  it("normalizeBlankLevel：空串与 / 归一为 null", () => {
    expect(normalizeBlankLevel("")).toBeNull();
    expect(normalizeBlankLevel("  ")).toBeNull();
    expect(normalizeBlankLevel("/")).toBeNull();
    expect(normalizeBlankLevel(null)).toBeNull();
    expect(normalizeBlankLevel(undefined)).toBeNull();
    expect(normalizeBlankLevel(" 专科 ")).toBe("专科");
  });

  it("inheritEnrollmentLevels：同校连续空层次继承上一非空值，换校重置", () => {
    const rows = [
      { schoolName: "A校", level: "本科" },
      { schoolName: "A校", level: "/" },
      { schoolName: "A校", level: "专科" },
      { schoolName: "B校", level: "" },
    ];
    const out = inheritEnrollmentLevels(rows);
    expect(out.map((r) => r.resolvedLevel)).toEqual(["本科", "本科", "专科", null]);
  });

  it("getLowestTotalTuition：取有价最低；全无价 → --；计数正确", () => {
    const base = { majorName: "M", educationType: "自考", level: null };
    const r1 = getLowestTotalTuition([
      { ...base, partnerName: "甲", totalTuition: 3000, hasPrice: true },
      { ...base, partnerName: "乙", totalTuition: 2000, hasPrice: true },
      { ...base, partnerName: "丙", totalTuition: null, hasPrice: false },
    ]);
    expect(r1).toEqual({ minTotalTuition: 2000, displayPrice: "¥2000", sourcePartnerName: "乙", pricedOfferingCount: 2, unpricedOfferingCount: 1 });

    const r2 = getLowestTotalTuition([{ ...base, partnerName: "甲", totalTuition: null, hasPrice: false }]);
    expect(r2.displayPrice).toBe("--");
    expect(r2.minTotalTuition).toBeNull();

    expect(formatTotalTuitionPrice(1999.5)).toBe("¥1999.50");
    expect(formatTotalTuitionPrice(2000)).toBe("¥2000");
    expect(formatTotalTuitionPrice(null)).toBe("--");
  });
});

describe("同步 upsert：唯一性防重", () => {
  it("同一键重复推送 → 不产生重复行，字段被更新", async () => {
    const payload = {
      majorName: "工商管理",
      partnerName: "A大学",
      level: "本科",
      totalTuition: 3000,
      feeDetail: "含教材",
    };
    const first = await upsertEnrollmentOffering(payload);
    const second = await upsertEnrollmentOffering({ ...payload, totalTuition: 2600 });
    expect(second.id).toBe(first.id);

    const count = await prisma.enrollmentOffering.count({
      where: { sourceBatch: "26春", educationType: "自考", level: "本科" },
    });
    expect(count).toBe(1);
    expect(second.totalTuition).toBe(2600);
    expect(second.hasPrice).toBe(true);
  });

  it("键字段空值归一：/ 与空串与不传 → 同一条（唯一键含空值防重）", async () => {
    const base = { majorName: "会计学", partnerName: "B大学" };
    const a = await upsertEnrollmentOffering({ ...base, level: "/", majorCode: "/" });
    const b = await upsertEnrollmentOffering({ ...base, level: "", majorCode: "" });
    const c = await upsertEnrollmentOffering({ ...base });
    expect(b.id).toBe(a.id);
    expect(c.id).toBe(a.id);
    const rec = await prisma.enrollmentOffering.findUnique({ where: { id: a.id } });
    expect(rec?.level).toBeNull();
    expect(rec?.majorCode).toBeNull();
  });

  it("不同批次/院校 → 各自成行", async () => {
    await upsertEnrollmentOffering({ majorName: "市场营销", partnerName: "C大学", sourceBatch: "26春" });
    await upsertEnrollmentOffering({ majorName: "市场营销", partnerName: "C大学", sourceBatch: "26秋" });
    await upsertEnrollmentOffering({ majorName: "市场营销", partnerName: "D大学", sourceBatch: "26春" });
    const count = await prisma.enrollmentOffering.count({ where: { major: { name: "市场营销" } } });
    expect(count).toBe(3); // 三个不同键（批次×院校组合）
  });

  it("并发推送同键（Promise.all ×5）→ 仍只 1 行", async () => {
    const payload = { majorName: "人力资源管理", partnerName: "E大学", level: "本科", totalTuition: 2400 };
    await Promise.all(Array.from({ length: 5 }, () => upsertEnrollmentOffering(payload)));
    const rows = await prisma.enrollmentOffering.findMany({
      where: { major: { name: "人力资源管理" }, partner: { name: "E大学" } },
    });
    expect(rows).toHaveLength(1);
  });
});

describe("最低学费回写", () => {
  it("active 计划取最低价回写课程；无价 → --；课程自动建（招生专业分类）", async () => {
    await upsertEnrollmentOffering({ majorName: "学前教育", partnerName: "F大学", totalTuition: 3200 });
    let course = await prisma.course.findFirst({ where: { major: { name: "学前教育" } } });
    expect(course).not.toBeNull();
    expect(course?.price).toBe(3200);
    expect(course?.priceText).toBe("¥3200");

    // 更低价出现 → 回写刷新
    await upsertEnrollmentOffering({ majorName: "学前教育", partnerName: "G大学", totalTuition: 2800 });
    course = await prisma.course.findFirst({ where: { major: { name: "学前教育" } } });
    expect(course?.price).toBe(2800);
    expect(course?.priceText).toBe("¥2800");

    // 全部无价 → --
    const off = await prisma.enrollmentOffering.findMany({ where: { major: { name: "学前教育" } } });
    for (const o of off) await prisma.enrollmentOffering.update({ where: { id: o.id }, data: { status: "inactive" } });
    await upsertEnrollmentOffering({ majorName: "学前教育", partnerName: "H大学" });
    course = await prisma.course.findFirst({ where: { major: { name: "学前教育" } } });
    expect(course?.priceText).toBe("--");
    expect(course?.price).toBe(0);

    const cat = await prisma.category.findFirst({ where: { type: "course" } });
    expect(cat?.slug).toBe("enrollment-majors");
  });

  it("existingByTitle：同名课程先挂 majorId 再回写，不新建重复课程", async () => {
    // 全新专业名（本文件其他用例未触碰），手工课程标题含专业名 → ensureCourseForMajor 走 existingByTitle 收养分支
    const manual = await prisma.course.create({ data: { title: "护理学（手工建）", price: 0 } });
    await upsertEnrollmentOffering({ majorName: "护理学", partnerName: "L大学", totalTuition: 2600 });
    const major = await prisma.major.findFirst({ where: { name: "护理学" } });
    const refreshed = await prisma.course.findUnique({ where: { id: manual.id } });
    expect(refreshed?.majorId).toBe(major?.id);
    expect(refreshed?.priceText).toBe("¥2600");
    const dup = await prisma.course.count({ where: { title: { contains: "护理学" } } });
    expect(dup).toBe(1);
  });
});

describe("同步路由（/api/enrollment-offerings/sync）", () => {
  it("POST 鉴权 + 幂等：重复推送 201 且不重复建行", async () => {
    const payload = { majorName: "小学教育", partnerName: "I大学", level: "专科", totalTuition: 2200 };
    const r1 = await syncPOST(req("/api/enrollment-offerings/sync", { method: "POST", token, body: payload }), ctx());
    expect(r1.status).toBe(201);
    const r2 = await syncPOST(req("/api/enrollment-offerings/sync", { method: "POST", token, body: payload }), ctx());
    expect(r2.status).toBe(201);
    const rows = await prisma.enrollmentOffering.findMany({
      where: { major: { name: "小学教育" }, partner: { name: "I大学" } },
    });
    expect(rows).toHaveLength(1);

    const anon = await syncPOST(req("/api/enrollment-offerings/sync", { method: "POST", body: payload }), ctx());
    expect(anon.status).toBe(401);
  });

  it("POST 缺 majorName → 400", async () => {
    const r = await syncPOST(req("/api/enrollment-offerings/sync", { method: "POST", token, body: { partnerName: "X大学" } }), ctx());
    expect(r.status).toBe(400);
  });

  it("PUT 部分更新不抹掉未传字段 + hasPrice 推导 + 回写", async () => {
    const off = await upsertEnrollmentOffering({ majorName: "汉语言文学", partnerName: "J大学", level: "本科", totalTuition: 3000, feeDetail: "原始明细" });
    // 只传 feeDetail：level/totalTuition 保持不变
    const r1 = await syncPUT(req(`/api/enrollment-offerings/sync/${off.id}`, { method: "PUT", token, body: { feeDetail: "仅改明细" } }), ctx({ id: String(off.id) }));
    expect(r1.status).toBe(200);
    let row = await prisma.enrollmentOffering.findUnique({ where: { id: off.id } });
    expect(row?.feeDetail).toBe("仅改明细");
    expect(row?.level).toBe("本科");
    expect(row?.totalTuition).toBe(3000);
    expect(row?.hasPrice).toBe(true);

    // 显式 totalTuition=null → hasPrice=false，回写 "--"
    const r2 = await syncPUT(req(`/api/enrollment-offerings/sync/${off.id}`, { method: "PUT", token, body: { totalTuition: null } }), ctx({ id: String(off.id) }));
    expect(r2.status).toBe(200);
    row = await prisma.enrollmentOffering.findUnique({ where: { id: off.id } });
    expect(row?.hasPrice).toBe(false);
    const course = await prisma.course.findFirst({ where: { major: { name: "汉语言文学" } } });
    expect(course?.priceText).toBe("--");
    expect(course?.price).toBe(0);
  });

  it("PUT/DELETE 不存在的 id → 404；DELETE 后回写并删行", async () => {
    const r404 = await syncPUT(req("/api/enrollment-offerings/sync/999999", { method: "PUT", token, body: { feeDetail: "x" } }), ctx({ id: "999999" }));
    expect(r404.status).toBe(404);

    const off = await upsertEnrollmentOffering({ majorName: "英语", partnerName: "K大学", totalTuition: 1800 });
    const rdel = await syncDELETE(req(`/api/enrollment-offerings/sync/${off.id}`, { method: "DELETE", token }), ctx({ id: String(off.id) }));
    expect(rdel.status).toBe(200);
    expect(await prisma.enrollmentOffering.findUnique({ where: { id: off.id } })).toBeNull();
    // 该专业计划已清空（英语仅 1 条 active 推送）→ 回写为 "--"
    const course = await prisma.course.findFirst({ where: { major: { name: "英语" } } });
    expect(course?.priceText).toBe("--");
  });
});
