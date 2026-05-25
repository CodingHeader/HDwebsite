import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error, unauthorized } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import {
  deleteLocalMediaByUrl,
  extractMediaUrls,
  getBuiltinImages,
} from "@/lib/media-assets";
import { BUILTIN_MEDIA_CATEGORY } from "@/lib/media-management";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = _request.headers.get("authorization");
    await requireAuth(authHeader);

    const { id } = await params;
    const mediaId = parseInt(id, 10);

    if (isNaN(mediaId) || mediaId === 0) {
      return NextResponse.json(error("无效的媒体ID"), { status: 400 });
    }

    if (mediaId < 0) {
      const builtinImages = await getBuiltinImages();
      const builtin = builtinImages.find((item) => item.id === mediaId);

      if (!builtin) {
        return NextResponse.json(error("内置静态图不存在"), { status: 404 });
      }

      const deleted = await deleteLocalMediaByUrl(builtin.url);
      if (!deleted) {
        return NextResponse.json(error("删除内置静态图失败"), { status: 500 });
      }

      return NextResponse.json(success(null, "删除内置静态图成功"));
    }

    const existing = await prisma.media.findUnique({ where: { id: mediaId } });
    if (!existing) {
      return NextResponse.json(error("媒体不存在"), { status: 404 });
    }

    const relatedUrls = extractMediaUrls(existing.url, existing.metadata);
    await prisma.media.delete({ where: { id: mediaId } });
    await Promise.all(relatedUrls.map((url) => deleteLocalMediaByUrl(url)));

    return NextResponse.json(success(null, "删除媒体成功"));
  } catch (err) {
    const message = err instanceof Error ? err.message : "删除媒体失败";
    return NextResponse.json(unauthorized(message), { status: 401 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization");
    await requireAuth(authHeader);

    const { id } = await params;
    const mediaId = parseInt(id, 10);

    if (isNaN(mediaId) || mediaId === 0) {
      return NextResponse.json(error("无效的媒体ID"), { status: 400 });
    }

    if (mediaId < 0) {
      const body = await request.json();
      const nextCategory = typeof body.category === "string" ? body.category.trim() : "";

      if (!nextCategory || nextCategory === BUILTIN_MEDIA_CATEGORY) {
        return NextResponse.json(
          success({ id: mediaId, category: BUILTIN_MEDIA_CATEGORY }, "内置静态图分类保持不变"),
        );
      }

      return NextResponse.json(error("内置静态图仅支持固定分类"), { status: 400 });
    }

    const existing = await prisma.media.findUnique({ where: { id: mediaId } });
    if (!existing) {
      return NextResponse.json(error("媒体不存在"), { status: 404 });
    }

    const body = await request.json();
    const { filename, category, mimeType, type } = body;

    const updated = await prisma.media.update({
      where: { id: mediaId },
      data: {
        ...(filename !== undefined && { filename }),
        ...(category !== undefined && { category }),
        ...(mimeType !== undefined && { mimeType }),
        ...(type !== undefined && { type }),
      },
    });

    return NextResponse.json(success(updated, "更新媒体成功"));
  } catch (err) {
    const message = err instanceof Error ? err.message : "更新媒体失败";
    return NextResponse.json(unauthorized(message), { status: 401 });
  }
}
