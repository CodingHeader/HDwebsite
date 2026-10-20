/**
 * B-07 P2-1：公众号发布节流（60s）→ 重排期不算失败
 *
 * 三层语义（各层独立验证）：
 *  1) src/lib/channels/errors.ts：ChannelThrottledError + isThrottledError（instanceof 与跨模块 name 兜底）
 *  2) src/lib/channels/wechat.ts：publishDraftToWechat 返回 throttled → 抛 ChannelThrottledError（解析 errMsg 秒数）
 *  3) src/lib/publish-executor.ts：executePublishJob catch 节流错误 → markThrottled
 *     （status=scheduled、scheduledAt 推到窗口之后、attemptCount 不变、finishedAt 不置、不写 failed ContentChannel）
 *
 * 对照：普通错误仍走 markFailed（attemptCount+1、指数退避）；未审核内容不被节流分支绕过。
 * 数据库：临时 SQLite（harness 走 prisma/migrations 全量迁移），与 dev.db 隔离。
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const tmp = process.env.TMPDIR || process.env.TEMP || "/tmp";
  process.env.DATABASE_URL = `file:${tmp}/hdw-contract-b07-throttle-${process.pid}-${Date.now()}.db`;
  process.env.JWT_SECRET = "b07-throttle-test-jwt-secret-0123456789abcdef";
});

// ① registry 打桩：wechat 渠道按用例模式返回节流 / 普通错 / 成功
const mode = vi.hoisted(() => ({ kind: "normal" as "normal" | "throttle" | "error" | "ok" }));
vi.mock("@/lib/channels/registry", async (orig) => {
  const actual = await orig<typeof import("@/lib/channels/registry")>();
  const { ChannelThrottledError } = await import("@/lib/channels/errors");
  return {
    ...actual,
    getChannel: (kind: string) => {
      if (kind === "website") return actual.getChannel("website");
      return {
        kind: "wechat" as const,
        label: "公众号",
        requiresAccount: true,
        defaultContentType: "wechat",
        publish: async () => {
          if (mode.kind === "throttle") throw new ChannelThrottledError("公众号发布节流：还需 20s", 20_000);
          if (mode.kind === "error") throw new Error("凭证失效");
          return "published" as const;
        },
      };
    },
  };
});

// ② wechat 模块打桩：按模式返回 throttled / 普通失败
const wxMode = vi.hoisted(() => ({ kind: "throttle" as "throttle" | "fail" }));
vi.mock("@/lib/wechat", () => ({
  getWechatAccountSecret: () => "sec",
  publishDraftToWechat: async () => {
    if (wxMode.kind === "throttle") return { ok: false, throttled: true, errMsg: "公众号发布节流：还需 12s" };
    return { ok: false, errMsg: "freepublish 失败：40001 invalid credential" };
  },
}));

import { prisma } from "@/lib/prisma";
import { cleanupTestDb, initTestDb } from "../api-contract/harness";
import { executePublishJob } from "@/lib/publish-executor";
import { publishToWechat } from "@/lib/channels/wechat";
import { ChannelThrottledError, isThrottledError } from "@/lib/channels/errors";
import type { ContentItem, PublishJob, WechatAccount } from ".prisma/client";

let item: ContentItem;

async function makeJob(over: Partial<PublishJob> = {}): Promise<PublishJob> {
  return prisma.publishJob.create({
    data: {
      itemId: item.id,
      channel: "wechat",
      contentType: "wechat",
      status: "scheduled",
      scheduledAt: new Date(),
      attemptCount: 0,
      ...over,
    },
  });
}

beforeAll(async () => {
  await initTestDb();
  item = await prisma.contentItem.create({
    data: { title: "节流测试稿", content: "<p>hi</p>", status: "approved" },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
  cleanupTestDb();
});

beforeEach(async () => {
  mode.kind = "normal";
  await prisma.publishJob.deleteMany({ where: { itemId: item.id } });
  await prisma.contentChannel.deleteMany({ where: { itemId: item.id } });
});

describe("channels/errors：ChannelThrottledError 语义", () => {
  it("自带剩余毫秒", () => {
    const e = new ChannelThrottledError("节流", 42_000);
    expect(e.name).toBe("ChannelThrottledError");
    expect(e.remainingMs).toBe(42_000);
    expect(e.message).toContain("节流");
  });

  it("isThrottledError：instanceof 命中", () => {
    expect(isThrottledError(new ChannelThrottledError("x", 1))).toBe(true);
  });

  it("isThrottledError：跨模块 name 兜底命中", () => {
    const fake = new Error("跨模块节流错误");
    fake.name = "ChannelThrottledError";
    expect(isThrottledError(fake)).toBe(true);
  });

  it("isThrottledError：普通错误 / 非 Error / null / undefined 不命中", () => {
    expect(isThrottledError(new Error("凭证失效"))).toBe(false);
    expect(isThrottledError({ name: "ChannelThrottledError" })).toBe(false);
    expect(isThrottledError(null)).toBe(false);
    expect(isThrottledError(undefined)).toBe(false);
  });
});

describe("channels/wechat：节流结果 → 语义错误", () => {
  it("throttled=true → 抛 ChannelThrottledError，剩余毫秒由 errMsg 解析", async () => {
    wxMode.kind = "throttle";
    const acc: WechatAccount = await prisma.wechatAccount.create({
      data: { name: "节流号", appid: "appid", appSecret: "s", type: "service", status: "active" },
    });
    const job = await prisma.publishJob.create({
      data: { itemId: item.id, channel: "wechat", contentType: "wechat", status: "publishing", accountId: acc.id },
    });
    let caught: ChannelThrottledError | null = null;
    try {
      await publishToWechat(job);
    } catch (e) {
      caught = e as ChannelThrottledError;
    }
    expect(caught).not.toBeNull();
    expect(isThrottledError(caught)).toBe(true);
    expect(caught!.remainingMs).toBe(12_000);
    // 未写 failed ContentChannel（节流不是失败）
    expect(await prisma.contentChannel.count({ where: { itemId: item.id, channel: "wechat", status: "failed" } })).toBe(0);
    await prisma.publishJob.delete({ where: { id: job.id } });
    await prisma.wechatAccount.delete({ where: { id: acc.id } });
  });

  it("普通失败：抛错（executor 兜底），且已写 failed ContentChannel（既有复用语义）", async () => {
    wxMode.kind = "fail";
    const acc = await prisma.wechatAccount.create({
      data: { name: "普通失败号", appid: "appid", appSecret: "s", type: "service", status: "active" },
    });
    const job = await prisma.publishJob.create({
      data: { itemId: item.id, channel: "wechat", contentType: "wechat", status: "publishing", accountId: acc.id },
    });
    // publishToWechat 对 !ok 抛 Error（由 executor markFailed 兜底）；但 failed ContentChannel 行必须先落库
    await expect(publishToWechat(job)).rejects.toThrow(/freepublish 失败/);
    const cc = await prisma.contentChannel.findFirst({
      where: { itemId: item.id, channel: "wechat", accountId: acc.id, status: "failed" },
    });
    expect(cc).not.toBeNull();
    expect(cc?.errMsg).toContain("freepublish 失败");
    await prisma.publishJob.delete({ where: { id: job.id } });
    await prisma.wechatAccount.delete({ where: { id: acc.id } });
  });
});

describe("publish-executor：节流重排期", () => {
  it("节流 → 返回 failed，任务保持 scheduled、attemptCount 不变、scheduledAt 推到窗口之后、finishedAt 不置", async () => {
    mode.kind = "throttle";
    const job = await makeJob({ attemptCount: 1 });
    const before = Date.now();
    const r = await executePublishJob(job);
    expect(r).toBe("failed");
    const after = await prisma.publishJob.findUnique({ where: { id: job.id } });
    expect(after?.status).toBe("scheduled");
    expect(after?.attemptCount).toBe(1); // 未累计
    expect(after?.errMsg).toContain("节流");
    // 延迟 = max(remainingMs+5000, 60000) = 60000
    expect(after!.scheduledAt!.getTime()).toBeGreaterThanOrEqual(before + 60_000 - 200);
    expect(after!.scheduledAt!.getTime()).toBeLessThanOrEqual(before + 60_000 + 2_000);
    expect(after?.finishedAt).toBeNull();
    expect(await prisma.contentChannel.count({ where: { itemId: item.id, status: "failed" } })).toBe(0);
    expect((await prisma.contentItem.findUnique({ where: { id: item.id } }))?.status).toBe("approved");
  });

  it("普通错误 → markFailed：attemptCount+1、指数退避 2^attempts 分钟", async () => {
    mode.kind = "error";
    const job = await makeJob({ attemptCount: 0 });
    const before = Date.now();
    const r = await executePublishJob(job);
    expect(r).toBe("failed");
    const after = await prisma.publishJob.findUnique({ where: { id: job.id } });
    expect(after?.status).toBe("scheduled"); // attemptCount 1 < 3，可重试
    expect(after?.attemptCount).toBe(1);
    expect(after?.errMsg).toContain("凭证失效");
    expect(after!.scheduledAt!.getTime()).toBeGreaterThanOrEqual(before + 2 * 60_000 - 200);
  });

  it("成功发布 → published（回归：非节流路径不误伤）", async () => {
    mode.kind = "ok";
    const job = await makeJob({ attemptCount: 0 });
    const r = await executePublishJob(job);
    expect(r).toBe("published");
    const after = await prisma.publishJob.findUnique({ where: { id: job.id } });
    expect(after?.status).toBe("published");
    expect(after?.finishedAt).not.toBeNull();
    expect(after?.errMsg).toBeNull();
    expect((await prisma.contentItem.findUnique({ where: { id: item.id } }))?.status).toBe("published");
  });

  it("未审核内容 → failed（审核门不被节流分支绕过）", async () => {
    mode.kind = "ok";
    const draft = await prisma.contentItem.create({ data: { title: "未过审", content: "x", status: "draft" } });
    const job = await prisma.publishJob.create({
      data: { itemId: draft.id, channel: "website", contentType: "article", status: "scheduled", scheduledAt: new Date() },
    });
    const r = await executePublishJob(job);
    expect(r).toBe("failed");
    const after = await prisma.publishJob.findUnique({ where: { id: job.id } });
    expect(after?.errMsg).toMatch(/审核/);
    expect(after?.attemptCount).toBe(1); // 走失败，不是节流
    expect((await prisma.contentItem.findUnique({ where: { id: draft.id } }))?.status).toBe("draft");
    await prisma.publishJob.delete({ where: { id: job.id } });
    await prisma.contentItem.delete({ where: { id: draft.id } });
  });
});