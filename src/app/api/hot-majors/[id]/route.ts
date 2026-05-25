import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error, forbidden, serverError } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth";

// PUT /api/hot-majors/[id] - 更新热门专业
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization");
    try {
      await requirePermission(authHeader, "content:edit");
    } catch {
      return NextResponse.json(forbidden("权限不足"), { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const hotMajor = await prisma.hotMajor.update({
      where: { id: parseInt(id) },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.subtitle !== undefined && { subtitle: body.subtitle }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.duration !== undefined && { duration: body.duration }),
        ...(body.iconType !== undefined && { iconType: body.iconType }),
        ...(body.iconImage !== undefined && { iconImage: body.iconImage }),
        ...(body.iconColor !== undefined && { iconColor: body.iconColor }),
        ...(body.link !== undefined && { link: body.link }),
        ...(body.sort !== undefined && { sort: body.sort }),
        ...(body.status !== undefined && { status: body.status }),
      },
    });

    return NextResponse.json(success(hotMajor, "更新成功"));
  } catch (err) {
    console.error("Update hot major error:", err);
    return NextResponse.json(serverError("更新热门专业失败"), { status: 500 });
  }
}

// DELETE /api/hot-majors/[id] - 删除热门专业
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization");
    try {
      await requirePermission(authHeader, "content:delete");
    } catch {
      return NextResponse.json(forbidden("权限不足"), { status: 403 });
    }

    const { id } = await params;
    await prisma.hotMajor.delete({ where: { id: parseInt(id) } });

    return NextResponse.json(success(null, "删除成功"));
  } catch (err) {
    console.error("Delete hot major error:", err);
    return NextResponse.json(serverError("删除热门专业失败"), { status: 500 });
  }
}
