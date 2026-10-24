/**
 * V11-MAIL-02：失败重试、HTML 模板与分组一致性
 * - 重启后 failed 记录被 notifyRetryScan 兜底重试（次数上限 notifyRetryCount + createdAt 起算指数退避）
 * - 邮件为 HTML 且按事件类别选择模板（before_publish → publish / job_failed,system_error → failed /
 *   llm_balance_low → balance / collect_failed → collect），text 作纯文本回退，内容 HTML 转义
 * - 按提示分组配置的收件人收到对应事件邮件（种子规则核对表的行为级验证）
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const sent = vi.hoisted(() => {
  const tmp = process.env.TMPDIR || "/tmp";
  process.env.DATABASE_URL = `file:${tmp}/hdw-contract-v11mail02-${process.pid}-${Date.now()}.db`;
  return [] as { to: string[]; subject: string; text?: string; html?: string }[];
});

vi.mock("nodemailer", () => {
  const createTransport = () => ({
    sendMail: async (m: { to: string[]; subject: string; text?: string; html?: string }) => {
      sent.push({ to: m.to, subject: m.subject, text: m.text, html: m.html });
      return { messageId: `mock-${sent.length}` };
    },
  });
  return { default: { createTransport }, createTransport };
});

import { prisma } from "@/lib/prisma";
import { cleanupTestDb, initTestDb } from "./api-contract/harness";
import { mailCategory, notifyEvent, notifyRetryScan, notifySettle, renderNotifyHtml } from "@/lib/notify-gateway";

vi.setConfig({ testTimeout: 30_000 });

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
    data: { name: "默认", subject: "[提醒] {title}", body: "{detail}", isDefault: true },
  });
  // 分组口径与 prisma/seed.ts 种子规则一致：before_publish_* → publish；错误/余额/采集 → publish,admin
  await prisma.notifyRule.createMany({
    data: [
      { event: "before_publish_news", templateId: tpl.id, recipientGroups: JSON.stringify(["publish"]) },
      { event: "llm_balance_low", templateId: tpl.id, recipientGroups: JSON.stringify(["publish", "admin"]) },
      { event: "job_failed", templateId: tpl.id, recipientGroups: JSON.stringify(["publish", "admin"]) },
      { event: "collect_failed", templateId: tpl.id, recipientGroups: JSON.stringify(["publish", "admin"]) },
    ],
  });
  await prisma.notifyRecipient.createMany({
    data: [
      { name: "运营", email: "ops@mock.local", groups: JSON.stringify(["publish"]) },
      { name: "管理员", email: "admin@mock.local", groups: JSON.stringify(["admin"]) },
    ],
  });
});

afterAll(async () => {
  await prisma.$disconnect();
  cleanupTestDb();
});

async function failedRecord(overrides: { event?: string; retries?: number; minutesAgo?: number; subject?: string }) {
  return prisma.notifyRecord.create({
    data: {
      event: overrides.event ?? "llm_balance_low",
      toEmails: "ops@mock.local",
      subject: overrides.subject ?? "重启重试",
      content: "内容",
      status: "failed",
      retries: overrides.retries ?? 0,
      errMsg: "restart",
      createdAt: new Date(Date.now() - (overrides.minutesAgo ?? 10) * 60_000),
    },
  });
}

describe("V11-MAIL-02 failed 记录重启重试", () => {
  it("重启后 failed 记录被重试并送达（内存退避定时器丢失的兜底）", async () => {
    const rec = await failedRecord({ retries: 0, minutesAgo: 10 });
    await notifyRetryScan();
    const after = await prisma.notifyRecord.findUnique({ where: { id: rec.id } });
    expect(after?.status).toBe("sent");
    expect(after?.retries).toBe(1); // 从上次失败（retries=0）的下一跳继续
    expect(sent.some((m) => m.subject.includes("重启重试"))).toBe(true);
  });

  it("次数上限：retries ≥ notifyRetryCount(3) 的 failed 不再重试", async () => {
    const rec = await failedRecord({ retries: 3, minutesAgo: 60, subject: "已达上限" });
    await notifyRetryScan();
    const after = await prisma.notifyRecord.findUnique({ where: { id: rec.id } });
    expect(after?.status).toBe("failed"); // 未被扫描重试
    expect(sent.some((m) => m.subject.includes("已达上限"))).toBe(false);
  });

  it("退避：创建未满 2^retries 分钟的 failed 本轮跳过", async () => {
    const rec = await failedRecord({ retries: 0, minutesAgo: 0, subject: "退避未到" });
    await notifyRetryScan();
    const after = await prisma.notifyRecord.findUnique({ where: { id: rec.id } });
    expect(after?.status).toBe("failed");
    expect(sent.some((m) => m.subject.includes("退避未到"))).toBe(false);
  });
});

describe("V11-MAIL-02 HTML 模板与分组一致性", () => {
  it("四类事件 → 对应 HTML 模板类别 + 收件人分组命中（规则核对表行为验证）", async () => {
    await notifyEvent("before_publish_news", { title: "发布稿A", detail: "正文<b>加粗</b>" });
    await notifyEvent("llm_balance_low", { title: "模型余额", detail: "d" });
    await notifyEvent("job_failed", { title: "任务X失败", detail: "d" });
    await notifyEvent("collect_failed", { title: "源Y失败", detail: "d" });
    await notifySettle();

    const bySubject = (frag: string) => sent.filter((m) => m.subject.includes(frag));

    // before_publish_* → publish 模板；收件人=publish 组（ops）
    const pub = bySubject("发布稿A");
    expect(pub).toHaveLength(1);
    expect(pub[0].html).toContain("<!DOCTYPE html>");
    expect(pub[0].html).toContain("发布前提醒");
    expect(pub[0].html).toContain("#1d4ed8");
    expect(pub[0].to).toEqual(["ops@mock.local"]);

    // llm_balance_low → balance 模板；收件人=publish+admin 组
    const bal = bySubject("模型余额");
    expect(bal).toHaveLength(1);
    expect(bal[0].html).toContain("余额提醒");
    expect(bal[0].html).toContain("#b45309");
    expect(bal[0].to.sort()).toEqual(["admin@mock.local", "ops@mock.local"]);

    // job_failed → failed 模板；收件人=publish+admin 组
    const fail = bySubject("任务X失败");
    expect(fail).toHaveLength(1);
    expect(fail[0].html).toContain("失败告警");
    expect(fail[0].html).toContain("#b91c1c");
    expect(fail[0].to.sort()).toEqual(["admin@mock.local", "ops@mock.local"]);

    // collect_failed → collect 模板；收件人=publish+admin 组
    const col = bySubject("源Y失败");
    expect(col).toHaveLength(1);
    expect(col[0].html).toContain("采集告警");
    expect(col[0].html).toContain("#6d28d9");
    expect(col[0].to.sort()).toEqual(["admin@mock.local", "ops@mock.local"]);

    // text 纯文本回退保留；HTML 内容已转义（detail 里的 <b> 不作为标签注入）
    expect(pub[0].text).toContain("正文<b>加粗</b>");
    expect(pub[0].html).toContain("正文&lt;b&gt;加粗&lt;/b&gt;");
    expect(pub[0].html).not.toContain("<b>加粗</b>");
  });

  it("未知事件 → generic 模板；渲染函数事件类别映射（纯函数）", () => {
    expect(mailCategory("before_publish_wechat")).toBe("publish");
    expect(mailCategory("system_error")).toBe("failed");
    expect(mailCategory("job_failed")).toBe("failed");
    expect(mailCategory("llm_balance_low")).toBe("balance");
    expect(mailCategory("collect_failed")).toBe("collect");
    expect(mailCategory("unknown_event")).toBe("generic");
    const html = renderNotifyHtml("unknown_event", "主题<test>", "行1\n行2 & <script>");
    expect(html).toContain("系统通知");
    expect(html).toContain("主题&lt;test&gt;");
    expect(html).toContain("行1<br>行2 &amp; &lt;script&gt;");
  });
});
