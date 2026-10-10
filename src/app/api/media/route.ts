import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error, unauthorized } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import path from "node:path";
import { readdir, stat } from "node:fs/promises";

async function collectBuiltinImages(dir: string, urlPrefix: string): Promise<Array<{
  filename: string;
  path: string;
  url: string;
  mimeType: string;
  size: number;
  type: string;
  category: string;
  createdAt: Date;
  uploader: null;
}>> {
  const entries = await readdir(dir, { withFileTypes: true });
  const items: Array<{
    filename: string;
    path: string;
    url: string;
    mimeType: string;
    size: number;
    type: string;
    category: string;
    createdAt: Date;
    uploader: null;
  }>[] = await Promise.all(
    entries.map(async (entry: { name: string; isDirectory: () => boolean; isFile: () => boolean }) => {
      const fullPath = path.join(dir, entry.name);
      const itemUrl = `${urlPrefix}/${entry.name}`.replace(/\\/g, "/");

      if (entry.isDirectory()) {
        return collectBuiltinImages(fullPath, itemUrl);
      }

      if (!/\.(png|jpe?g|gif|webp|svg)$/i.test(entry.name)) {
        return [];
      }

      const fileStat = await stat(fullPath);

      return [{
        filename: entry.name,
        path: itemUrl,
        url: itemUrl,
        mimeType: "image/*",
        size: fileStat.size,
        type: "image",
        category: "builtin",
        createdAt: fileStat.mtime,
        uploader: null,
      }];
    })
  );

  return items.flat();
}

async function localMediaExists(url: string) {
  if (!url.startsWith("/")) {
    return true;
  }

  const fullPath = path.join(process.cwd(), "public", url.replace(/^\//, ""));

  try {
    const fileStat = await stat(fullPath);
    return fileStat.isFile();
  } catch {
    return false;
  }
}

async function getBuiltinImages() {
  const imagesDir = path.join(process.cwd(), "public", "images");

  try {
    const builtins = await collectBuiltinImages(imagesDir, "/images");

    return builtins.map((item, index) => ({
      id: -(index + 1),
      ...item,
    }));
  } catch {
    return [];
  }
}

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
        missing: !(await localMediaExists(item.url)),
      }))
    );

    const mediaUrls = new Set(mediaWithStatus.filter((item: { missing: boolean; url: string }) => !item.missing).map((item: { url: string }) => item.url));
    const dedupedBuiltins = builtinImages
      .filter((item: { url: string }) => !mediaUrls.has(item.url))
      .map((item: { [key: string]: unknown }) => ({ ...item, missing: false }));

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
