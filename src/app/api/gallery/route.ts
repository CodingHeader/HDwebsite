import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api-response";
import { z } from "zod";
import { authenticateRequest } from "@/lib/api-auth";
import path from "node:path";
import { stat } from "node:fs/promises";

const gallerySchema = z.object({
  title: z.string().min(1, "标题不能为空"),
  image: z.string().min(1, "图片不能为空"),
  category: z.enum(["certificate", "exam", "campus"]).default("certificate"),
  sort: z.number().default(0),
  status: z.enum(["active", "inactive"]).default("active"),
});

async function localImageExists(url: string) {
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

// GET /api/gallery - 获取图库列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");

    const authHeader = request.headers.get("authorization");
    const auth = authHeader ? await authenticateRequest(request) : null;

    if (auth?.response) {
      return auth.response;
    }

    const where: { category?: string; status?: string } = {};
    if (category) where.category = category;
    if (authHeader) {
      if (status) where.status = status;
    } else {
      where.status = "active";
    }

    const items = await prisma.gallery.findMany({
      where,
      orderBy: [{ sort: "asc" }, { id: "desc" }],
    });

    const itemsWithStatus = await Promise.all(
      items.map(async (item: { id: number; title: string; image: string; category: string; sort: number; status: string; createdAt: Date }) => ({
        ...item,
        imageMissing: !(await localImageExists(item.image)),
      }))
    );

    return NextResponse.json(success(itemsWithStatus));
  } catch (err) {
    console.error("Error fetching gallery:", err);
    return NextResponse.json(error("获取图库列表失败"), { status: 500 });
  }
}

// POST /api/gallery - 创建图库项
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (auth.response) {
      return auth.response;
    }

    const body = await request.json();
    const result = gallerySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(error(result.error.issues[0].message), { status: 400 });
    }

    const item = await prisma.gallery.create({
      data: result.data,
    });

    return NextResponse.json(success(item, "创建成功"));
  } catch (err) {
    console.error("Error creating gallery item:", err);
    return NextResponse.json(error("创建失败"), { status: 500 });
  }
}
