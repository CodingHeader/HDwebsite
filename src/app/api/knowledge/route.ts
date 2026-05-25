import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { success, error as errorResp, unauthorized } from "@/lib/api-response";

/**
 * GET  /api/knowledge         公开只读（前台 AI 使用）
 * POST /api/knowledge         管理员创建
 */

const createSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(8000),
  tags: z.string().max(200).default(""),
  source: z.enum(["local", "notion", "feishu", "web"]).default("local"),
  externalId: z.string().max(120).optional().nullable(),
  externalUrl: z.string().max(500).optional().nullable(),
  priority: z.number().int().min(0).max(1000).default(0),
  status: z.enum(["active", "inactive"]).default("active"),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") || "").trim();
    const status = searchParams.get("status");
    const tag = searchParams.get("tag");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (tag) where.tags = { contains: tag };
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
        { tags: { contains: search } },
      ];
    }

    const items = await prisma.knowledge.findMany({
      where,
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
      take: 200,
    });
    return NextResponse.json(success(items, "获取知识库成功"));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "获取知识库失败";
    return NextResponse.json(errorResp(msg), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    await requireAuth(authHeader);

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        errorResp(parsed.error.issues[0]?.message || "参数错误"),
        { status: 400 }
      );
    }

    const created = await prisma.knowledge.create({ data: parsed.data });
    return NextResponse.json(success(created, "创建成功"));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "创建知识条目失败";
    if (msg.includes("授权") || msg.includes("token")) {
      return NextResponse.json(unauthorized(msg), { status: 401 });
    }
    return NextResponse.json(errorResp(msg), { status: 500 });
  }
}
