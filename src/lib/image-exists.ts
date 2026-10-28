import path from "node:path";
import { stat } from "node:fs/promises";

/**
 * V1.8-REFACTOR：判断站内图片是否存在。
 *
 * 原为 gallery/page.tsx 与 data/home.ts 各自实现一份（重复），
 * 提取至此避免「改一处漏一处」。
 *
 * 行为约定：非站内路径（不以 / 开头，如外链 https://）一律视为存在，
 * 交由浏览器处理 —— 否则外链图会被误判为 missing。
 */
export async function localImageExists(url: string): Promise<boolean> {
  if (!url.startsWith("/")) return true;
  const fullPath = path.join(process.cwd(), "public", url.replace(/^\//, ""));
  try {
    const s = await stat(fullPath);
    return s.isFile();
  } catch {
    return false;
  }
}