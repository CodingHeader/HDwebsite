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
    for (const g of ["site", "contact", "seo", "email", "collect", "llm", "notify", "publish"]) {
      expect(groups).toContain(g);
    }
  });

  it("凭证类字段必须 isEncrypted + 非公开", () => {
    for (const key of ["emailPassword"]) {
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
});
