/**
 * B-06 通知可靠性测试
 * - 静默时段内事件只建 deferred 记录不发信；结束后补发
 * - 两个模拟进程并发触发同一聚合事件 → 只生成 1 条 system_error
 * - 邮件正文 token/key/password 形态字串被替换为 ***
 * - notify-rules PATCH 接收 quietHours，GET 回读一致
 * - 无效时刻按"无静默"处理（DR-14）
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const sent = vi.hoisted(() => {
  const tmp = process.env.TMPDIR || "/tmp";
  process.env.DATABASE_URL = `file:${tmp}/hdw-contract-b06-${process.pid}-${Date.now()}.db`;
  return [] as { to: string[]; subject: string; text?: string }[];
});

vi.mock("nodemailer", () => {
  const createTransport = () => ({
    sendMail: async (m: { to: string[]; subject: string; text?: string }) => {
      sent.push({ to: m.to, subject: m.subject, text: m.text });
      return { messageId: `mock-${sent.length}` };
    },
  });
  return { default: { createTransport }, createTransport };
});

import { prisma } from "@/lib/prisma";
import { cleanupTestDb, createActor, ctx, initTestDb, req } from "../api-contract/harness";
import { notifyEvent, notifyRetryScan, notifySettle, __setNotifyClock } from "@/lib/notify-gateway";
import { PATCH as rulePATCH } from "@/app/api/notify-rules/[id]/route";
import { GET as ruleGET } from "@/app/api/notify-rules/route";

vi.setConfig({ testTimeout: 20_000 });

let adminToken: string;

// 构造"上海时区某本地时刻"对应的 UTC Date
function shTime(hour: number, minute: number): Date {
  // Asia/Shanghai = UTC+8（无夏令时）
  const u = Date.UTC(2026, 0, 15, hour - 8, minute, 0);
  return new Date(u);
}

beforeAll(async () => {
  await initTestDb();
  await prisma.setting.createMany({
    data: [
      { key: "emailHost", value: "smtp.mock.local", group: "email" },
      { key: "emailUsername", value: "bot@mock.local", group: "email" },
      { key: "emailPassword", value: "x", group: "email" },
    ],
  });
  const tpl = await prisma.notifyTemplate.create({
    data: { name: "默认", subject: "[提醒] {title}", body: "password=hunter2 token=sk-abcdef1234567890\n{detail}", isDefault: true },
  });
  for (const event of ["system_error", "job_failed", "collect_failed", "llm_balance_low"]) {
    await prisma.notifyRule.create({ data: { event, templateId: tpl.id, recipientGroups: JSON.stringify(["publish"]) } });
  }
  await prisma.notifyRecipient.createMany({
    data: [
      { name: "运营", email: "ops@mock.local", groups: JSON.stringify(["publish"]) },
      { name: "管理员", email: "admin@mock.local", groups: JSON.stringify(["admin", "publish"]) },
    ],
  });
  adminToken = (await createActor(prisma, "admin", ["notify:edit", "notify:list"])).token;
});
afterAll(async () => {
  __setNotifyClock(null);
  await prisma.$disconnect();
  cleanupTestDb();
});

describe("B-06 静默时段", () => {
  it("静默内事件 → 只建 deferred 不发信", async () => {
    await prisma.notifyRule.update({ where: { event: "llm_balance_low" }, data: { quietHours: JSON.stringify({ start: "23:00", end: "07:00" }) } });
    __setNotifyClock(() => shTime(23, 30)); // 上海 23:30
    try {
      const before = sent.length;
      await notifyEvent("llm_balance_low", { title: "静默测试", detail: "d" });
      const rec = await prisma.notifyRecord.findFirst({ where: { event: "llm_balance_low" }, orderBy: { id: "desc" } });
      expect(rec?.status).toBe("deferred");
      expect(sent.length).toBe(before); // 未发信
    } finally {
      await prisma.notifyRule.update({ where: { event: "llm_balance_low" }, data: { quietHours: null } });
      __setNotifyClock(null);
    }
  });

  it("静默结束后 flushDeferred 补发", async () => {
    // 自包含：本用例先在静默窗内自建一条 deferred 记录，再把时钟推到窗外验证补发
    await prisma.notifyRule.update({ where: { event: "llm_balance_low" }, data: { quietHours: JSON.stringify({ start: "23:00", end: "07:00" }) } });
    __setNotifyClock(() => shTime(23, 30));
    await notifyEvent("llm_balance_low", { title: "静默补发", detail: "d" });
    __setNotifyClock(() => shTime(8, 0)); // 已出静默窗
    try {
      const before = sent.length;
      await notifyRetryScan();
      expect(sent.length).toBeGreaterThan(before);
      const rec = await prisma.notifyRecord.findFirst({ where: { event: "llm_balance_low" }, orderBy: { id: "desc" } });
      expect(rec?.status).toBe("sent");
    } finally {
      await prisma.notifyRule.update({ where: { event: "llm_balance_low" }, data: { quietHours: null } });
      __setNotifyClock(null);
    }
  });

  it("无效时刻（如 25:00）→ 按无静默处理并发出（DR-14）", async () => {
    await prisma.notifyRule.update({ where: { event: "llm_balance_low" }, data: { quietHours: JSON.stringify({ start: "25:00", end: "07:00" }) } });
    __setNotifyClock(() => shTime(12, 0));
    try {
      const before = sent.length;
      await notifyEvent("llm_balance_low", { title: "无效静默", detail: "d" });
      await notifySettle(); // V11-MAIL-01：投递已移后台，断言前等待在途发送结束
      expect(sent.length).toBeGreaterThan(before);
    } finally {
      await prisma.notifyRule.update({ where: { event: "llm_balance_low" }, data: { quietHours: null } });
      __setNotifyClock(null);
    }
  });
});

describe("B-06 跨进程原子去重", () => {
  it("同一聚合事件并发 → 只 1 条记录（INSERT...WHERE NOT EXISTS 原子）", async () => {
    const before = await prisma.notifyRecord.count({ where: { event: "collect_failed" } });
    await Promise.all([
      notifyEvent("collect_failed", { title: "采集失败", detail: "上游超时" }),
      notifyEvent("collect_failed", { title: "采集失败", detail: "上游超时" }),
    ]);
    const count = await prisma.notifyRecord.count({ where: { event: "collect_failed" } });
    expect(count - before).toBe(1);
  });

  it("不同 detail 同 event → 仍只 1 条（去重键为 event + 10 分钟窗）", async () => {
    const b1 = await prisma.notifyRecord.count({ where: { event: "job_failed" } });
    await Promise.all([
      notifyEvent("job_failed", { title: "任务A失败", detail: "x" }),
      notifyEvent("job_failed", { title: "任务A失败", detail: "y" }),
    ]);
    const c1 = await prisma.notifyRecord.count({ where: { event: "job_failed" } });
    expect(c1 - b1).toBe(1);
  });

  it("同 event 不同标题 → 各 1 条（去重键含 title 承载路由/任务名标识，卡定义）", async () => {
    const b2 = await prisma.notifyRecord.count({ where: { event: "collect_failed" } });
    await Promise.all([
      notifyEvent("collect_failed", { title: "源A", detail: "x" }),
      notifyEvent("collect_failed", { title: "源B", detail: "y" }),
    ]);
    const c2 = await prisma.notifyRecord.count({ where: { event: "collect_failed" } });
    expect(c2 - b2).toBe(2);
  });
});

describe("B-06 邮件脱敏", () => {
  it("正文中的 password= / token= 形态被替换为 ***", async () => {
    // 自包含：确保无静默窗（不依赖"无效时刻"用例先清理），任意真实时刻都能立即发信
    await prisma.notifyRule.update({ where: { event: "llm_balance_low" }, data: { quietHours: null } });
    __setNotifyClock(null);
    const before = sent.length;
    await notifyEvent("llm_balance_low", { title: "脱敏", detail: "body" });
    await notifySettle(); // V11-MAIL-01：投递已移后台，断言前等待在途发送结束
    const last = sent[sent.length - 1];
    expect(sent.length).toBeGreaterThan(before);
    expect(last?.text).not.toContain("hunter2");
    expect(last?.text).not.toContain("sk-abcdef1234567890");
  });
});

describe("B-06 notify-rules PATCH 接收 quietHours", () => {
  it("PATCH quietHours 后 GET 回读一致", async () => {
    const rules = await prisma.notifyRule.findMany();
    const id = rules[0].id;
    const patch = await rulePATCH(
      req(`/api/notify-rules/${id}`, { method: "PATCH", token: adminToken, body: { quietHours: { start: "23:00", end: "07:00" } } }),
      ctx({ id: String(id) })
    );
    expect(patch.status).toBe(200);
    const data = (await patch.json()) as { data: { quietHours: string | null } };
    expect(JSON.parse(data.data.quietHours ?? "null")).toEqual({ start: "23:00", end: "07:00" });

    const get = await ruleGET(req("/api/notify-rules", { token: adminToken }), ctx());
    expect(get.status).toBe(200);
    const gd = (await get.json()) as { data: { list: { id: number; quietHours: string | null }[] } };
    const found = gd.data.list.find((r) => r.id === id);
    expect(JSON.parse(found?.quietHours ?? "null")).toEqual({ start: "23:00", end: "07:00" });
  });

  it("PATCH quietHours=null 清除", async () => {
    const rules = await prisma.notifyRule.findMany();
    const id = rules[0].id;
    const patch = await rulePATCH(
      req(`/api/notify-rules/${id}`, { method: "PATCH", token: adminToken, body: { quietHours: null } }),
      ctx({ id: String(id) })
    );
    expect(patch.status).toBe(200);
    const data = (await patch.json()) as { data: { quietHours: string | null } };
    expect(data.data.quietHours).toBeNull();
  });
});