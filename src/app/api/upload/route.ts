/**
 * Upload API - 使用统一上传服务
 *
 * 触发：ImageUploader/媒体库上传
 * 路由：POST /api/upload
 * 处理：鉴权→权限→uploadFile()
 * 数据库：Media表
 * 响应：{id, url, filename, size, type, mediaId}
 */

import { NextRequest, NextResponse } from "next/server";
import { success, error, unauthorized, forbidden } from "@/lib/api-response";
import { requireAuth, requirePermission, getCurrentUser } from "@/lib/auth";
import { uploadFile } from "@/lib/upload-service";

export async function POST(request: NextRequest) {
  try {
    // 鉴权检查
    const authHeader = request.headers.get("authorization");
    try {
      await requireAuth(authHeader);
    } catch {
      return NextResponse.json(unauthorized("未登录或登录已过期"), { status: 401 });
    }

    // 权限检查
    try {
      await requirePermission(authHeader, "media:upload");
    } catch {
      return NextResponse.json(forbidden("权限不足：需要 media:upload 权限"), { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const category = formData.get("category") as string || "upload";

    if (!file) {
      return NextResponse.json(error("请选择文件"), { status: 400 });
    }

    // 获取上传者ID
    const user = authHeader ? await getCurrentUser(authHeader) : null;
    const uploaderId = user?.id || 1;

    // 使用统一上传服务，传入分类
    const result = await uploadFile(file, uploaderId, category);

    return NextResponse.json(
      success({
        id: result.id,
        url: result.url,
        filename: result.originalName,
        size: result.size,
        type: result.mimeType,
        mediaId: result.mediaId,
      }, "上传成功并已添加到媒体库")
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "文件上传失败";
    console.error("Upload error:", err);
    return NextResponse.json(error(message), { status: 500 });
  }
}
