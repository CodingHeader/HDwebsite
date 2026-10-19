/**
 * 前台缓存标签与失效（`src/lib/cache-tags.ts`，W0-03 冻结签名）—— 后台写操作后按标签失效前台缓存。
 *
 * W0 默认实现 = 调 `next/cache` 的 `revalidateTag(tag, "max")`（Next 16 起第二参数为必填的 cache profile，
 * 官方迁移指引即补 `"max"`），`try/catch` 静默（非 Next 请求上下文、脚本、单测环境下调用不抛错）。
 * 正式实现（资源→标签映射、真实缓存读写）由 D 线 D-06 承接。
 */
import { revalidateTag } from "next/cache";

/** 前台缓存标签（冻结面：新增标签需走《契约变更请求》） */
export const WEB_TAGS = {
  /** 首页数据与区块配置 */
  home: "web:home",
  /** 资讯/文章列表与详情 */
  articles: "web:articles",
  /** 全站设置（SiteSetting / 品牌兜底） */
  settings: "web:settings",
} as const;

export type WebTag = (typeof WEB_TAGS)[keyof typeof WEB_TAGS];

/**
 * 资源→前台缓存标签映射表（D-06 正式实现）。
 * CrudSpec.model / 直接 prisma 写操作按此表映射失效标签；未列出的模型不失效（避免过度失效）。
 * 新增映射须走《契约变更请求》（标签冻结面）。
 */
const RESOURCE_TO_TAGS: Record<string, readonly WebTag[]> = {
  // 首页数据源（Prisma delegate 名，与 CrudSpec.model 一致）
  banner: [WEB_TAGS.home],
  hotMajor: [WEB_TAGS.home],
  partner: [WEB_TAGS.home],
  campus: [WEB_TAGS.home],
  gallery: [WEB_TAGS.home],
  serviceGuide: [WEB_TAGS.home],
  homeCard: [WEB_TAGS.home],
  pageTemplate: [WEB_TAGS.home],
  templateBlock: [WEB_TAGS.home],
  contentBlock: [WEB_TAGS.home],
  elementConfig: [WEB_TAGS.home],
  // 设置
  setting: [WEB_TAGS.settings, WEB_TAGS.home],
  // 主导航（与设置同属站点框架；D-06 随设置标签一并失效）
  navigation: [WEB_TAGS.settings],
  // 资讯
  article: [WEB_TAGS.articles, WEB_TAGS.home],
  category: [WEB_TAGS.articles, WEB_TAGS.home],
};

/** 按 Prisma 模型名取前台失效标签；未知模型返回空数组（不失效） */
export function webTagsForModel(model: string): readonly WebTag[] {
  return RESOURCE_TO_TAGS[model] ?? [];
}

/**
 * 按标签失效前台缓存。
 * D-06：使用 `revalidateTag(tag, { expire: 0 })`——立即过期（非 stale-while-revalidate），
 * 下一次访问该标签的页面即 blocking cache miss，直接返回新数据。
 * 这样「后台改 → 前台单次访问即新值」，满足验收 5.9.5.2（≤5s 可见）与 P05 e-home-blocks 单次 goto 断言。
 * 不可用环境（无 Next 请求上下文）静默忽略——不得因此让写操作失败。
 */
export function invalidateWebContent(tags: readonly string[]): void {
  for (const tag of tags) {
    try {
      revalidateTag(tag, { expire: 0 });
    } catch (err) {
      // 非 Next 运行时（单测/脚本）：预期可忽略；生产环境标签未挂载缓存则 warn，便于排查「改了不生效」
      if (!isCacheContextMissing(err)) {
        console.warn(`[cache-tags] revalidateTag("${tag}") 失败：`, err);
      }
    }
  }
}

/**
 * 识别 `unstable_cache` 在非 Next 请求上下文下抛出的 Invariant（incrementalCache 缺失）。
 * 用于把缓存函数包一层：单测/脚本环境自动回退直读，生产/请求上下文保持缓存行为。
 */
export function isCacheContextMissing(err: unknown): boolean {
  return err instanceof Error && err.message.includes("incrementalCache missing");
}

/**
 * 让「已包装为 unstable_cache 的函数」在非 Next 请求上下文（单测/脚本）下回退到未缓存实现。
 * - 生产/App Router 请求上下文：命中/生成缓存，出错原样抛出（不掩盖真实错误）。
 * - 非 Next 上下文（vitest node env、CLI 脚本）：unstable_cache 抛 Invariant，此处识别后走 fallback。
 */
export async function withWebCacheFallback<T>(cached: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
  try {
    return await cached();
  } catch (err) {
    if (isCacheContextMissing(err)) return fallback();
    throw err;
  }
}
