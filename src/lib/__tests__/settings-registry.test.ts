import { describe, expect, it } from "vitest";
import { SETTINGS_REGISTRY, getGroups, getDefaultValues, getSettingDefinition } from "@/lib/settings-registry";
import { seedSettingKeys } from "./seed-keys";

describe("设置注册表（ADR-009）", () => {
  it("key 全局唯一", () => {
    const keys = SETTINGS_REGISTRY.map((d) => d.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("不允许旧式点分 key（废弃体系回归防护）", () => {
    // email.host 这类旧体系命名已改为扁平 camelCase（emailHost）
    const dotKeys = SETTINGS_REGISTRY.filter((d) => d.key.includes("."));
    expect(dotKeys).toHaveLength(0);
  });

  it("分组包含新增配置组", () => {
    const groups = getGroups();
    for (const g of ["site", "contact", "seo", "email", "collect", "kb", "llm", "notify", "publish"]) {
      expect(groups).toContain(g);
    }
  });

  it("凭证类字段必须 isEncrypted + 非公开", () => {
    for (const key of ["emailPassword", "kbCozeSpaceId"]) {
      const def = getSettingDefinition(key);
      expect(def?.isEncrypted).toBe(true);
      expect(def?.isPublic).toBe(false);
    }
  });

  it("seed 内联键 ⊆ Registry（防双体系漂移）", () => {
    const registryKeys = new Set(SETTINGS_REGISTRY.map((d) => d.key));
    for (const k of seedSettingKeys) {
      expect(registryKeys.has(k), `seed 键 ${k} 不在 Registry 中`).toBe(true);
    }
  });

  it("默认值含品牌基准（ADR-010：弘道教育）", () => {
    expect(getDefaultValues().siteName).toBe("弘道教育");
  });

  // ── CCR-1（W0-10）：chatGuard 三键（REQ-F-009；扁平 key，JSON 数组串存储）──
  it("CCR-1 chatGuard 三键存在且默认值固定", () => {
    const rateLimit = getSettingDefinition("chatGuardRateLimitPerMin");
    expect(rateLimit).toBeDefined();
    expect(rateLimit?.group).toBe("llm");
    expect(rateLimit?.type).toBe("number");
    expect(rateLimit?.defaultValue).toBe("10"); // V13-Q2-01：用户裁决 10 次/分钟（原 20）
    expect(rateLimit?.isPublic).toBe(false);

    for (const key of ["chatGuardSensitiveWords", "chatGuardBlacklist"]) {
      const d = getSettingDefinition(key);
      expect(d, `键 ${key} 应存在`).toBeDefined();
      expect(d?.group).toBe("llm");
      expect(d?.defaultValue).toBe("[]"); // JSON 数组串（jsonifyFields 接线，C-07 同款）
      expect(d?.isPublic).toBe(false);
    }
  });

  it("CCR-1 无点分键（chatGuard 系列禁止点分形式，ADR-009）", () => {
    const bad = SETTINGS_REGISTRY.filter((d) => /^chatGuard\./.test(d.key));
    expect(bad).toHaveLength(0);
  });

  it("CCR-1 GROUP_LABELS 含 kb 分组（definitions route 驱动设置页）", () => {
    const groups = getGroups();
    expect(groups).toContain("kb");
    expect(groups).toContain("llm");
  });
});
