/**
 * D-04：设置键对等（main@94dbbbb Registry → upgrade Registry）+ 默认资源路径存在性。
 *
 * 证据源：
 * - main 键清单冻结于 main-registry.keys.json（从 origin/main:src/lib/settings-registry.ts 提取的 56 个扁平键）
 * - WEB_SETTING_DEFAULTS（src/components/web/data/setting-defaults.ts，前台视觉冻结基准）
 *
 * 设计原则：main 键必须全部出现在 upgrade Registry（REQ-F-013 parity A22）；
 * 但 main 已废弃的 homeCards（首页服务卡片已迁移至 HomeCard 数据表）不在清单中。
 * Registry 默认值中的静态资源路径（/images/*、/favicon*）必须真实存在（W2-09 check-assets 前置）。
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SETTINGS_REGISTRY, getSettingDefinition } from "@/lib/settings-registry";
import { WEB_SETTING_DEFAULTS } from "@/components/web/data/setting-defaults";

const mainKeys: string[] = JSON.parse(
  readFileSync(join(__dirname, "main-registry.keys.json"), "utf8")
);

describe("D-04 设置键对等（main parity）", () => {
  it("main 全部 57 个扁平键在 upgrade Registry 中存在", () => {
    const registryKeys = new Set(SETTINGS_REGISTRY.map((d) => d.key));
    const missing = mainKeys.filter((k) => !registryKeys.has(k));
    expect(missing, `upgrade Registry 缺失 main 键：${missing.join(", ")}`).toHaveLength(0);
  });

  it("前台分组默认值与 WEB_SETTING_DEFAULTS 完全一致（单一来源）", () => {
    const webGroups = new Set([
      "site", "topbar", "banner", "stats", "cards", "footer", "company", "contact", "seo", "other",
    ]);
    // 保留 BRAND_DEFAULTS 语义的键（ADR-010）与 upgrade 独有键（statsText/siteUrl）不参与对齐
    const skip = new Set(["contactPhone", "siteUrl", "statsText"]);
    const mismatches: string[] = [];
    for (const d of SETTINGS_REGISTRY) {
      if (!webGroups.has(d.group) || skip.has(d.key)) continue;
      const webDef = WEB_SETTING_DEFAULTS[d.key];
      if (webDef === undefined) continue; // WEB_SETTING_DEFAULTS 未收录的键（如 siteUrl）跳过
      if (d.defaultValue !== webDef) mismatches.push(`${d.key}: registry="${d.defaultValue}" web="${webDef}"`);
    }
    expect(mismatches, `Registry 默认值与 WEB_SETTING_DEFAULTS 漂移：\n${mismatches.join("\n")}`).toHaveLength(0);
  });

  it("所有 /images/* 与 /favicon* 默认值文件在 public/ 下真实存在", () => {
    const missing: string[] = [];
    for (const d of SETTINGS_REGISTRY) {
      const v = d.defaultValue;
      if (!v.startsWith("/images/") && !v.startsWith("/favicon")) continue;
      if (v.includes("${") || v.includes("*")) continue;
      const rel = v.slice(1);
      if (!existsSync(join(process.cwd(), "public", rel))) missing.push(`${d.key}=${v}`);
    }
    expect(missing, `默认值指向不存在的文件：\n${missing.join("\n")}`).toHaveLength(0);
  });

  it("main 的 3 个非资源默认值被修正（placeholder/bannerBg/siteFavicon 不再指向不存在的路径）", () => {
    expect(getSettingDefinition("defaultPlaceholderImage")?.defaultValue).toBe("/images/logo_card.png");
    expect(getSettingDefinition("bannerBgImage")?.defaultValue).toBe("");
    expect(getSettingDefinition("siteFavicon")?.defaultValue).toBe("");
  });

  it("main 已废弃的 homeCards 键不进入 Registry（HomeCard 数据表替代）", () => {
    expect(getSettingDefinition("homeCards")).toBeUndefined();
  });
});
