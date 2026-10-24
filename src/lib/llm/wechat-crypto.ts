/**
 * 微信公众号「安全模式」消息加解密助手（V11-LLM-03 §LLM.4）
 * ==========================================================
 * 背景：`src/lib/wechat.ts`（parseIncomingXml/handleCallback）当前只支持明文模式——
 * 加密模式（安全 safe / 兼容 compatible）下，微信回调 POST 的 XML 携带 `<Encrypt>` 密文节点，
 * 原实现读不到 Content，文本消息直接落空。本模块按官方规范实现加解密原语，
 * 供回调链路接线（wechat.ts 所有权本轮在 WX lane，接线改动由其落位，见证据报备）。
 *
 * 官方规范（微信开放平台/公众号消息加解密）：
 *  - EncodingAESKey（43 字符）+ "=" 后 Base64 解码 = 32 字节 AES-256-CBC key；IV = key 前 16 字节
 *  - 密文 = Base64( AES( random(16B) + msg_len(4B 大端) + msg + receiveId( appId ) ) )
 *  - 填充：PKCS#7（块 32，微信自有口径，非标准 AES 的 16）→ 须 setAutoPadding(false) + 手工去填充
 *  - 签名：sha1( sort([token, timestamp, nonce, encrypt]).join("") )
 *
 * 纯函数、零状态、node:crypto 实现；错误一律抛 `WechatSafeModeError`（不吞错，调用方自行降级明文路径）。
 */
import crypto from "node:crypto";

/** 解析/解密/验签失败时的类型化错误（message 含归因，供日志与单测断言） */
export class WechatSafeModeError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "WechatSafeModeError";
    this.code = code;
  }
}

const RANDOM_LEN = 16;
const LEN_LEN = 4;
const BLOCK_SIZE = 32; // 微信 PKCS#7 块大小（官方 SDK 口径）

/** EncodingAESKey（43 字符）→ 32 字节 AES key；非法输入抛错（配置错误须显式暴露） */
export function resolveAesKey(encodingAesKey: string): Buffer {
  if (!/^[A-Za-z0-9]{43}$/.test(encodingAesKey)) {
    throw new WechatSafeModeError("BAD_AES_KEY", "EncodingAESKey 必须为 43 位字母数字（后台「公众号开发信息」原样复制）");
  }
  const key = Buffer.from(encodingAesKey + "=", "base64");
  if (key.length !== 32) {
    throw new WechatSafeModeError("BAD_AES_KEY", "EncodingAESKey 解码后不是 32 字节");
  }
  return key;
}

/** PKCS#7(32) 填充（加密侧） */
function pkcs7Pad(plain: Buffer): Buffer {
  const padLen = BLOCK_SIZE - (plain.length % BLOCK_SIZE);
  return Buffer.concat([plain, Buffer.alloc(padLen, padLen)]);
}

/** PKCS#7(32) 去填充（解密侧）；填充非法抛错 */
function pkcs7Unpad(plain: Buffer): Buffer {
  const padLen = plain[plain.length - 1];
  if (padLen < 1 || padLen > BLOCK_SIZE || plain.length < padLen) {
    throw new WechatSafeModeError("BAD_PADDING", "PKCS#7 填充非法（密文损坏或密钥不匹配）");
  }
  for (let i = plain.length - padLen; i < plain.length; i++) {
    if (plain[i] !== padLen) throw new WechatSafeModeError("BAD_PADDING", "PKCS#7 填充字节不一致（密文损坏或密钥不匹配）");
  }
  return plain.subarray(0, plain.length - padLen);
}

/**
 * 安全/兼容模式签名校验（POST 加密消息）：
 * sha1(sort([token, timestamp, nonce, encrypt]).join("")) === signature
 */
export function verifyWechatSafeSignature(
  token: string,
  timestamp: string,
  nonce: string,
  encrypt: string,
  signature: string
): boolean {
  if (!token || !encrypt || !signature) return false;
  const sha1 = crypto.createHash("sha1").update([token, timestamp, nonce, encrypt].sort().join("")).digest("hex");
  return sha1 === signature;
}

/** 安全/兼容模式被动回复签名（加密回复的 MsgSignature）：同上四元组口径 */
export function wechatSafeSignature(token: string, timestamp: string, nonce: string, encrypt: string): string {
  return crypto.createHash("sha1").update([token, timestamp, nonce, encrypt].sort().join("")).digest("hex");
}

/**
 * 解密 `<Encrypt>` 密文为明文消息体：
 * random(16) 截弃；msg_len(4B 大端) 定界 msg；尾部 receiveId 必须等于 appId（防跨应用重放）。
 * 返回解密出的原始 XML/JSON 文本（微信密文内为明文 XML）。
 */
export function decryptWechatSafeMessage(encrypt: string, encodingAesKey: string, appId: string): string {
  const key = resolveAesKey(encodingAesKey);
  let cipherBuf: Buffer;
  try {
    cipherBuf = Buffer.from(encrypt, "base64");
  } catch {
    throw new WechatSafeModeError("BAD_BASE64", "Encrypt 密文不是合法 Base64");
  }
  if (cipherBuf.length === 0 || cipherBuf.length % 16 !== 0) {
    throw new WechatSafeModeError("BAD_CIPHER_LENGTH", "密文长度不是 16 字节整数倍");
  }
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, key.subarray(0, 16));
  decipher.setAutoPadding(false);
  let plain: Buffer;
  try {
    plain = Buffer.concat([decipher.update(cipherBuf), decipher.final()]);
  } catch {
    throw new WechatSafeModeError("DECRYPT_FAILED", "AES 解密失败（EncodingAESKey 与该公众号不匹配）");
  }
  const unpadded = pkcs7Unpad(plain);
  if (unpadded.length < RANDOM_LEN + LEN_LEN) {
    throw new WechatSafeModeError("BAD_PLAINTEXT", "解密结果过短，缺 random/msg_len 头");
  }
  const msgLen = unpadded.readUInt32BE(RANDOM_LEN);
  if (RANDOM_LEN + LEN_LEN + msgLen > unpadded.length) {
    throw new WechatSafeModeError("BAD_MSG_LEN", "msg_len 超出解密结果边界（密钥不匹配或密文损坏）");
  }
  const msg = unpadded.subarray(RANDOM_LEN + LEN_LEN, RANDOM_LEN + LEN_LEN + msgLen).toString("utf8");
  const receiveId = unpadded.subarray(RANDOM_LEN + LEN_LEN + msgLen).toString("utf8");
  if (receiveId !== appId) {
    throw new WechatSafeModeError("RECEIVE_ID_MISMATCH", `receiveId（${receiveId}）与公众号 appId（${appId}）不一致`);
  }
  return msg;
}

/**
 * 加密安全模式被动回复（明文 → `<Encrypt>` 密文）：
 * random(16B) + msg_len(4B 大端) + msg + receiveId(appId) → PKCS#7(32) → AES-256-CBC → Base64。
 * 返回 Base64 密文（XML 包裹由 encryptWechatSafeReplyXml 完成）。
 */
export function encryptWechatSafeMessage(plaintext: string, encodingAesKey: string, appId: string): string {
  const key = resolveAesKey(encodingAesKey);
  const msgBuf = Buffer.from(plaintext, "utf8");
  const body = Buffer.concat([
    crypto.randomBytes(RANDOM_LEN),
    (() => {
      const len = Buffer.alloc(LEN_LEN);
      len.writeUInt32BE(msgBuf.length);
      return len;
    })(),
    msgBuf,
    Buffer.from(appId, "utf8"),
  ]);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, key.subarray(0, 16));
  cipher.setAutoPadding(false);
  return Buffer.concat([cipher.update(pkcs7Pad(body)), cipher.final()]).toString("base64");
}

/**
 * 安全模式被动回复完整 XML（官方格式）：
 * Encrypt + MsgSignature + TimeStamp + Nonce。
 */
export function encryptWechatSafeReplyXml(
  reply: string,
  opts: { token: string; encodingAesKey: string; appId: string; nonce: string; timestamp?: number }
): string {
  const encrypt = encryptWechatSafeMessage(reply, opts.encodingAesKey, opts.appId);
  const timestamp = opts.timestamp ?? Math.floor(Date.now() / 1000);
  const signature = wechatSafeSignature(opts.token, String(timestamp), opts.nonce, encrypt);
  return (
    `<xml>` +
    `<Encrypt><![CDATA[${encrypt}]]></Encrypt>` +
    `<MsgSignature><![CDATA[${signature}]]></MsgSignature>` +
    `<TimeStamp>${timestamp}</TimeStamp>` +
    `<Nonce><![CDATA[${opts.nonce}]]></Nonce>` +
    `</xml>`
  );
}

/** 提取加密回调 XML 中的 Encrypt 节点（安全/兼容模式回调均携带）；无则返回 null（明文模式） */
export function extractEncryptNode(xml: string): string | null {
  const m = /<Encrypt>\s*(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))\s*<\/Encrypt>/.exec(xml);
  const v = m?.[1] ?? m?.[2];
  return v && v.trim() ? v.trim() : null;
}

/**
 * 加密模式判定（配置驱动，官方三种模式）：
 * - 明文模式：encodingAESKey 未配置 → 永远明文（decryptUnavailable 不会出现）
 * - 兼容模式：密文优先；解密失败/未携带 Encrypt → 回落明文
 * - 安全模式：密文强制（解密失败直接 4xx，不回落明文）——由调用方以 `strict` 区分
 * 返回 decrypted 文本；strict=false 且解密失败时回落 fallback 回调的结果。
 */
export function decryptWechatCallbackPayload(input: {
  xml: string;
  appId: string;
  encodingAesKey: string | null | undefined;
  signature: string;
  timestamp: string;
  nonce: string;
  token: string;
  strict: boolean;
  fallback?: () => string | null;
}): { ok: true; xml: string; mode: "safe" | "compatible" | "plain" } | { ok: false; errMsg: string } {
  const encrypt = extractEncryptNode(input.xml);
  if (!encrypt) {
    // 未携带密文：明文内容直通（兼容模式允许；安全模式下微信不会发明文，若收到视为异常放行由验签兜底）
    const plain = input.fallback ? input.fallback() : input.xml;
    return plain ? { ok: true, xml: plain, mode: "plain" } : { ok: false, errMsg: "未找到 Encrypt 节点且明文为空" };
  }
  if (!input.encodingAesKey) {
    return { ok: false, errMsg: "回调为加密消息但账号未配置 EncodingAESKey" };
  }
  if (!verifyWechatSafeSignature(input.token, input.timestamp, input.nonce, encrypt, input.signature)) {
    return { ok: false, errMsg: "加密消息签名校验失败" };
  }
  try {
    const xml = decryptWechatSafeMessage(encrypt, input.encodingAesKey, input.appId);
    return { ok: true, xml, mode: input.strict ? "safe" : "compatible" };
  } catch (err) {
    if (input.strict) {
      return { ok: false, errMsg: err instanceof Error ? err.message : String(err) };
    }
    const plain = input.fallback ? input.fallback() : null;
    return plain ? { ok: true, xml: plain, mode: "compatible" } : { ok: false, errMsg: err instanceof Error ? err.message : String(err) };
  }
}
