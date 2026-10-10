/**
 * HomeCard [id] API - 单个卡片操作
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error, forbidden, serverError, notFound } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth";

// PUT /api/home-cards/[id]
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

    const card = await prisma.homeCard.update({
      where: { id: parseInt(id) },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.subtitle !== undefined && { subtitle: body.subtitle }),
        ...(body.icon !== undefined && { icon: body.icon }),
        ...(body.href !== undefined && { href: body.href }),
        ...(body.gradient !== undefined && { gradient: body.gradient }),
        ...(body.hoverGradient !== undefined && { hoverGradient: body.hoverGradient }),
        ...(body.shadow !== undefined && { shadow: body.shadow }),
        ...(body.sort !== undefined && { sort: body.sort }),
        ...(body.status !== undefined && { status: body.status }),
      },
    });

    return NextResponse.json(success(card, "更新成功"));
  } catch (err) {
    console.error("Update home card error:", err);
    return NextResponse.json(serverError("更新卡片失败"), { status: 500 });
  }
}

// DELETE /api/home-cards/[id]
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
    await prisma.homeCard.delete({ where: { id: parseInt(id) } });

    return NextResponse.json(success(null, "删除成功"));
  } catch (err) {
    console.error("Delete home card error:", err);
    return NextResponse.json(serverError("删除卡片失败"), { status: 500 });
  }
}
