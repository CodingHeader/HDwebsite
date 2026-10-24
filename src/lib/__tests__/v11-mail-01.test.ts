/**
 * V11-MAIL-01：SMTP 发送异步化
 * - notifyEvent 只建 NotifyRecord（记录即队列）即返回，主流程不被 SMTP 挂起/慢速阻塞（<100ms）
 * - 邮件仍会在后台送达（scheduleDeliver → notifySettle 可等待）
 * - 发送超时上限（默认 10s，测试注入 80ms）：超时按失败标记走 failed/dead 路径并留痕 errMsg
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => {
  const tmp = process.env.TMPDIR || "/tmp";
  process.env.DATABASE_URL = `file:${tmp}/hdw-contract-v11mail01-${process.pid}-${Date.now()}.db`;
  return {
    hold: false, // sendMail 挂起开关：true 时等待 release
    delayMs: 0, // sendMail 人为延迟
    waiters: [] as (() => void)[],
    sent: [] as { to: string[]; subject: string; text?: string }[],
  };
});

/** 已记录发送数的基线（跨用例排空残留后取值，断言一律用差值） */
let sentBase = 0;

function releaseAll(): void {
  for (const r of state.waiters.splice(0)) r();
}

/** 等待 sendMail 注册到挂起门（后台投递链要经几跳 DB 调用才调到 sendMail） */
async function waitForHold(expected: number, maxMs = 3000): Promise<void> {
  const t0 = Date.now();
  while (state.waiters.length < expected && Date.now() - t0 < maxMs) {
    await new Promise((r) => setTimeout(r, 20));
  }
  expect(state.waiters.length).toBeGreaterThanOrEqual(expected);
}

vi.mock("nodemailer", () => {
  const createTransport = () => ({
    sendMail: async (m: { to: string[]; subject: string; text?: string }) => {
      if (state.delayMs > 0) await new Promise((r) => setTimeout(r, state.delayMs));
      if (state.hold) await new Promise<void>((r) => state.waiters.push(r));
      state.sent.push({ to: m.to, subject: m.subject, text: m.text });
      return { messageId: `mock-${state.sent.length}` };
    },
  });
  return { default: { createTransport }, createTransport };
});

import { prisma } from "@/lib/prisma";
import { cleanupTestDb, initTestDb } from "./api-contract/harness";
import { notifyEvent, notifySettle, __setNotifySendTimeout } from "@/lib/notify-gateway";

vi.setConfig({ testTimeout: 20_000 });

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
  await prisma.notifyRule.create({ data: { event: "llm_balance_low", templateId: tpl.id, recipientGroups: JSON.stringify(["publish"]) } });
  await prisma.notifyRecipient.create({ data: { name: "运营", email: "ops@mock.local", groups: JSON.stringify(["publish"]) } });
});

beforeEach(async () => {
  // 排空上一用例可能残留的挂起发送，再取差值基线
  for (let i = 0; i < 3; i++) {
    releaseAll();
    await new Promise((r) => setTimeout(r, 5));
  }
  state.hold = false;
  state.delayMs = 0;
  __setNotifySendTimeout(null);
  sentBase = state.sent.length;
});

afterAll(async () => {
  releaseAll();
  await prisma.$disconnect();
  cleanupTestDb();
});

describe("V11-MAIL-01 发送异步化", () => {
  it("SMTP 挂起时主流程 <100ms 返回（记录即队列），释放后后台仍送达", async () => {
    state.hold = true;
    const t0 = Date.now();
    await notifyEvent("llm_balance_low", { title: "挂起测试", detail: "d" });
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeLessThan(100);

    const rec = await prisma.notifyRecord.findFirst({
      where: { event: "llm_balance_low", subject: { contains: "挂起测试" } },
      orderBy: { id: "desc" },
    });
    expect(rec).not.toBeNull();

    await waitForHold(1); // 确认后台已调到 sendMail 且被挂起
    expect(state.sent.length - sentBase).toBe(0); // 主流程早已返回，邮件尚未发出

    releaseAll();
    await notifySettle();
    expect(state.sent.length - sentBase).toBe(1);
    const after = await prisma.notifyRecord.findUnique({ where: { id: rec!.id } });
    expect(after?.status).toBe("sent");
  });

  it("慢速 SMTP（1.2s）不阻塞主流程，后台送达且状态 sent", async () => {
    state.delayMs = 1200;
    const t0 = Date.now();
    await notifyEvent("llm_balance_low", { title: "慢速测试", detail: "d" });
    expect(Date.now() - t0).toBeLessThan(100);
    expect(state.sent.length - sentBase).toBe(0);

    await notifySettle();
    expect(state.sent.length - sentBase).toBe(1);
    const rec = await prisma.notifyRecord.findFirst({
      where: { event: "llm_balance_low", subject: { contains: "慢速测试" } },
      orderBy: { id: "desc" },
    });
    expect(rec?.status).toBe("sent");
    expect(rec?.sentAt).not.toBeNull();
  });

  it("挂起期间多个事件连续入队均不阻塞（各自后台送达）", async () => {
    state.hold = true;
    const t0 = Date.now();
    await Promise.all([
      notifyEvent("llm_balance_low", { title: "并发A", detail: "1" }),
      notifyEvent("llm_balance_low", { title: "并发B", detail: "2" }),
    ]);
    expect(Date.now() - t0).toBeLessThan(100);

    await waitForHold(2);
    expect(state.sent.length - sentBase).toBe(0);

    releaseAll();
    await notifySettle();
    expect(state.sent.length - sentBase).toBe(2);
    const statuses = await prisma.notifyRecord.findMany({
      where: { event: "llm_balance_low", subject: { contains: "并发" } },
      select: { status: true },
    });
    expect(statuses.map((r) => r.status)).toEqual(["sent", "sent"]);
  });

  it("SMTP 挂起超过发送超时上限 → 按失败标记留痕（errMsg 含超时说明）", async () => {
    // notifyRetryCount=0：超时后直接终态 dead，避免 60s 退避定时器残留在测试进程
    await prisma.setting.create({ data: { key: "notifyRetryCount", value: "0", group: "notify" } });
    __setNotifySendTimeout(80);
    state.hold = true;
    try {
      await notifyEvent("llm_balance_low", { title: "超时测试", detail: "d" });
      await notifySettle();
      const rec = await prisma.notifyRecord.findFirst({
        where: { event: "llm_balance_low", subject: { contains: "超时测试" } },
        orderBy: { id: "desc" },
      });
      expect(["failed", "dead"]).toContain(rec?.status);
      expect(rec?.errMsg).toContain("超时");
    } finally {
      await prisma.setting.deleteMany({ where: { key: "notifyRetryCount" } });
    }
  });
});
