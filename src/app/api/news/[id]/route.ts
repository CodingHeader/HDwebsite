import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error, notFound } from "@/lib/api-response";
import { z } from "zod";
import { authenticateRequest } from "@/lib/api-auth";

const newsSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  cover: z.string().optional(),
  status: z.enum(["draft", "published"]).optional(),
});

// GET /api/news/[id] - 获取新闻详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const news = await prisma.news.findUnique({
      where: { id: parseInt(id) },
    });

    if (!news) {
      return NextResponse.json(notFound("新闻不存在"), { status: 404 });
    }

    // 增加浏览量
    await prisma.news.update({
      where: { id: parseInt(id) },
      data: { views: { increment: 1 } },
    });

    return NextResponse.json(success(news));
  } catch (err) {
    console.error("Get news error:", err);
    return NextResponse.json(error("获取新闻详情失败"), { status: 500 });
  }
}

// PUT /api/news/[id] - 更新新闻
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    if (auth.response) {
      return auth.response;
    }

    const { id } = await params;
    const body = await request.json();
    const result = newsSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(error(result.error.issues[0].message), { status: 400 });
    }

    const news = await prisma.news.update({
      where: { id: parseInt(id) },
      data: result.data,
    });

    return NextResponse.json(success(news, "更新成功"));
  } catch (err) {
    console.error("Update news error:", err);
    return NextResponse.json(error("更新新闻失败"), { status: 500 });
  }
}

// DELETE /api/news/[id] - 删除新闻
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    if (auth.response) {
      return auth.response;
    }

    const { id } = await params;
    await prisma.news.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json(success(null, "删除成功"));
  } catch (err) {
    console.error("Delete news error:", err);
    return NextResponse.json(error("删除新闻失败"), { status: 500 });
  }
}
