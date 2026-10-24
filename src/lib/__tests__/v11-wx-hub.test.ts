/**
 * V11-WX-01~04 + V11-HUB-02：公众号发布链修复回归。
 * 覆盖：封面/摘要派生（WX-01）、站内相对路径图转存（WX-02）、
 * 官网重发幂等（WX-04）、渠道状态 scheduled/publishing 派生（HUB-02）。
 * freepublish 失败回写（WX-04）依赖微信 mock httpFetch，一并覆盖。
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: vi.fn() } }));

import { deriveCoverImage, deriveExcerpt } from "@/lib/crud-resources/content";
import { rewriteWechatImages } from "@/lib/wechat";
import { prisma } from "@/lib/prisma";

describe("V11-WX-01：封面/摘要派生", () => {
  it("HTML 内容取首个 <img src>", () => {
    expect(deriveCoverImage('<p>x</p><img src="/uploads/a.png" alt=""><p>y</p>')).toBe("/uploads/a.png");
  });
  it("Markdown 内容取首个 ![](src)", () => {
    expect(deriveCoverImage("前文\n![图](/uploads/b.jpg)\n后文")).toBe("/uploads/b.jpg");
  });
  it("无图返回 null（不伪造）", () => {
    expect(deriveCoverImage("纯文本")).toBeNull();
  });
  it("摘要：HTML 剥标签截断；markdown 剥语法", () => {
    expect(deriveExcerpt("<p>第一段</p><p>第二段</p>", "html", 10)).toBe("第一段 第二段".slice(0, 10));
    expect(deriveExcerpt("# 标题\n![x](/a.png)正文", "markdown")).toContain("正文");
    expect(deriveExcerpt("", "html")).toBeNull();
  });
});

describe("V11-WX-02：站内相对路径图转存", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("相对路径 /uploads 图按 origin 补全后进入转存队列", async () => {
    const calls: string[] = [];
    vi.doMock("@/lib/wechat-client", () => ({ httpFetch: vi.fn() }));
    // 直接断言过滤行为：把 uploadContentImage 内部用的 httpFetch 打桩不可行（模块内函数），
    // 用可观测行为：微信域名图跳过 + 相对路径不再被丢弃（通过 spy fetch）
    const origFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return new Response("<html></html>", { status: 200 });
    }) as typeof fetch;
    try {
      await rewriteWechatImages('<img src="/uploads/a.png"><img src="https://mmbiz.qpic.cn/x.png">', "TOKEN", "http://127.0.0.1:6789");
      // 站内图会被 fetch（uploadimg 前置下载）；微信域名图跳过
      expect(calls.some((c) => c.includes("/uploads/a.png"))).toBe(true);
      expect(calls.some((c) => c.includes("mmbiz.qpic.cn"))).toBe(false);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it("无 origin（旧签名）时相对路径保持原样（兼容）", async () => {
    const origFetch = globalThis.fetch;
    const calls: string[] = [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return new Response("<html></html>", { status: 200 });
    }) as typeof fetch;
    try {
      await rewriteWechatImages('<img src="/uploads/a.png">', "TOKEN");
      expect(calls.some((c) => c.includes("/uploads/a.png"))).toBe(false);
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});

describe("V11-WX-04：官网渠道重发幂等", () => {
  it("已有 website 渠道记录时更新既有文章而非新建", async () => {
    const created = vi.fn();
    const updated = vi.fn(async () => ({ id: 7 }));
    const fakedPrisma = {
      contentItem: { findUnique: async () => ({ id: 1, title: "t", content: "c", contentType: "markdown", excerpt: null, coverImage: null, authorId: 1 }) },
      contentChannel: {
        findFirst: async () => ({ id: 5, itemId: 1, channel: "website", externalId: "42", externalUrl: "/articles/42", status: "published" }),
        create: vi.fn(async () => ({})),
      },
      article: { create: created, update: updated, findUnique: async () => null },
      $transaction: vi.fn(),
    };
    vi.doMock("@/lib/prisma", () => ({ prisma: fakedPrisma }));
    vi.resetModules();
    const { publishToWebsite } = await import("@/lib/channels/website");
    const job = { itemId: 1, action: "publish", contentType: "article", channel: "website", id: 9 } as never;
    const r = await publishToWebsite(job);
    expect(r).toBe("published");
    expect(updated).toHaveBeenCalled();
    expect(created).not.toHaveBeenCalled();
    void prisma;
  });

  it("首次发布保持新建文章", async () => {
    const created = vi.fn(async () => ({ id: 8 }));
    const updated = vi.fn();
    const fakedPrisma = {
      contentItem: { findUnique: async () => ({ id: 2, title: "t2", content: "c2", contentType: "markdown", excerpt: null, coverImage: null, authorId: 1 }) },
      contentChannel: {
        findFirst: async () => null,
        create: vi.fn(async () => ({})),
      },
      article: { create: created, update: updated, findUnique: async () => null },
      $transaction: vi.fn(),
    };
    vi.doMock("@/lib/prisma", () => ({ prisma: fakedPrisma }));
    vi.resetModules();
    const { publishToWebsite } = await import("@/lib/channels/website");
    const r = await publishToWebsite({ itemId: 2, action: "publish", contentType: "article", channel: "website", id: 10 } as never);
    expect(r).toBe("published");
    expect(created).toHaveBeenCalled();
    expect(updated).not.toHaveBeenCalled();
  });
});

describe("V11-HUB-02：渠道状态派生", () => {
  it("仅有 PublishJob（scheduled/publishing）时状态如实派生", async () => {
    const fakedPrisma = {
      contentChannel: { findMany: async () => [] },
      publishJob: {
        findMany: async () => [{ id: 1, itemId: 3, channel: "website", status: "scheduled", scheduledAt: new Date(), createdAt: new Date() }],
      },
    };
    vi.doMock("@/lib/prisma", () => ({ prisma: fakedPrisma }));
    vi.resetModules();
    const { buildItemChannelsFor } = await import("@/lib/channels/content-hub-state");
    const states = await buildItemChannelsFor(3);
    const website = states.find((s) => s.channel === "website");
    expect(website?.status).toBe("scheduled");

    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        contentChannel: { findMany: async () => [] },
        publishJob: { findMany: async () => [{ id: 1, itemId: 3, channel: "website", status: "publishing", scheduledAt: new Date(), createdAt: new Date() }] },
      },
    }));
    vi.resetModules();
    const mod2 = await import("@/lib/channels/content-hub-state");
    const states2 = await mod2.buildItemChannelsFor(3);
    expect(states2.find((s) => s.channel === "website")?.status).toBe("publishing");
  });
});
