/**
 * D-06 · cache-tags 失效机制单元测试。
 * 补 d-cache.spec.ts 的「弱证明」盲区：d-cache 只证明业务可见性（5s 内新值），
 * 无法区分「revalidateTag 生效」与「fallback 直读」两条路径。本文件直接 mock `next/cache` 的
 * revalidateTag，断言：
 *   1) invalidateWebContent 对每个标签恰好调用一次 revalidateTag；
 *   2) 第二参数固定为 { expire: 0 }（立即过期，非 SWR）；
 *   3) webTagsForModel 映射与冻结 WEB_TAGS 一致；
 *   4) 非 Invariant 错误在 warn 后仍不抛（写操作不因失效失败）。
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

const revalidateTagMock = vi.fn();

vi.mock("next/cache", () => ({
  revalidateTag: (...args: unknown[]) => revalidateTagMock(...args),
}));

import { WEB_TAGS, webTagsForModel, invalidateWebContent } from "@/lib/cache-tags";

beforeEach(() => {
  revalidateTagMock.mockReset();
});

describe("cache-tags · D-06 失效机制", () => {
  it("invalidateWebContent 对每个标签恰好调用一次 revalidateTag，profile 为 { expire: 0 }", () => {
    invalidateWebContent([WEB_TAGS.home, WEB_TAGS.settings]);
    expect(revalidateTagMock).toHaveBeenCalledTimes(2);
    expect(revalidateTagMock).toHaveBeenNthCalledWith(1, "web:home", { expire: 0 });
    expect(revalidateTagMock).toHaveBeenNthCalledWith(2, "web:settings", { expire: 0 });
  });

  it("空数组不调用 revalidateTag（不空转）", () => {
    invalidateWebContent([]);
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it("revalidateTag 抛非 Invariant 错误时写操作不失败（仅 warn）", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    revalidateTagMock.mockImplementation(() => {
      throw new Error("other failure");
    });
    expect(() => invalidateWebContent([WEB_TAGS.home])).not.toThrow();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("webTagsForModel 覆盖首页 12 数据源 + setting/navigation + article/category", () => {
    // 首页数据源
    for (const m of ["banner", "hotMajor", "partner", "campus", "gallery", "serviceGuide", "homeCard",
      "pageTemplate", "templateBlock", "contentBlock", "elementConfig"]) {
      expect(webTagsForModel(m), `${m} 应映射到 home`).toEqual([WEB_TAGS.home]);
    }
    // 设置 + 主导航
    expect(webTagsForModel("setting")).toEqual([WEB_TAGS.settings, WEB_TAGS.home]);
    expect(webTagsForModel("navigation")).toEqual([WEB_TAGS.settings]);
    // 资讯
    expect(webTagsForModel("article")).toEqual([WEB_TAGS.articles, WEB_TAGS.home]);
    expect(webTagsForModel("category")).toEqual([WEB_TAGS.articles, WEB_TAGS.home]);
    // 未列模型不失效
    expect(webTagsForModel("user")).toEqual([]);
    expect(webTagsForModel("role")).toEqual([]);
  });
});