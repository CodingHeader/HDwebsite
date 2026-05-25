import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error, notFound } from "@/lib/api-response";
import { authenticateRequest } from "@/lib/api-auth";

// DELETE /api/campus/[id]/images/[imageId] - 删除单张校区图片
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    if (auth.response) {
      return auth.response;
    }

    const { id, imageId } = await params;
    const campusId = parseInt(id);
    const imgId = parseInt(imageId);

    // 确认图片属于该校区
    const image = await prisma.campusImage.findFirst({
      where: { id: imgId, campusId },
    });

    if (!image) {
      return NextResponse.json(notFound("图片不存在"), { status: 404 });
    }

    await prisma.campusImage.delete({ where: { id: imgId } });

    return NextResponse.json(success(null, "删除成功"));
  } catch (err) {
    console.error("Error deleting campus image:", err);
    return NextResponse.json(error("删除失败"), { status: 500 });
  }
}

// PUT /api/campus/[id]/images/[imageId] - 更新校区图片（排序/说明）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    if (auth.response) {
      return auth.response;
    }

    const { id, imageId } = await params;
    const campusId = parseInt(id);
    const imgId = parseInt(imageId);

    const body = await request.json();

    const image = await prisma.campusImage.findFirst({
      where: { id: imgId, campusId },
    });

    if (!image) {
      return NextResponse.json(notFound("图片不存在"), { status: 404 });
    }

    const updated = await prisma.campusImage.update({
      where: { id: imgId },
      data: {
        caption: body.caption !== undefined ? body.caption : image.caption,
        sort: body.sort !== undefined ? body.sort : image.sort,
      },
    });

    return NextResponse.json(success(updated, "更新成功"));
  } catch (err) {
    console.error("Error updating campus image:", err);
    return NextResponse.json(error("更新失败"), { status: 500 });
  }
}
