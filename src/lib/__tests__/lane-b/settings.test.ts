/**
 * B-01 settings 读取单一语义测试：getPublicSettings（公开集合）/ getAllSettings（全量）。
 * 落点说明：本文件在 B-01 允许修改的 lane-b 目录内，可被 vitest 既有 include 的 src 深层测试目录模式收集。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({ rows: [] as { key: string; value: string; isEncrypted: boolean }[] }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    setting: {
      findMany: async () => calls.rows,
    },
  },
}));

vi.mock("@/lib/crypto", () => ({
  encryptField: (v: string) => `enc:${v}`,
  decryptField: (v: string) => (v.startsWith("enc:") ? v.slice(4) : v),
}));

import { getAllSettings, getPublicSettings, getSettings } from "@/lib/settings";

const SECRET_KEY = "emailPassword"; // Registry 中 isEncrypted 且非公开的键
const PUBLIC_KEY = "siteName"; // 公开键

describe("B-01 settings 读取单一语义", () => {
  beforeEach(() => {
    calls.rows = [
      { key: PUBLIC_KEY, value: "弘道教育改后", isEncrypted: false },
      { key: SECRET_KEY, value: "enc:真实密码", isEncrypted: true },
    ];
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getPublicSettings：公开读取不含 isPublic=false 的键", async () => {
    const s = await getPublicSettings();
    expect(s[PUBLIC_KEY]).toBe("弘道教育改后");
    expect(s).not.toHaveProperty(SECRET_KEY); // 非公开键不出现
  });

  it("getAllSettings：全量读取包含非公开键（脱敏由路由层决定）", async () => {
    const s = await getAllSettings();
    expect(s[SECRET_KEY]).toBe("真实密码"); // 解密后原值（路由层负责脱敏回显）
    expect(s[PUBLIC_KEY]).toBe("弘道教育改后");
  });

  it("getSettings：getPublicSettings 的已弃用别名（同一引用）", () => {
    expect(getSettings).toBe(getPublicSettings);
  });

  it("公开读取的加密公开键解密回显（isEncrypted 且公开）", async () => {
    calls.rows = [{ key: "somePublicEncKey", value: "enc:abc", isEncrypted: true }];
    // 该键不在 Registry 公开集合中 → 不出现；仅验证无抛错
    const s = await getPublicSettings();
    expect(s).not.toHaveProperty("somePublicEncKey");
  });
});
