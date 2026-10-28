/**
 * V1.8/C1：首页与大图区块的脏数据守卫。
 *
 * 原版 showcase.ts 有 329 行（含种子生成等 14 个导出），
 * 本模块只提取 3 个纯守卫函数，不复制种子逻辑。
 */

/** 拦截已知脏图路径（原站残留 / 竞品图） */
const BLOCKED_IMAGE_SEGMENTS = ["xgnedu", "/images/xgnedu/"];

/**
 * 拦截已知毒文本（原站公司名 / 竞品名）。
 * ⚠️ 只用于「内容字段」（title/content/caption），
 * 不得用于全站文本 —— 否则会误伤业务话术（如"加微信 xgnedu 咨询"）。
 */
const TOXIC_TEXT_KEYWORDS = ["新概念教育", "四川师范大学"];

/** 拦截编码损坏文本（GBK 乱码典型特征） */
const BROKEN_TEXT_PATTERN = /[\uFFFD]|锟斤拷|烫烫烫|屯屯屯/;

export function isBlockedShowcaseImage(image?: string | null): boolean {
  if (!image) return false;
  return BLOCKED_IMAGE_SEGMENTS.some((s) => image.includes(s));
}

export function hasToxicShowcaseText(value?: string | null): boolean {
  if (!value) return false;
  return TOXIC_TEXT_KEYWORDS.some((k) => value.includes(k));
}

export function hasBrokenShowcaseText(value?: string | null): boolean {
  if (!value) return false;
  return BROKEN_TEXT_PATTERN.test(value);
}