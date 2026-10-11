import { describe, expect, it } from "vitest";
import { encryptField, decryptField, isEncryptedValue, maskSecret } from "@/lib/crypto";

describe("字段加密（AES-256-GCM）", () => {
  it("加解密往返", () => {
    const plain = "sk-test-1234567890abcdef";
    const enc = encryptField(plain);
    expect(enc.startsWith("v1:")).toBe(true);
    expect(isEncryptedValue(enc)).toBe(true);
    expect(decryptField(enc)).toBe(plain);
  });

  it("非加密值解密返回 null", () => {
    expect(decryptField("plain-text")).toBeNull();
  });

  it("篡改密文解密失败返回 null", () => {
    const enc = encryptField("secret");
    const tampered = enc.slice(0, -4) + "AAAA";
    expect(decryptField(tampered)).toBeNull();
  });

  it("脱敏保留首尾", () => {
    expect(maskSecret("sk-1234567890")).toBe("sk-1****7890");
    expect(maskSecret("short")).toBe("****");
  });
});
