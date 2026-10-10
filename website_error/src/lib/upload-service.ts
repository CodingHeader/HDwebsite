/**
 * Upload Service - 统一上传服务平台化
 *
 * 执行逻辑6步：
 * 1. 触发：任何上传操作（ImageUploader/媒体库/文章插图）
 * 2. 路由：通过 uploadFile() 统一入口
 * 3. 处理：类型校验→大小校验→安全校验→落盘→入Media表
 * 4. 请求：FormData file字段
 * 5. 数据库：Media表记录
 * 6. 响应：{id, url, filename, size, type, mediaId}
 *
 * 从哪里改：所有上传操作统一走此服务
 * 改哪里：src/lib/upload-service.ts（新建）
 * 怎么改：提取upload/route.ts核心逻辑为可复用函数
 */

import { writeFile } from "fs/promises";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import sharp from "sharp";
import { prisma } from "./prisma";

// ─── 上传配置 ──────────────────────────────────────────

export interface UploadConfig {
  maxFileSize: number;
  allowedTypes: string[];
  allowedExtensions: string[];
  uploadDir: string;
  dateSubDir: boolean;
}

const DEFAULT_CONFIG: UploadConfig = {
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  allowedExtensions: [".jpg", ".jpeg", ".png", ".gif", ".webp"],
  uploadDir: "uploads",
  dateSubDir: true,
};

// ─── 缩略图配置 ──────────────────────────────────────────

export interface ThumbnailConfig {
  sizes: { name: string; width: number; height?: number; quality: number }[];
}

const THUMBNAIL_CONFIG: ThumbnailConfig = {
  sizes: [
    { name: "thumb", width: 100, height: 100, quality: 80 },      // 小缩略图
    { name: "small", width: 300, height: 200, quality: 85 },     // 小尺寸
    { name: "medium", width: 800, height: 600, quality: 90 },    // 中等尺寸
  ],
};

// ─── 上传结果 ──────────────────────────────────────────

export interface ThumbnailUrls {
  thumb?: string;    // 100x100
  small?: string;    // 300x200
  medium?: string;   // 800x600
}

export interface UploadResult {
  id: number;
  url: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  mediaId: number;
  path: string;
  thumbnails?: ThumbnailUrls;
}

// ─── 校验函数 ──────────────────────────────────────────

export function validateFileType(file: File, config: UploadConfig = DEFAULT_CONFIG): { valid: boolean; error?: string } {
  if (!config.allowedTypes.includes(file.type)) {
    return { valid: false, error: `仅支持 ${config.allowedTypes.map(t => t.split("/")[1].toUpperCase()).join("、")} 格式的图片` };
  }
  return { valid: true };
}

export function validateFileSize(file: File, config: UploadConfig = DEFAULT_CONFIG): { valid: boolean; error?: string } {
  if (file.size > config.maxFileSize) {
    const maxMB = (config.maxFileSize / (1024 * 1024)).toFixed(0);
    return { valid: false, error: `文件大小不能超过 ${maxMB}MB` };
  }
  return { valid: true };
}

export function validateFileExtension(filename: string, config: UploadConfig = DEFAULT_CONFIG): { valid: boolean; error?: string } {
  const ext = "." + (filename.split(".").pop()?.toLowerCase() || "");
  if (!config.allowedExtensions.includes(ext)) {
    return { valid: false, error: `不支持的文件扩展名: ${ext}` };
  }
  return { valid: true };
}

// ─── 缩略图生成函数 ───────────────────────────────────

async function generateThumbnails(
  filepath: string,
  filename: string,
  subDir: string,
  config: ThumbnailConfig = THUMBNAIL_CONFIG
): Promise<ThumbnailUrls> {
  const thumbnails: ThumbnailUrls = {};
  const publicDir = join(process.cwd(), "public");
  
  // 创建缩略图目录
  const thumbDir = join(publicDir, subDir, "thumbs");
  if (!existsSync(thumbDir)) {
    mkdirSync(thumbDir, { recursive: true });
  }

  // 为每种尺寸生成缩略图
  for (const size of config.sizes) {
    try {
      const thumbFilename = `${filename.split('.')[0]}-${size.name}.jpg`;
      const thumbPath = join(thumbDir, thumbFilename);
      
      // 使用sharp生成缩略图
      await sharp(filepath)
        .resize(size.width, size.height, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: size.quality, progressive: true })
        .toFile(thumbPath);

      // 构建URL
      const thumbUrl = `/${subDir.replace(/\\/g, "/")}/thumbs/${thumbFilename}`;
      
      // 映射到结果对象
      if (size.name === "thumb") thumbnails.thumb = thumbUrl;
      if (size.name === "small") thumbnails.small = thumbUrl;
      if (size.name === "medium") thumbnails.medium = thumbUrl;
      
    } catch (error) {
      console.error(`生成缩略图失败 (${size.name}):`, error);
      // 继续处理其他尺寸
    }
  }

  return thumbnails;
}

// ─── 核心上传函数 ──────────────────────────────────────

export async function uploadFile(
  file: File,
  uploaderId: number,
  category: string = "upload",
  config: UploadConfig = DEFAULT_CONFIG
): Promise<UploadResult> {
  // 1. 校验
  const typeCheck = validateFileType(file, config);
  if (!typeCheck.valid) throw new Error(typeCheck.error);

  const sizeCheck = validateFileSize(file, config);
  if (!sizeCheck.valid) throw new Error(sizeCheck.error);

  const extCheck = validateFileExtension(file.name, config);
  if (!extCheck.valid) throw new Error(extCheck.error);

  // 2. 生成安全文件名
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = file.name.split(".").pop() || "jpg";
  const filename = `${timestamp}-${random}.${extension}`;

  // 3. 确保目录存在
  const publicDir = join(process.cwd(), "public");
  let subDir = config.uploadDir;

  if (config.dateSubDir) {
    const date = new Date();
    const dateDir = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;
    subDir = join(config.uploadDir, dateDir);
  }

  const fullDir = join(publicDir, subDir);
  if (!existsSync(fullDir)) {
    mkdirSync(fullDir, { recursive: true });
  }

  // 4. 保存文件
  const filepath = join(fullDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  // 5. 构建URL和路径
  const url = `/${subDir.replace(/\\/g, "/")}/${filename}`;
  const relativePath = join("public", subDir, filename);

  // 6. 生成缩略图
  let thumbnails: ThumbnailUrls = {};
  try {
    thumbnails = await generateThumbnails(filepath, filename, subDir);
  } catch (err) {
    console.error("缩略图生成失败:", err);
    // 不影响主流程，继续保存
  }

  // 7. 创建Media记录（包含缩略图元数据）
  const media = await prisma.media.create({
    data: {
      filename: file.name,
      path: relativePath,
      url,
      mimeType: file.type,
      size: file.size,
      type: "image",
      category,
      uploaderId,
      metadata: JSON.stringify(thumbnails), // 存储缩略图信息到metadata
    },
  });

  return {
    id: media.id,
    url,
    filename,
    originalName: file.name,
    size: file.size,
    mimeType: file.type,
    mediaId: media.id,
    path: relativePath,
    thumbnails,
  };
}
