import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error, unauthorized } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";

// GET /api/tags - 获取标签列表
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    await requireAuth(authHeader);

    const tags = await prisma.tag.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { articles: true } },
      },
    });

    const formattedTags = tags.map((tag: { id: number; name: string; slug: string; createdAt: Date; _count: { articles: number } }) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      articleCount: tag._count.articles,
      createdAt: tag.createdAt.toISOString(),
    }));

    return NextResponse.json(success({ items: formattedTags }, "获取标签成功"));
  } catch (err) {
    const message = err instanceof Error ? err.message : "获取标签失败";
    return NextResponse.json(unauthorized(message), { status: 401 });
  }
}

// POST /api/tags - 创建标签
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    await requireAuth(authHeader);

    const body = await request.json();
    const { name, slug } = body;

    const tag = await prisma.tag.create({
      data: { name, slug },
    });

    return NextResponse.json(success(tag, "创建标签成功"));
  } catch (err) {
    console.error("Create tag error:", err);
    return NextResponse.json(error("创建标签失败"), { status: 500 });
  }
}
