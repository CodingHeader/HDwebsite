import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error, unauthorized } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";

// PUT /api/tags/[id] - 更新标签
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get("authorization");
    await requireAuth(authHeader);

    const { id } = await params;
    const body = await request.json();
    const { name, slug } = body;

    const tag = await prisma.tag.update({
      where: { id: parseInt(id) },
      data: { name, slug },
    });

    return NextResponse.json(success(tag, "更新标签成功"));
  } catch (err) {
    console.error("Update tag error:", err);
    return NextResponse.json(error("更新标签失败"), { status: 500 });
  }
}

// DELETE /api/tags/[id] - 删除标签
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get("authorization");
    await requireAuth(authHeader);

    const { id } = await params;
    await prisma.tag.delete({ where: { id: parseInt(id) } });

    return NextResponse.json(success(null, "删除标签成功"));
  } catch (err) {
    console.error("Delete tag error:", err);
    return NextResponse.json(error("删除标签失败"), { status: 500 });
  }
}
