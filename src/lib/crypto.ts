/**
 * AES-256-GCM 字段级加解密（SOL 基座：LLM apiKey / 微信 appSecret / SMTP password）
 * 密钥来源：ENCRYPTION_KEY 环境变量（32+ 字符）；缺省从 JWT_SECRET 派生。
 * 存储格式：v1:<iv-base64>:<tag-base64>:<cipher-base64>
 */
import crypto from "node:crypto";

const PREFIX = "v1";

function key(): Buffer {
  const raw = process.env.ENCRYPTION_KEY ?? process.env.JWT_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error("FATAL: ENCRYPTION_KEY/JWT_SECRET 缺失或长度不足，无法加密字段");
  }
  return crypto.createHash("sha256").update(raw).digest();
}

export function encryptField(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(":");
}

export function decryptField(stored: string): string | null {
  if (!stored.startsWith(`${PREFIX}:`)) return null;
  const [, ivB64, tagB64, dataB64] = stored.split(":");
  if (!ivB64 || !tagB64 || !dataB64) return null;
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
    return dec.toString("utf8");
  } catch {
    return null;
  }
}

/** 是否为已加密值（回显脱敏判断用） */
export function isEncryptedValue(value: string): boolean {
  return value.startsWith(`${PREFIX}:`);
}

/** 回显脱敏：保留首尾 4 字符 */
export function maskSecret(value: string): string {
  if (value.length <= 8) return "****";
  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}
