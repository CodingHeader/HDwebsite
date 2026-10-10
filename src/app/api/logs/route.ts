import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error, unauthorized } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    await requireAuth(authHeader);

    const logs = await prisma.operationLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(success({ items: logs }, "获取日志成功"));
  } catch (err) {
    const message = err instanceof Error ? err.message : "获取日志失败";
    return NextResponse.json(unauthorized(message), { status: 401 });
  }
}
