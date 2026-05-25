import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, unauthorized, error } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization");
    await requireAuth(authHeader);

    const { id } = await params;
    const chatId = parseInt(id, 10);

    if (isNaN(chatId) || chatId <= 0) {
      return NextResponse.json(error("无效的ID"), { status: 400 });
    }

    const item = await prisma.aIChatHistory.findUnique({
      where: { id: chatId },
    });

    if (!item) {
      return NextResponse.json(error("记录不存在"), { status: 404 });
    }

    return NextResponse.json(success(item, "获取详情成功"));
  } catch (err) {
    const message = err instanceof Error ? err.message : "获取详情失败";
    return NextResponse.json(unauthorized(message), { status: 401 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization");
    await requireAuth(authHeader);

    const { id } = await params;
    const chatId = parseInt(id, 10);

    if (isNaN(chatId) || chatId <= 0) {
      return NextResponse.json(error("无效的ID"), { status: 400 });
    }

    const existing = await prisma.aIChatHistory.findUnique({
      where: { id: chatId },
    });

    if (!existing) {
      return NextResponse.json(error("记录不存在"), { status: 404 });
    }

    await prisma.aIChatHistory.delete({
      where: { id: chatId },
    });

    return NextResponse.json(success(null, "删除成功"));
  } catch (err) {
    const message = err instanceof Error ? err.message : "删除失败";
    return NextResponse.json(unauthorized(message), { status: 401 });
  }
}
