/**
 * V11-LLM-03：兜底可达性 + 公众号客服安全模式 AES 解密
 * ==========================================================
 * 1) §LLM.3 限频/配额不短路兜底链：现状盘点确认 43a555e（C-09）已改为逐供应商闸门
 *    （quotaSkipReason/circuit 只 continue 当前供应商，isFallback 免熔断），审计声明与现状不符
 *    ——本文件以 mock 回归测试固定该行为（主模型限频/配额满 → 兜底仍被调用）。
 * 2) §LLM.4 公众号安全模式 AES：src/lib/wechat.ts 本轮所有权在 WX lane（禁碰），解密助手
 *    落位 src/lib/llm/wechat-crypto.ts（报备见证据），此处按官方规范做原语级测试。
 * 3) §LLM.5 默认场景/风控频率：需求核对结论入证据（REQ-F-009 vs ADR-034 冻结默认冲突，
 *    按代理规则不替用户裁决，标 UNKNOWN）。
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "node:crypto";

vi.hoisted(() => {
  const tmp = process.env.TMPDIR || process.env.TEMP || "/tmp";
  process.env.DATABASE_URL = `file:${tmp}/hdw-contract-v11llm03-${process.pid}-${Date.now()}.db`;
});

const streamScripts = vi.hoisted(() => ({
  called: [] as string[],
  byProvider: new Map<string, () => { chunks: string[]; failAtStart?: boolean }>(),
}));

vi.mock("@/lib/llm/registry", () => ({
  getAdapter: (kind: string) => ({
    kind,
    chat: async (provider: { name: string }) => {
      streamScripts.called.push(`chat:${provider.name}`);
      const script = streamScripts.byProvider.get(provider.name) ?? (() => ({ chunks: [], failAtStart: true }));
      const s = script();
      if (s.failAtStart) throw new Error("mock 上游失败");
      return { reply: s.chunks.join(""), tokensIn: 0, tokensOut: 0 };
    },
    stream: async () => {
      throw new Error("mock 流式不可用");
    },
  }),
  registeredKinds: () => ["openai"],
}));

import { prisma } from "@/lib/prisma";
import { cleanupTestDb, initTestDb } from "./api-contract/harness";
import { gatewayChat } from "@/lib/llm-gateway";
import { __resetRateCalls, recordRateCall } from "@/lib/llm/limits";
import {
  decryptWechatCallbackPayload,
  decryptWechatSafeMessage,
  encryptWechatSafeMessage,
  encryptWechatSafeReplyXml,
  extractEncryptNode,
  verifyWechatSafeSignature,
  WechatSafeModeError,
} from "@/lib/llm/wechat-crypto";

const BEIJING_TODAY = new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);

async function seedProvider(name: string, over: Record<string, unknown> = {}): Promise<number> {
  const row = await prisma.lLMProvider.create({
    data: { name, kind: "openai", endpoint: "http://mock/v1", apiKey: "k", model: "m", status: "active", priority: 10, ...over } as never,
  });
  return row.id;
}

beforeAll(async () => {
  await initTestDb();
});
afterAll(() => {
  cleanupTestDb();
});
beforeEach(async () => {
  streamScripts.called = [];
  streamScripts.byProvider.clear();
  __resetRateCalls();
  await prisma.lLMProvider.deleteMany({});
  await prisma.lLMUsage.deleteMany({});
});
afterEach(async () => {
  __resetRateCalls();
  await prisma.lLMProvider.deleteMany({});
  await prisma.lLMUsage.deleteMany({});
});

/** 测试用合法 EncodingAESKey（32 字节 → base64 去掉尾 = → 43 位） */
function makeAesKey(): string {
  return crypto.randomBytes(32).toString("base64").slice(0, 43);
}

describe("V11-LLM-03 · 限频/配额不短路兜底链（§LLM.3 回归）", () => {
  it("主模型限频命中 → 该供应商跳过，兜底模型仍被调用并返回", async () => {
    const main = await seedProvider("MainLimited", { priority: 1, isDefault: false, isFallback: false, rateLimit: 1, dailyQuota: 1000 });
    const fallback = await seedProvider("FallbackOk", { priority: 9, isDefault: false, isFallback: true, rateLimit: 0, dailyQuota: 0 });
    streamScripts.byProvider.set("FallbackOk", () => ({ chunks: ["兜底回答"] }));
    recordRateCall(main); // 主模型滑窗已满（rateLimit=1）

    const r = await gatewayChat([{ role: "user", content: "hi" }], { preferredProviderIds: [main, fallback] });
    expect(r.ok).toBe(true);
    expect(r.reply).toBe("兜底回答");
    expect(r.providerName).toBe("FallbackOk");
    expect(streamScripts.called).toEqual(["chat:FallbackOk"]); // 主模型被跳过、兜底被调用
  });

  it("主模型当日配额满 → 跳过，兜底模型仍被调用（DB 口径）", async () => {
    const main = await seedProvider("MainQuotaFull", { priority: 1, isFallback: false, dailyQuota: 5, rateLimit: 0 });
    const fallback = await seedProvider("FallbackQuotaOk", { priority: 9, isFallback: true, dailyQuota: 0, rateLimit: 0 });
    await prisma.lLMUsage.create({ data: { date: BEIJING_TODAY, providerId: main, calls: 5, tokensIn: 0, tokensOut: 0, failures: 0 } });
    streamScripts.byProvider.set("FallbackQuotaOk", () => ({ chunks: ["配额兜底"] }));

    const r = await gatewayChat([{ role: "user", content: "hi" }], { preferredProviderIds: [main, fallback] });
    expect(r.ok).toBe(true);
    expect(r.reply).toBe("配额兜底");
    expect(r.providerName).toBe("FallbackQuotaOk");
  });

  it("主模型失败（上游错误）→ 继续尝试兜底，不短路兜底链", async () => {
    const main = await seedProvider("MainDown", { priority: 1, isFallback: false, dailyQuota: 1000, rateLimit: 0 });
    const fallback = await seedProvider("FallbackAfterFail", { priority: 9, isFallback: true, dailyQuota: 0, rateLimit: 0 });
    streamScripts.byProvider.set("MainDown", () => ({ chunks: [], failAtStart: true }));
    streamScripts.byProvider.set("FallbackAfterFail", () => ({ chunks: ["失败后兜底"] }));

    const r = await gatewayChat([{ role: "user", content: "hi" }], { preferredProviderIds: [main, fallback] });
    expect(r.ok).toBe(true);
    expect(r.reply).toBe("失败后兜底");
    expect(streamScripts.called).toEqual(["chat:MainDown", "chat:FallbackAfterFail"]);
  });
});

describe("V11-LLM-03 · 公众号安全模式 AES（§LLM.4，llm/wechat-crypto.ts）", () => {
  const AES_KEY = makeAesKey();
  const APP_ID = "wx1234567890abcdef";

  /** 用裸 node:crypto 侧造一个合法密文（不走被测模块，交叉验证格式与 IV 派生） */
  function craftCiphertext(msg: string, appId: string): string {
    const key = Buffer.from(AES_KEY + "=", "base64");
    const body = Buffer.concat([
      crypto.randomBytes(16),
      (() => {
        const len = Buffer.alloc(4);
        const m = Buffer.from(msg, "utf8");
        len.writeUInt32BE(m.length);
        return Buffer.concat([len, m, Buffer.from(appId, "utf8")]);
      })(),
    ]);
    const padLen = 32 - (body.length % 32);
    const padded = Buffer.concat([body, Buffer.alloc(padLen, padLen)]);
    const cipher = crypto.createCipheriv("aes-256-cbc", key, key.subarray(0, 16));
    cipher.setAutoPadding(false);
    return Buffer.concat([cipher.update(padded), cipher.final()]).toString("base64");
  }

  it("解密（裸 crypto 交叉构造密文）→ 明文消息体正确、receiveId 校验通过", () => {
    const cipherText = craftCiphertext("<xml><FromUserName><![CDATA[oX]]></FromUserName><MsgType><![CDATA[text]]></MsgType><Content><![CDATA[报名]]></Content></xml>", APP_ID);
    const plain = decryptWechatSafeMessage(cipherText, AES_KEY, APP_ID);
    expect(plain).toContain("报名");
    expect(plain).toContain("<Content>");
  });

  it("receiveId 与 appId 不一致 → 类型化错误（防跨应用重放）", () => {
    const cipherText = craftCiphertext("hello", "wxOtherApp");
    expect(() => decryptWechatSafeMessage(cipherText, AES_KEY, APP_ID)).toThrow(WechatSafeModeError);
    expect(() => decryptWechatSafeMessage(cipherText, AES_KEY, APP_ID)).toThrow(/receiveId/);
  });

  it("密钥错误 → 解密失败类型化报错；EncodingAESKey 非法 → BAD_AES_KEY", () => {
    const cipherText = craftCiphertext("hello", APP_ID);
    expect(() => decryptWechatSafeMessage(cipherText, makeAesKey(), APP_ID)).toThrow(WechatSafeModeError);
    expect(() => decryptWechatSafeMessage(cipherText, "short-key", APP_ID)).toThrow(/43 位/);
  });

  it("加密→解密 round-trip（模块自身加解密互逆，PKCS#7(32) 口径）", () => {
    const msg = "您好，专升本报名请携带身份证。<xml>&特殊字符";
    const cipherText = encryptWechatSafeMessage(msg, AES_KEY, APP_ID);
    expect(decryptWechatSafeMessage(cipherText, AES_KEY, APP_ID)).toBe(msg);
  });

  it("安全模式签名：四元组 sha1 排序口径（含 encrypt）", () => {
    const encrypt = craftCiphertext("x", APP_ID);
    const sig = crypto.createHash("sha1").update(["tok", "1700000000", "nonce1", encrypt].sort().join("")).digest("hex");
    expect(verifyWechatSafeSignature("tok", "1700000000", "nonce1", encrypt, sig)).toBe(true);
    expect(verifyWechatSafeSignature("tok", "1700000000", "nonce1", encrypt, "deadbeef")).toBe(false);
    // 明文验签（旧 verifySignature 语义）不混用：encrypt 为空 → false
    expect(verifyWechatSafeSignature("tok", "1700000000", "nonce1", "", sig)).toBe(false);
  });

  it("extractEncryptNode：CDATA/裸文本均可提取；明文 XML 返回 null", () => {
    expect(extractEncryptNode("<xml><Encrypt><![CDATA[abc==]]></Encrypt></xml>")).toBe("abc==");
    expect(extractEncryptNode("<xml><Encrypt>abc==</Encrypt></xml>")).toBe("abc==");
    expect(extractEncryptNode("<xml><Content><![CDATA[明文]]></Content></xml>")).toBeNull();
  });

  it("decryptWechatCallbackPayload：兼容模式解密成功并标记 mode；strict 模式解密失败不回落", () => {
    const inner = "<xml><Content><![CDATA[加密消息]]></Content></xml>";
    const encrypt = craftCiphertext(inner, APP_ID);
    const xml = `<xml><ToUserName><![CDATA[gh]]></ToUserName><Encrypt><![CDATA[${encrypt}]]></Encrypt></xml>`;
    const sig = crypto.createHash("sha1").update(["tok", "1700000000", "n1", encrypt].sort().join("")).digest("hex");

    const ok = decryptWechatCallbackPayload({
      xml, appId: APP_ID, encodingAesKey: AES_KEY, signature: sig, timestamp: "1700000000", nonce: "n1", token: "tok", strict: false,
    });
    expect(ok).toMatchObject({ ok: true, mode: "compatible" });
    if (ok.ok) expect(ok.xml).toContain("加密消息");

    // 签名不符 + 兼容模式 → 报错（签名校验不因宽松模式跳过）
    const badSig = decryptWechatCallbackPayload({
      xml, appId: APP_ID, encodingAesKey: AES_KEY, signature: "x", timestamp: "1700000000", nonce: "n1", token: "tok", strict: false,
    });
    expect(badSig.ok).toBe(false);
  });

  it("decryptWechatCallbackPayload：未携带 Encrypt → 明文直通（plain 模式）", () => {
    const ok = decryptWechatCallbackPayload({
      xml: "<xml><Content><![CDATA[明文消息]]></Content></xml>",
      appId: APP_ID, encodingAesKey: AES_KEY, signature: "any", timestamp: "1", nonce: "n", token: "tok", strict: true,
      fallback: () => "<xml><Content><![CDATA[明文消息]]></Content></xml>",
    });
    expect(ok).toMatchObject({ ok: true, mode: "plain" });
  });

  it("安全模式被动回复 XML：Encrypt/MsgSignature/TimeStamp/Nonce 齐备且签名可验", () => {
    const replyXml = encryptWechatSafeReplyXml("<xml><Content><![CDATA[回复]]></Content></xml>", {
      token: "tok", encodingAesKey: AES_KEY, appId: APP_ID, nonce: "n9", timestamp: 1700000000,
    });
    const encrypt = extractEncryptNode(replyXml)!;
    expect(encrypt).toBeTruthy();
    expect(replyXml).toContain("<MsgSignature>");
    expect(replyXml).toContain("<TimeStamp>1700000000</TimeStamp>");
    expect(replyXml).toContain("<Nonce><![CDATA[n9]]></Nonce>");
    const sig = /<MsgSignature><!\[CDATA\[(.*?)\]\]><\/MsgSignature>/.exec(replyXml)![1];
    expect(verifyWechatSafeSignature("tok", "1700000000", "n9", encrypt, sig)).toBe(true);
    expect(decryptWechatSafeMessage(encrypt, AES_KEY, APP_ID)).toContain("回复");
  });
});
