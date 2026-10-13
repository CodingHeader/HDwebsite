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
 * 按标签失效前台缓存。
 * W0 实现下不可用环境（无 Next 请求上下文）静默忽略——不得因此让写操作失败。
 */
export function invalidateWebContent(tags: readonly string[]): void {
  for (const tag of tags) {
    try {
      revalidateTag(tag, "max");
    } catch {
      // 非 Next 运行时（单测/脚本）或标签未挂载缓存：静默，写操作不受影响
    }
  }
}
