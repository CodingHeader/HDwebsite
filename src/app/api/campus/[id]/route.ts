import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api-response";
import { z } from "zod";
import { authenticateRequest } from "@/lib/api-auth";

const campusSchema = z.object({
  name: z.string().min(1, "校区名称不能为空").optional(),
  address: z.string().optional(),
  sort: z.number().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

// GET /api/campus/[id] - 获取单个校区
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const campus = await prisma.campus.findUnique({
      where: { id: parseInt(id) },
      include: {
        images: {
          orderBy: { sort: "asc" },
        },
      },
    });

    if (!campus) {
      return NextResponse.json(error("校区不存在"), { status: 404 });
    }

    return NextResponse.json(success(campus));
  } catch (err) {
    console.error("Error fetching campus:", err);
    return NextResponse.json(error("获取校区失败"), { status: 500 });
  }
}

// PUT /api/campus/[id] - 更新校区
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
    const result = campusSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(error(result.error.issues[0].message), { status: 400 });
    }

    const campus = await prisma.campus.update({
      where: { id: parseInt(id) },
      data: result.data,
    });

    return NextResponse.json(success(campus, "更新成功"));
  } catch (err) {
    console.error("Error updating campus:", err);
    return NextResponse.json(error("更新失败"), { status: 500 });
  }
}

// DELETE /api/campus/[id] - 删除校区
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
    await prisma.campus.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json(success(null, "删除成功"));
  } catch (err) {
    console.error("Error deleting campus:", err);
    return NextResponse.json(error("删除失败"), { status: 500 });
  }
}
