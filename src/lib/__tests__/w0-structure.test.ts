/**
 * W0-02 结构守卫：crud-resources 按域切分后键集合"不丢、不重"；block-defs 保持纯数据（零数据库依赖）。
 * 维护线：Wave 1 起归 B 线（API 与响应平台）；只断言"不丢"，允许各线新增资源。
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { crudSpecs } from "@/lib/crud-resources";
import { systemSpecs } from "@/lib/crud-resources/system";
import { contentSpecs } from "@/lib/crud-resources/content";
import { siteSpecs } from "@/lib/crud-resources/site";
import { collectSpecs } from "@/lib/crud-resources/collect";
import { mediaSpecs } from "@/lib/crud-resources/media";
import { kbAiSpecs } from "@/lib/crud-resources/kb-ai";
import { BLOCK_REGISTRY, DEFAULT_HOME_BLOCK_ORDER } from "@/config/block-defs";

/** 切分前（W0-02 之前）crudSpecs 的键快照：31 键，此后只允许新增，不允许丢失。 */
const PRE_SPLIT_KEYS = [
  "banners",
  "campus",
  "campus-images",
  "categories",
  "chat-scenes",
  "collect-sources",
  "collect-tasks",
  "content-blocks",
  "content-items",
  "courses",
  "element-configs",
  "enrollment-offerings",
  "gallery",
  "home-cards",
  "hot-majors",
  "knowledge",
  "logs",
  "majors",
  "media",
  "navigations",
  "notify-recipients",
  "notify-records",
  "notify-templates",
  "page-templates",
  "partners",
  "publish-jobs",
  "service-guides",
  "students",
  "tags",
  "template-blocks",
  "user-actions",
];

const DOMAINS: Record<string, Record<string, unknown>> = {
  system: systemSpecs,
  content: contentSpecs,
  site: siteSpecs,
  collect: collectSpecs,
  media: mediaSpecs,
  "kb-ai": kbAiSpecs,
};

describe("W0-02 crud-resources 结构", () => {
  it("聚合键集合 ⊇ 切分前快照（只断言不丢）", () => {
    const keys = new Set(Object.keys(crudSpecs));
    const lost = PRE_SPLIT_KEYS.filter((k) => !keys.has(k));
    expect(lost, `切分后丢失的 spec 键：${lost.join(", ")}`).toEqual([]);
  });

  it("快照中的每个键都落在某个按域文件中", () => {
    const union = new Set<string>();
    for (const specs of Object.values(DOMAINS)) for (const k of Object.keys(specs)) union.add(k);
    const orphan = PRE_SPLIT_KEYS.filter((k) => !union.has(k));
    expect(orphan, `未落在任何域的键：${orphan.join(", ")}`).toEqual([]);
    for (const [dom, specs] of Object.entries(DOMAINS)) {
      expect(Object.keys(specs).length, `${dom} 域不应为空`).toBeGreaterThan(0);
    }
  });

  it("各域键集合两两不相交（防止 spread 静默覆盖）", () => {
    const seen = new Map<string, string>();
    const dup: string[] = [];
    for (const [dom, specs] of Object.entries(DOMAINS)) {
      for (const k of Object.keys(specs)) {
        if (seen.has(k)) dup.push(`${k}(${seen.get(k)} & ${dom})`);
        seen.set(k, dom);
      }
    }
    expect(dup, `重复键：${dup.join(", ")}`).toEqual([]);
    expect(seen.size).toBe(Object.keys(crudSpecs).length);
  });

  it("每个 spec 仍满足 CrudSpec 必填面", () => {
    for (const [k, spec] of Object.entries(crudSpecs)) {
      expect(typeof spec.model, `${k}.model`).toBe("string");
      expect(typeof spec.permission, `${k}.permission`).toBe("string");
      expect(typeof spec.label, `${k}.label`).toBe("string");
      expect(Array.isArray(spec.searchFields), `${k}.searchFields`).toBe(true);
    }
  });
});

describe("W0-02 block-defs 纯数据", () => {
  it("block-defs.ts 不含任何数据库客户端引用", () => {
    const file = path.resolve(process.cwd(), "src/config/block-defs.ts");
    const src = fs.readFileSync(file, "utf8");
    expect(src).not.toMatch(/prisma/i);
  });

  it("注册表 12 区块与 main 原始顺序保持不变", () => {
    expect(BLOCK_REGISTRY).toHaveLength(12);
    expect(DEFAULT_HOME_BLOCK_ORDER).toEqual([
      "home-banner",
      "home-cards",
      "home-topbar",
      "home-entrance",
      "home-stats",
      "home-partners",
      "home-courses",
      "home-intro",
      "home-news",
      "home-certificates",
      "home-campus",
      "home-cta",
    ]);
  });
});
