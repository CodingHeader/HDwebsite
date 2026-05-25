import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error, notFound } from "@/lib/api-response";
import { z } from "zod";
import { authenticateRequest } from "@/lib/api-auth";

const categorySchema = z.object({
  name: z.string().min(1).optional(),
  sort: z.number().optional(),
});

// GET /api/categories/[id] - 获取分类详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const category = await prisma.category.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: { courses: true },
        },
      },
    });

    if (!category) {
      return NextResponse.json(notFound("分类不存在"), { status: 404 });
    }

    return NextResponse.json(success(category));
  } catch (err) {
    console.error("Get category error:", err);
    return NextResponse.json(error("获取分类详情失败"), { status: 500 });
  }
}

// PUT /api/categories/[id] - 更新分类
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
    const result = categorySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(error(result.error.issues[0].message), { status: 400 });
    }

    const category = await prisma.category.update({
      where: { id: parseInt(id) },
      data: result.data,
    });

    return NextResponse.json(success(category, "更新成功"));
  } catch (err) {
    console.error("Update category error:", err);
    return NextResponse.json(error("更新分类失败"), { status: 500 });
  }
}

// DELETE /api/categories/[id] - 删除分类
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
    
    // 检查是否有课程使用此分类
    const courseCount = await prisma.course.count({
      where: { categoryId: parseInt(id) },
    });

    if (courseCount > 0) {
      return NextResponse.json(error("该分类下有课程，无法删除"), { status: 400 });
    }

    await prisma.category.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json(success(null, "删除成功"));
  } catch (err) {
    console.error("Delete category error:", err);
    return NextResponse.json(error("删除分类失败"), { status: 500 });
  }
}
