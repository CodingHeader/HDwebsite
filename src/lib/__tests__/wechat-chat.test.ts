/**
 * P06 评审 #5：公众号 AI 客服走 chat-service（场景提示词 + 知识库 + 会话历史 + 场景模型），
 * 兜底文案来自 Setting（wechatFallbackReply，电话引用 contactPhone），src/lib 无硬编码电话/域名。
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => {
  const tmp = process.env.TMPDIR || "/tmp";
  process.env.DATABASE_URL = `file:${tmp}/hdw-contract-p06wx-${process.pid}-${Date.now()}.db`;
  return { list: [] as { messages: { role: string; content: string }[]; opts?: { preferredProviderId?: number | null } }[], fail: false };
});

vi.mock("@/lib/llm-gateway", async (orig) => {
  const real = await orig<typeof import("@/lib/llm-gateway")>();
  return {
    ...real,
    gatewayChat: async (messages: { role: string; content: string }[], opts?: { preferredProviderId?: number | null }) => {
      calls.list.push({ messages, opts });
      if (calls.fail) return { ok: false, reply: "", errMsg: "down" };
      return { ok: true, reply: "您好，专升本报名请携带身份证。", providerId: 1, providerName: "mock" };
    },
  };
});

import { execSync } from "node:child_process";
import { prisma } from "@/lib/prisma";
import { cleanupTestDb, initTestDb } from "./api-contract/harness";
import { answerWechatText } from "@/lib/wechat";

let accountId = 0;
let providerId = 0;

beforeAll(async () => {
  await initTestDb();
  providerId = (await prisma.lLMProvider.create({ data: { name: "场景模型", endpoint: "http://x", apiKey: "k", model: "m" } })).id;
  const scene = await prisma.chatScene.create({
    data: { code: "wechat", name: "公众号客服", greeting: "你好", systemPrompt: "你是公众号场景客服SCENEPROMPT", knowledgeTags: "报名", llmProviderId: providerId },
  });
  await prisma.knowledge.create({ data: { title: "报名材料", content: "报名需要身份证与毕业证KBCONTENT", tags: "报名" } });
  await prisma.setting.create({ data: { key: "contactPhone", value: "028-0000-0000", group: "contact" } });
  const acc = await prisma.wechatAccount.create({
    data: { name: "服务号", type: "service", appid: "wx1", appSecret: "", verifyToken: "t", aiEnabled: true, sceneId: scene.id },
  });
  accountId = acc.id;
});
afterAll(async () => {
  await prisma.$disconnect();
  cleanupTestDb();
});

describe("公众号 AI 客服", () => {
  it("带入场景 systemPrompt、知识上下文、场景模型与会话历史", async () => {
    const account = (await prisma.wechatAccount.findUnique({ where: { id: accountId } }))!;
    const a1 = await answerWechatText(account, "openid-1", "报名需要什么材料");
    expect(a1).toContain("身份证");
    const first = calls.list.at(-1)!;
    const sys = first.messages.find((m) => m.role === "system")!.content;
    expect(sys).toContain("SCENEPROMPT");
    expect(sys).toContain("KBCONTENT");
    expect(first.opts?.preferredProviderId).toBe(providerId);
    expect(first.messages.at(-1)).toEqual({ role: "user", content: "报名需要什么材料" });

    await answerWechatText(account, "openid-1", "学费多少");
    const second = calls.list.at(-1)!;
    expect(second.messages.some((m) => m.role === "assistant" && m.content.includes("身份证"))).toBe(true);
    expect(await prisma.aIChatHistory.count({ where: { sessionId: "wx:openid-1", channel: "wechat" } })).toBe(4);
  });

  it("模型不可用 → Setting 兜底文案（引用 contactPhone）", async () => {
    calls.fail = true;
    const account = (await prisma.wechatAccount.findUnique({ where: { id: accountId } }))!;
    const a = await answerWechatText(account, "openid-2", "在吗");
    expect(a).toContain("028-0000-0000");
    calls.fail = false;
  });

  it("src/lib 无硬编码电话/域名", () => {
    const pattern = ["400-001-" + "5729", "hd1994" + ".com"].join("\\|");
    const out = execSync(`grep -rn "${pattern}" src/lib || true`, { encoding: "utf8" });
    expect(out.trim()).toBe("");
  });
});
