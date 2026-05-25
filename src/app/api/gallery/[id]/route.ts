import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api-response";
import { z } from "zod";
import { authenticateRequest } from "@/lib/api-auth";

const gallerySchema = z.object({
  title: z.string().min(1, "标题不能为空").optional(),
  image: z.string().min(1, "图片不能为空").optional(),
  category: z.enum(["certificate", "exam", "campus"]).optional(),
  sort: z.number().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

// GET /api/gallery/[id] - 获取单个图库项
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await prisma.gallery.findUnique({
      where: { id: parseInt(id) },
    });

    if (!item) {
      return NextResponse.json(error("图库项不存在"), { status: 404 });
    }

    return NextResponse.json(success(item));
  } catch (err) {
    console.error("Error fetching gallery item:", err);
    return NextResponse.json(error("获取失败"), { status: 500 });
  }
}

// PUT /api/gallery/[id] - 更新图库项
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = gallerySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(error(result.error.issues[0].message), { status: 400 });
    }

    const item = await prisma.gallery.update({
      where: { id: parseInt(id) },
      data: result.data,
    });

    return NextResponse.json(success(item, "更新成功"));
  } catch (err) {
    console.error("Error updating gallery item:", err);
    return NextResponse.json(error("更新失败"), { status: 500 });
  }
}

// DELETE /api/gallery/[id] - 删除图库项
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
    await prisma.gallery.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json(success(null, "删除成功"));
  } catch (err) {
    console.error("Error deleting gallery item:", err);
    return NextResponse.json(error("删除失败"), { status: 500 });
  }
}
