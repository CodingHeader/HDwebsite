import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error, serverError, unauthorized } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import {
  deleteLocalMediaByUrl,
  extractMediaUrls,
  getBuiltinImages,
} from "@/lib/media-assets";
import { BUILTIN_MEDIA_CATEGORY } from "@/lib/media-management";

/**
 * 批量媒体操作 API
 * DELETE /api/media/batch - 批量删除媒体文件
 * PATCH /api/media/batch - 批量修改分类
 *
 * 请求体: { ids: number[], category?: string }
 */

// DELETE - 批量删除
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    await requireAuth(authHeader);

    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(error("请提供要删除的媒体ID列表"), { status: 400 });
    }

    const uploadIds = ids.filter((id) => typeof id === "number" && id > 0);
    const builtinIds = ids.filter((id) => typeof id === "number" && id < 0);

    if (uploadIds.length === 0 && builtinIds.length === 0) {
      return NextResponse.json(error("没有可删除的有效媒体文件"), { status: 400 });
    }

    const mediaToDelete = uploadIds.length > 0
      ? await prisma.media.findMany({
          where: { id: { in: uploadIds } },
          select: { id: true, url: true, metadata: true },
        })
      : [];

    const builtinImages = builtinIds.length > 0 ? await getBuiltinImages() : [];
    const builtinToDelete = builtinImages.filter((item) => builtinIds.includes(item.id));

    if (mediaToDelete.length === 0 && builtinToDelete.length === 0) {
      return NextResponse.json(error("未找到指定的媒体文件"), { status: 404 });
    }

    const result = mediaToDelete.length > 0
      ? await prisma.media.deleteMany({
          where: { id: { in: mediaToDelete.map((m: { id: number }) => m.id) } },
        })
      : { count: 0 };

    const uploadUrls = mediaToDelete.flatMap(
      (item: { url: string; metadata: string | null }) => extractMediaUrls(item.url, item.metadata),
    );
    const builtinUrls = builtinToDelete.map((item: { url: string }) => item.url);

    await Promise.all(
      [...uploadUrls, ...builtinUrls].map((url) => deleteLocalMediaByUrl(url)),
    );

    const deletedCount = result.count + builtinToDelete.length;

    return NextResponse.json(
      success({ deleted: deletedCount }, `成功删除 ${deletedCount} 个媒体文件`)
    );
  } catch (err) {
    if (err instanceof Error && err.message.includes("认证")) {
      return NextResponse.json(unauthorized("请先登录"), { status: 401 });
    }
    console.error("Batch delete error:", err);
    return NextResponse.json(serverError("批量删除失败"), { status: 500 });
  }
}

// PATCH - 批量修改分类
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    await requireAuth(authHeader);

    const body = await request.json();
    const { ids, category } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(error("请提供要修改的媒体ID列表"), { status: 400 });
    }

    if (typeof category !== "string") {
      return NextResponse.json(error("请提供分类名称"), { status: 400 });
    }

    const validIds = ids.filter((id) => typeof id === "number" && id > 0);
    const builtinIds = ids.filter((id) => typeof id === "number" && id < 0);

    if (validIds.length === 0) {
      if (builtinIds.length > 0 && category.trim() === BUILTIN_MEDIA_CATEGORY) {
        return NextResponse.json(
          success({ updated: 0 }, "内置静态图保持独立分类"),
        );
      }
      return NextResponse.json(error("没有可修改的有效媒体文件"), { status: 400 });
    }

    // 批量更新分类
    const result = await prisma.media.updateMany({
      where: { id: { in: validIds } },
      data: { category: category.trim() || null },
    });

    return NextResponse.json(
      success({ updated: result.count }, `成功更新 ${result.count} 个媒体文件的分类`)
    );
  } catch (err) {
    if (err instanceof Error && err.message.includes("认证")) {
      return NextResponse.json(unauthorized("请先登录"), { status: 401 });
    }
    console.error("Batch update error:", err);
    return NextResponse.json(serverError("批量更新失败"), { status: 500 });
  }
}
