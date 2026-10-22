/**
 * 上传服务（R6 安全口径）：sharp 压缩缩略图 + 类型白名单 + 尺寸上限
 * 存储：uploads/yyyy/mm/ 文件名随机化；Media 记录落库
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { created, error } from "@/lib/api-response";
import { withApi } from "@/lib/api-handler";
import { uploadsDir, UPLOAD_MIME_EXT, UPLOAD_MAX_SIZE } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TYPES = UPLOAD_MIME_EXT;
const MAX_SIZE = UPLOAD_MAX_SIZE;

type ThumbnailSet = { thumb?: string; small?: string; medium?: string };

async function makeThumbnails(absPath: string, relDir: string, base: string): Promise<ThumbnailSet> {
  const root = uploadsDir();
  const sizes: ["thumb" | "small" | "medium", number][] = [["thumb", 160], ["small", 480], ["medium", 1080]];
  const out: ThumbnailSet = {};
  for (const [name, width] of sizes) {
    const thumbRel = `${relDir}/${base}_${name}.webp`;
    await sharp(absPath).resize({ width, withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.resolve(root, thumbRel));
    out[name] = `/uploads/${thumbRel}`;
  }
  return out;
}

/** POST /api/upload：multipart 文件上传（鉴权 media:create） */
export const POST = withApi(
  async ({ request, session }) => {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return error("请求体不是合法的 multipart 表单");
  }
  const file = form.get("file");
  const category = (form.get("category") as string) || null;
  if (!(file instanceof File)) return error("缺少 file 字段");
  if (file.size > MAX_SIZE) return error("文件超过 20MB 上限", 400);
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) return error(`不支持的文件类型：${file.type || "未知"}`, 400);

  try {
    const now = new Date();
    const relDir = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`;
    const absDir = path.resolve(uploadsDir(), relDir);
    mkdirSync(absDir, { recursive: true });
    const base = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString("hex")}`;
    const filename = `${base}${ext}`;
    const relPath = `${relDir}/${filename}`;
    const absPath = path.resolve(uploadsDir(), relPath);
    const buffer = Buffer.from(await file.arrayBuffer());
    writeFileSync(absPath, buffer);

    let thumbnails: ThumbnailSet | null = null;
    if (file.type.startsWith("image/") && file.type !== "image/gif") {
      thumbnails = await makeThumbnails(absPath, relDir, base);
    }

    const media = await prisma.media.create({
      data: {
        filename,
        path: relPath,
        url: `/uploads/${relPath}`,
        mimeType: file.type,
        size: file.size,
        type: file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "document",
        category,
        uploaderId: session.id,
        metadata: thumbnails ? JSON.stringify(thumbnails) : null,
      },
    });
    return created(
      {
        id: media.id, url: media.url, filename: media.filename,
        originalName: file.name, size: media.size, mimeType: media.mimeType,
        mediaId: media.id, path: media.path, thumbnails,
      },
      "上传成功"
    );
  } catch (err) {
    // 详细原因只留在服务端日志；抛出的错误**不带原始信息**——withApi 的 emitApiError 会把它
    // 送进 system_error 通知上下文，而 upload 的异常里可能含落盘绝对路径。
    // 同时不再重复 console.error：withApi 的 emitApiError 已统一记录一次。
    throw new Error(`上传失败：${err instanceof Error ? err.name : "unknown"}`);
  }
  },
  { permission: "media:create", errorMessage: "上传失败", route: "upload/POST" }
);
