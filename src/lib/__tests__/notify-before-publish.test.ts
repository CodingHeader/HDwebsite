/**
 * P06 评审 #3/#4：提醒闭环（SMTP 以 vi.mock(nodemailer) 捕获，不外发）
 * - scheduledAt=null 的立即发布任务：执行前同步产生 before_publish_* NotifyRecord（且仅一次）
 * - 路由抛异常 → 500 信封 + system_error 多收件人邮件（api-handler 默认 onApiError 监听）；10 分钟内同类聚合为 1 条
 * - 调度任务异常 → job_failed
 * - 模型余额低于阈值 → llm_balance_low
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const sent = vi.hoisted(() => {
  const tmp = process.env.TMPDIR || "/tmp";
  process.env.DATABASE_URL = `file:${tmp}/hdw-contract-p06notify-${process.pid}-${Date.now()}.db`;
  return [] as { to: string[]; subject: string }[];
});

vi.mock("nodemailer", () => {
  const createTransport = () => ({
    sendMail: async (m: { to: string[]; subject: string }) => {
      sent.push({ to: m.to, subject: m.subject });
      return { messageId: `mock-${sent.length}` };
    },
  });
  return { default: { createTransport }, createTransport };
});

import { prisma } from "@/lib/prisma";
import { cleanupTestDb, initTestDb } from "./api-contract/harness";
import { publishScan } from "@/lib/publish-executor";
import { llmBalanceCheck, notifySettle } from "@/lib/notify-gateway";
import { withApi } from "@/lib/api-handler";
import { registerJob, scanOnce } from "@/lib/scheduler";

vi.setConfig({ testTimeout: 20_000 });

async function waitFor(fn: () => Promise<boolean>, ms = 3000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await fn()) return;
    await new Promise((r) => setTimeout(r, 50));
  }
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
  const tpl = await prisma.notifyTemplate.create({ data: { name: "默认", subject: "[提醒] {title}", body: "{detail} {link}", isDefault: true } });
  for (const event of ["before_publish_news", "before_publish_info", "before_publish_wechat", "job_failed", "llm_balance_low"]) {
    await prisma.notifyRule.create({ data: { event, templateId: tpl.id, recipientGroups: JSON.stringify(["publish"]) } });
  }
  await prisma.notifyRule.create({ data: { event: "system_error", templateId: tpl.id, recipientGroups: JSON.stringify(["admin"]) } });
  await prisma.notifyRecipient.createMany({
    data: [
      { name: "运营", email: "ops@mock.local", groups: JSON.stringify(["publish"]) },
      { name: "管理员1", email: "admin1@mock.local", groups: JSON.stringify(["admin"]) },
      { name: "管理员2", email: "admin2@mock.local", groups: JSON.stringify(["admin", "publish"]) },
    ],
  });
  const role = await prisma.role.create({ data: { name: "超管", slug: "super", permissions: "[]", isSuper: true } });
  await prisma.user.create({ data: { id: 1, username: "admin", passwordHash: "x", roleId: role.id } });
});
afterAll(async () => {
  await prisma.$disconnect();
  cleanupTestDb();
});

describe("发布前提醒（立即发布）", () => {
  it("scheduledAt=null 的任务执行前产生 before_publish_news 记录且邮件已发", async () => {
    const item = await prisma.contentItem.create({ data: { title: "立即发布稿", content: "正文", status: "approved" } });
    const job = await prisma.publishJob.create({ data: { itemId: item.id, channel: "website", contentType: "article", status: "pending" } });
    await publishScan();
    await notifySettle(); // V11-MAIL-01：投递已移后台，断言前等待在途发送结束
    const recs = await prisma.notifyRecord.findMany({ where: { event: "before_publish_news" } });
    expect(recs).toHaveLength(1);
    expect(recs[0].status).toBe("sent");
    const after = await prisma.publishJob.findUnique({ where: { id: job.id } });
    expect(after?.status).toBe("published");
    expect(after?.notifySentAt).not.toBeNull();
    expect(recs[0].createdAt.getTime()).toBeLessThanOrEqual(after!.startedAt!.getTime());
    expect(sent.some((m) => m.subject.includes("立即发布稿"))).toBe(true);
  });
  it("preNotify=false 不提醒", async () => {
    const item = await prisma.contentItem.create({ data: { title: "静默稿", content: "正文", status: "approved" } });
    await prisma.publishJob.create({ data: { itemId: item.id, channel: "website", status: "pending", preNotify: false } });
    // 差值断言（自包含）：本任务执行后 before_publish_news 记录数不增加，不依赖首个用例是否先建了记录
    const before = await prisma.notifyRecord.count({ where: { event: "before_publish_news" } });
    await publishScan();
    expect(await prisma.notifyRecord.count({ where: { event: "before_publish_news" } })).toBe(before);
  });
  it("未审核内容不得发布（failed，不改内容状态）", async () => {
    const item = await prisma.contentItem.create({ data: { title: "草稿", content: "正文", status: "draft" } });
    const job = await prisma.publishJob.create({ data: { itemId: item.id, channel: "website", status: "pending", preNotify: false } });
    await publishScan();
    const after = await prisma.publishJob.findUnique({ where: { id: job.id } });
    expect(after?.status === "failed" || after?.status === "scheduled").toBe(true);
    expect(after?.errMsg).toMatch(/审核/);
    expect((await prisma.contentItem.findUnique({ where: { id: item.id } }))?.status).toBe("draft");
  });
});

describe("API 异常 → system_error 邮件", () => {
  it("路由抛异常 → 500 信封 + 多收件人 system_error；10 分钟聚合为 1 条", async () => {
    const route = withApi(async () => { throw new TypeError("boom"); }, { route: "test/boom" });
    const r1 = await route(new Request("http://localhost/api/boom"), { params: Promise.resolve({}) });
    expect(r1.status).toBe(500);
    const body = await r1.json();
    expect(body).toMatchObject({ code: 500, data: null });
    await waitFor(async () => (await prisma.notifyRecord.count({ where: { event: "system_error" } })) > 0);
    const r2 = await route(new Request("http://localhost/api/boom"), { params: Promise.resolve({}) });
    expect(r2.status).toBe(500);
    await new Promise((r) => setTimeout(r, 300));
    const recs = await prisma.notifyRecord.findMany({ where: { event: "system_error" } });
    expect(recs).toHaveLength(1);
    expect(recs[0].toEmails.split(",").sort()).toEqual(["admin1@mock.local", "admin2@mock.local"]);
    expect(recs[0].content).toContain("boom");
  });
});

describe("调度任务异常 → job_failed", () => {
  it("scanOnce 中任务抛错 → job_failed 记录", async () => {
    await prisma.cronJob.create({ data: { name: "test.explode", cron: "* * * * *", enabled: true } });
    registerJob("test.explode", async () => { throw new Error("job exploded"); });
    await scanOnce(new Date());
    const rec = await prisma.notifyRecord.findFirst({ where: { event: "job_failed" } });
    expect(rec?.content).toContain("job exploded");
  });
});

describe("余额低提醒", () => {
  it("余额 ≤ 阈值 → llm_balance_low", async () => {
    await prisma.lLMProvider.create({ data: { name: "模型A", endpoint: "http://x", apiKey: "k", model: "m", balance: 5, balanceThreshold: 10 } });
    await llmBalanceCheck();
    const rec = await prisma.notifyRecord.findFirst({ where: { event: "llm_balance_low" } });
    expect(rec?.subject).toContain("模型A");
  });
});
