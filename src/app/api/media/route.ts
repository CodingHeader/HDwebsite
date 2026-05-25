import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error, unauthorized } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { getBuiltinImages, localMediaExists } from "@/lib/media-assets";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    await requireAuth(authHeader);

    const [media, builtinImages] = await Promise.all([
      prisma.media.findMany({
        orderBy: { createdAt: "desc" },
        include: { uploader: { select: { username: true, nickname: true } } },
      }),
      getBuiltinImages(),
    ]);

    const mediaWithStatus = await Promise.all(
      media.map(async (item: { url: string; [key: string]: unknown }) => ({
        ...item,
        source: "upload",
        missing: !(await localMediaExists(item.url)),
      }))
    );

    const mediaUrls = new Set(mediaWithStatus.filter((item: { missing: boolean; url: string }) => !item.missing).map((item: { url: string }) => item.url));
    const dedupedBuiltins = builtinImages
      .filter((item: { url: string }) => !mediaUrls.has(item.url))
      .map((item: { [key: string]: unknown }) => ({
        ...item,
        source: "builtin",
        missing: false,
      }));

    return NextResponse.json(success({ items: [...dedupedBuiltins, ...mediaWithStatus] }, "获取媒体成功"));
  } catch (err) {
    const message = err instanceof Error ? err.message : "获取媒体失败";
    return NextResponse.json(unauthorized(message), { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const authResult = await requireAuth(authHeader);
    const uploaderId = authResult.id;

    const body = await request.json();
    const { filename, path, url, mimeType, size, type, category } = body;

    const media = await prisma.media.create({
      data: { filename, path, url, mimeType, size, type, category, uploaderId },
    });

    return NextResponse.json(success(media, "上传媒体成功"));
  } catch (err) {
    console.error("Create media error:", err);
    return NextResponse.json(error("上传媒体失败"), { status: 500 });
  }
}
