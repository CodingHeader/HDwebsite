import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error, notFound } from "@/lib/api-response";
import { z } from "zod";
import { authenticateRequest } from "@/lib/api-auth";

const courseSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().min(0).optional(),
  duration: z.string().optional(),
  outline: z.string().optional(),
  cover: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  categoryId: z.number().min(1).optional(),
});

// GET /api/courses/[id] - 获取课程详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const course = await prisma.course.findUnique({
      where: { id: parseInt(id) },
      include: { category: true },
    });

    if (!course) {
      return NextResponse.json(notFound("课程不存在"), { status: 404 });
    }

    return NextResponse.json(success(course));
  } catch (err) {
    console.error("Get course error:", err);
    return NextResponse.json(error("获取课程详情失败"), { status: 500 });
  }
}

// PUT /api/courses/[id] - 更新课程
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
    const result = courseSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(error(result.error.issues[0].message), { status: 400 });
    }

    const course = await prisma.course.update({
      where: { id: parseInt(id) },
      data: result.data,
      include: { category: true },
    });

    return NextResponse.json(success(course, "更新成功"));
  } catch (err) {
    console.error("Update course error:", err);
    return NextResponse.json(error("更新课程失败"), { status: 500 });
  }
}

// DELETE /api/courses/[id] - 删除课程
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
    await prisma.course.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json(success(null, "删除成功"));
  } catch (err) {
    console.error("Delete course error:", err);
    return NextResponse.json(error("删除课程失败"), { status: 500 });
  }
}
