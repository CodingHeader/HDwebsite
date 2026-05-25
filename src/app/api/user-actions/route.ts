import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, unauthorized } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    await requireAuth(authHeader);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const search = searchParams.get("search") || "";
    const actionType = searchParams.get("actionType") || "";

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { actionTarget: { contains: search } },
        { pageUrl: { contains: search } },
        { pageTitle: { contains: search } },
        { sessionId: { contains: search } },
      ];
    }
    if (actionType) {
      where.actionType = actionType;
    }

    const [items, total] = await Promise.all([
      prisma.userAction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.userAction.count({ where }),
    ]);

    return NextResponse.json(
      success(
        { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
        "获取用户行为日志成功"
      )
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "获取用户行为日志失败";
    return NextResponse.json(unauthorized(message), { status: 401 });
  }
}
