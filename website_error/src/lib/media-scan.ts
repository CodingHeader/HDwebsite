/**
 * Media Scan Service - 静态资源扫描服务
 *
 * 用途：扫描 public/images/ 和 public/uploads/ 目录下未被录入数据库的媒体文件
 * 特性：
 * 1. 支持递归扫描子目录
 * 2. 自动去重（排除已在数据库中的URL）
 * 3. 生成虚拟记录（负ID，标记为builtin）
 * 4. 兼容 dev / start / standalone 三种模式
 */

import { readdir, stat } from "node:fs/promises";
import path from "node:path";

export interface BuiltinMediaItem {
  id: number;
  filename: string;
  path: string;
  url: string;
  mimeType: string;
  size: number;
  type: string;
  category: string | null;
  createdAt: string;
  updatedAt: string;
  metadata: string | null;
  uploaderId: number;
  uploader: null;
  missing: boolean;
}

interface ScanOptions {
  excludeUrls?: Set<string>;
  search?: string;
  category?: string;
  type?: string;
}

/**
 * 为字符串生成稳定的32位哈希值
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

/**
 * 为URL生成稳定的负ID（避免与数据库正ID冲突）
 */
export function getBuiltinId(url: string): number {
  return -Math.abs(hashString(url)) - 1;
}

/**
 * 递归扫描目录，收集图片文件信息
 */
async function collectImages(
  dir: string,
  urlPrefix: string
): Promise<Omit<BuiltinMediaItem, "id" | "missing">[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });

    const items = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(dir, entry.name);
        const itemUrl = `${urlPrefix}/${entry.name}`.replace(/\\/g, "/");

        if (entry.isDirectory()) {
          return collectImages(fullPath, itemUrl);
        }

        // 只收集图片文件
      // 只收集图片文件，排除缩略图目录和缩略图文件
      if (!/\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i.test(entry.name)) {
        return [];
      }

      // 排除 thumbs 目录下的文件
      if (fullPath.includes("/thumbs/") || fullPath.includes("\\thumbs\\")) {
        return [];
      }

      // 排除常见的缩略图后缀文件
      const thumbPattern = /-(thumb|small|medium|large|mini|thumbnail)\.(png|jpe?g|gif|webp)$/i;
      if (thumbPattern.test(entry.name)) {
        return [];
      }

      const fileStat = await stat(fullPath);
        const ext = entry.name.split(".").pop()?.toLowerCase() || "png";
        const mimeMap: Record<string, string> = {
          png: "image/png",
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          gif: "image/gif",
          webp: "image/webp",
          svg: "image/svg+xml",
          bmp: "image/bmp",
          ico: "image/x-icon",
        };

        return [
          {
            filename: entry.name,
            path: itemUrl,
            url: itemUrl,
            mimeType: mimeMap[ext] || "image/*",
            size: fileStat.size,
            type: "image",
            category: "builtin",
            createdAt: fileStat.mtime.toISOString(),
            updatedAt: fileStat.mtime.toISOString(),
            metadata: null,
            uploaderId: 0,
            uploader: null,
          },
        ];
      })
    );

    return items.flat();
  } catch {
    // 目录不存在或无权限时返回空数组
    return [];
  }
}

/**
 * 扫描所有静态媒体目录，返回虚拟记录列表
 */
export async function scanBuiltinMedia(
  options: ScanOptions = {}
): Promise<BuiltinMediaItem[]> {
  const publicDir = path.join(process.cwd(), "public");
  const dirsToScan = [
    { dir: path.join(publicDir, "images"), prefix: "/images" },
    { dir: path.join(publicDir, "uploads"), prefix: "/uploads" },
  ];

  // 收集所有静态图片
  const allImages: Omit<BuiltinMediaItem, "id" | "missing">[] = [];
  for (const { dir, prefix } of dirsToScan) {
    const images = await collectImages(dir, prefix);
    allImages.push(...images);
  }

  // 过滤掉已存在于数据库中的URL
  let filtered = allImages;
  if (options.excludeUrls && options.excludeUrls.size > 0) {
    filtered = filtered.filter((item) => !options.excludeUrls!.has(item.url));
  }

  // 应用搜索条件
  if (options.search) {
    const searchLower = options.search.toLowerCase();
    filtered = filtered.filter(
      (item) =>
        item.filename.toLowerCase().includes(searchLower) ||
        item.url.toLowerCase().includes(searchLower)
    );
  }

  // 应用分类条件（builtin分类可被筛选）
  if (options.category) {
    filtered = filtered.filter((item) => item.category === options.category);
  }

  // 应用类型条件（静态资源都是image）
  if (options.type && options.type !== "image") {
    filtered = [];
  }

  // 按创建时间倒序排序
  filtered.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // 分配稳定负ID（基于URL哈希，确保跨请求一致性）
  return filtered.map((item) => ({
    ...item,
    id: getBuiltinId(item.url),
    missing: false,
  }));
}

/**
 * 检查本地媒体文件是否物理存在
 */
export async function localMediaExists(url: string): Promise<boolean> {
  if (!url.startsWith("/")) {
    return true; // 外部URL默认认为存在
  }

  const fullPath = path.join(process.cwd(), "public", url.replace(/^\//, ""));

  try {
    const fileStat = await stat(fullPath);
    return fileStat.isFile();
  } catch {
    return false;
  }
}

/**
 * 为数据库查询结果标记缺失状态
 */
export async function markMissingStatus<T extends { url: string }>(
  items: T[]
): Promise<(T & { missing: boolean })[]> {
  return Promise.all(
    items.map(async (item) => ({
      ...item,
      missing: !(await localMediaExists(item.url)),
    }))
  );
}
