/**
 * B-07 公众号发布闭环测试（fetch 打桩 + 临时 SQLite）
 * 覆盖：
 *  1) 正文外链图转存：非微信域名的外链图被 uploadimg 转存为微信 URL；
 *     微信域名/相对路径保持原样；同 URL 只转存一次（复用）。
 *  2) uploadContentImage 边界：超 1MB 跳过；下载失败返回 null；PNG magic 判断文件名。
 *  3) freepublish/get 轮询：成功回写 itemUrl；失败/超时返回 status。
 *  4) 60s 节流：距上次 ContentChannel.publishedAt <60s 时拒绝发布。
 *  5) publishDraftToWechat 全链路：节流→dailyLimit→thumb→draft(含转存)→freepublish/submit→get 回写 url。
 *
 * 使用 vi.hoisted 隔离 DATABASE_URL；mock @/lib/http-client 的 httpFetch 返回可打桩响应。
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const tmp = process.env.TMPDIR || process.env.TEMP || "/tmp";
  process.env.DATABASE_URL = `file:${tmp}/hdw-contract-b07-${process.pid}-${Date.now()}.db`;
  process.env.JWT_SECRET = "b07-test-jwt-secret-0123456789abcdef";
});

// httpFetch 打桩：按 URL 返回不同响应
const httpMock = vi.hoisted(() => ({ calls: [] as { url: string; init?: RequestInit }[] }));
vi.mock("@/lib/http-client", async (orig) => {
  const actual = await orig<typeof import("@/lib/http-client")>();
  return {
    ...actual,
    httpFetch: vi.fn(async (url: string, init?: RequestInit) => {
      httpMock.calls.push({ url, init });
      const u = new URL(url, "https://api.weixin.qq.com").pathname;
      // 微信 API（路径含 /cgi-bin/）优先；其余视为外链源图下载
      if (u.includes("/cgi-bin/token")) {
        return jsonResponse({ access_token: "tok", expires_in: 7200 });
      }
      if (u.includes("/cgi-bin/media/uploadimg")) {
        return jsonResponse({ url: "https://mmbiz.qpic.cn/uploaded/abc" });
      }
      if (u.includes("/cgi-bin/material/add_material")) {
        return jsonResponse({ media_id: "thumb-1" });
      }
      if (u.includes("/cgi-bin/draft/add")) {
        return jsonResponse({ media_id: "draft-1" });
      }
      if (u.includes("/cgi-bin/freepublish/submit")) {
        return jsonResponse({ publish_id: "pub-1" });
      }
      if (u.includes("/cgi-bin/freepublish/get")) {
        if (url.includes("poll-fail")) return jsonResponse({ publish_status: 4, errmsg: "审核不通过" });
        if (url.includes("poll-pending")) return jsonResponse({ publish_status: 1 });
        return jsonResponse({ publish_status: 5, publish_task_info: { article_detail: [{ url: "https://mp.weixin.qq.com/s/abc" }] } });
      }
      // 外链源图下载
      if (url.includes("fail-download")) {
        return new Response(null, { status: 404 });
      }
      if (url.includes("big-image")) {
        return new Response(new Uint8Array(1024 * 1024 + 1), { status: 200 });
      }
      if (url.includes("png-image")) {
        // PNG magic: 89 50 4e 47
        return new Response(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 1, 2, 3, 4]), { status: 200 });
      }
      return new Response(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), { status: 200 });
    }),
  };
});

function jsonResponse(obj: unknown): Response {
  return new Response(JSON.stringify(obj), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

import { prisma } from "@/lib/prisma";
import { cleanupTestDb, initTestDb } from "../api-contract/harness";
import {
  getPublishResult,
  publishDraftToWechat,
  rewriteWechatImages,
  uploadContentImage,
} from "@/lib/wechat";
import type { ContentItem, WechatAccount } from ".prisma/client";

let account: WechatAccount;

async function makeItem(partial: Partial<ContentItem> = {}): Promise<ContentItem> {
  return prisma.contentItem.create({
    data: {
      title: partial.title ?? "测试文章",
      contentType: partial.contentType ?? "html",
      source: partial.source ?? "manual",
      status: partial.status ?? "approved",
      content: partial.content ?? "<p>hi</p>",
      coverImage: partial.coverImage ?? null,
    },
  });
}

async function resetWechatChannel(itemId: number): Promise<void> {
  await prisma.contentChannel.deleteMany({ where: { itemId, channel: "wechat" } });
}

beforeAll(async () => {
  await initTestDb();
  account = await prisma.wechatAccount.create({
    data: {
      name: "t",
      appid: "appid",
      appSecret: "deadbeef-secret",
      type: "service",
      status: "active",
      freepublishEnabled: true,
      aiEnabled: true,
      tokenCache: "",
      verifyToken: null,
      encodingAESKey: null,
      sceneId: null,
    },
  });
});

afterAll(async () => {
  cleanupTestDb();
});

describe("B-07 uploadimg 正文外链图转存", () => {
  it("非微信域名的外链图被转存为微信 URL，微信域名保留原样", async () => {
    const content = `<p>a</p><img src="https://www.example.com/a.jpg" alt="a"/><img src="https://mmbiz.qpic.cn/mmbiz/x.png"/><img src="/relative.png"/>`;
    const out = await rewriteWechatImages(content, "tok");
    expect(out).toContain('src="https://mmbiz.qpic.cn/uploaded/abc"');
    expect(out).toContain('src="https://mmbiz.qpic.cn/mmbiz/x.png"'); // 微信域名保留
    expect(out).toContain('src="/relative.png"'); // 相对路径保留
  });

  it("同 URL 只转存一次", async () => {
    const content = `<img src="https://www.example.com/dup.jpg"/><img src="https://www.example.com/dup.jpg"/>`;
    httpMock.calls.length = 0;
    await rewriteWechatImages(content, "tok");
    const uploads = httpMock.calls.filter((c) => c.url.includes("/cgi-bin/media/uploadimg"));
    expect(uploads.length).toBe(1);
  });

  it("uploadContentImage：超 1MB 返回 null（不阻塞）", async () => {
    const r = await uploadContentImage("tok", "https://www.example.com/big-image.jpg");
    expect(r).toBeNull();
  });

  it("uploadContentImage：源图下载失败返回 null", async () => {
    const r = await uploadContentImage("tok", "https://www.example.com/fail-download.jpg");
    expect(r).toBeNull();
  });

  it("uploadContentImage：PNG magic 时文件名用 img.png", async () => {
    httpMock.calls.length = 0;
    const r = await uploadContentImage("tok", "https://www.example.com/png-image.png");
    expect(r).toBe("https://mmbiz.qpic.cn/uploaded/abc");
    const call = httpMock.calls.find((c) => c.url.includes("/cgi-bin/media/uploadimg"));
    expect(call?.init?.body).toBeInstanceOf(FormData);
  });
});

describe("B-07 freepublish/get 轮询", () => {
  it("成功回写 itemUrl", async () => {
    const r = await getPublishResult("tok", "pub-1", 2);
    expect(r.status).toBe("success");
    expect(r.itemUrl).toBe("https://mp.weixin.qq.com/s/abc");
  });

  it("失败状态返回 status=failed", async () => {
    const r = await getPublishResult("tok", "poll-fail", 2);
    expect(r.status).toBe("failed");
  });

  it("超时返回 status=timeout", async () => {
    const r = await getPublishResult("tok", "poll-pending", 2);
    expect(r.status).toBe("timeout");
  });
});

describe("B-07 60s 节流", () => {
  // 节流是账号级（微信频控语义），测试间必须清空该账号全部 wechat 渠道行，避免上一个用例污染
  beforeEach(async () => {
    await prisma.contentChannel.deleteMany({ where: { channel: "wechat", accountId: account.id } });
  });
  it("距上次发布 <60s 时拒绝", async () => {
    const item = await makeItem();
    await resetWechatChannel(item.id);
    await prisma.contentChannel.create({
      data: { itemId: item.id, channel: "wechat", accountId: account.id, status: "published", publishedAt: new Date(Date.now() - 30_000), externalUrl: "https://x" },
    });
    const r = await publishDraftToWechat(account, "deadbeef-secret", item);
    expect(r.ok).toBe(false);
    expect(r.errMsg).toContain("节流");
  });

  it("距上次发布 ≥60s 时放行", async () => {
    const item = await makeItem();
    await resetWechatChannel(item.id);
    await prisma.contentChannel.create({
      data: { itemId: item.id, channel: "wechat", accountId: account.id, status: "published", publishedAt: new Date(Date.now() - 120_000), externalUrl: "https://x" },
    });
    const r = await publishDraftToWechat(account, "deadbeef-secret", item);
    expect(r.ok).toBe(true);
    expect(r.url).toBe("https://mp.weixin.qq.com/s/abc");
    expect(r.publishId).toBe("pub-1");
  });
});

describe("B-07 publishDraftToWechat 全链路", () => {
  beforeEach(async () => {
    await prisma.contentChannel.deleteMany({ where: { channel: "wechat", accountId: account.id } });
  });
  it("含外链图发布时 draft 内容已替换为微信 URL", async () => {
    httpMock.calls.length = 0; // 只观察本用例产生的调用
    const item = await makeItem({
      content: `<p>hello</p><img src="https://www.example.com/inline.jpg"/>`,
    });
    const r = await publishDraftToWechat(account, "deadbeef-secret", item);
    expect(r.ok).toBe(true);
    // 校验 draft/add 请求体里的 content 已被替换
    const draftCall = httpMock.calls.find((c) => c.url.includes("/cgi-bin/draft/add"));
    const body = JSON.parse(String(draftCall?.init?.body));
    expect(body.articles[0].content).toContain("https://mmbiz.qpic.cn/uploaded/abc");
    expect(body.articles[0].content).not.toContain("www.example.com/inline.jpg");
  });
});
