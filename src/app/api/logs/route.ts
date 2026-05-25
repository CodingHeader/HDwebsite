import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, unauthorized } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { parseLogListQuery } from "@/lib/operation-log-query";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    await requireAuth(authHeader);
    const { searchParams } = new URL(request.url);
    const { page, pageSize, search, skip, take } = parseLogListQuery(searchParams);

    const where = search
      ? {
          OR: [
            { username: { contains: search } },
            { module: { contains: search } },
            { action: { contains: search } },
            { title: { contains: search } },
          ],
        }
      : undefined;

    const [logs, total] = await Promise.all([
      prisma.operationLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.operationLog.count({ where }),
    ]);

    return NextResponse.json(
      success(
        {
          items: logs,
          total,
          page,
          pageSize,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
        "获取日志成功",
      ),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "获取日志失败";
    return NextResponse.json(unauthorized(message), { status: 401 });
  }
}
