import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error, notFound } from "@/lib/api-response";
import { z } from "zod";
import { authenticateRequest } from "@/lib/api-auth";

const studentSchema = z.object({
  status: z.enum(["pending", "contacted", "enrolled", "cancelled"]).optional(),
});

// GET /api/students/[id] - 获取学员详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    if (auth.response) {
      return auth.response;
    }

    const { id } = await params;
    const student = await prisma.student.findUnique({
      where: { id: parseInt(id) },
      include: { course: true },
    });

    if (!student) {
      return NextResponse.json(notFound("学员不存在"), { status: 404 });
    }

    return NextResponse.json(success(student));
  } catch (err) {
    console.error("Get student error:", err);
    return NextResponse.json(error("获取学员详情失败"), { status: 500 });
  }
}

// PUT /api/students/[id] - 更新学员状态
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
    const result = studentSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(error(result.error.issues[0].message), { status: 400 });
    }

    const student = await prisma.student.update({
      where: { id: parseInt(id) },
      data: result.data,
      include: { course: true },
    });

    return NextResponse.json(success(student, "更新成功"));
  } catch (err) {
    console.error("Update student error:", err);
    return NextResponse.json(error("更新学员失败"), { status: 500 });
  }
}

// DELETE /api/students/[id] - 删除学员
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
    await prisma.student.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json(success(null, "删除成功"));
  } catch (err) {
    console.error("Delete student error:", err);
    return NextResponse.json(error("删除学员失败"), { status: 500 });
  }
}
