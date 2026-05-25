import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { success, error as errorResp, unauthorized } from "@/lib/api-response";

/**
 * GET  /api/chat-scenes  公开只读（前台根据 source/code 查 greeting/starters）
 * POST /api/chat-scenes  管理员创建
 */

const createSchema = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional().nullable(),
  greeting: z.string().min(1).max(1000),
  systemPrompt: z.string().min(1).max(4000),
  knowledgeTags: z.string().max(200).default(""),
  starters: z.string().max(2000).optional().nullable(),
  // 前台差异化渲染字段
  pageTitle: z.string().max(80).optional().nullable(),
  pageSubtitle: z.string().max(200).optional().nullable(),
  headerTip: z.string().max(200).optional().nullable(),
  sidebarTitle: z.string().max(80).optional().nullable(),
  processSteps: z.string().max(4000).optional().nullable(),
  promiseList: z.string().max(2000).optional().nullable(),
  contactCardTitle: z.string().max(80).optional().nullable(),
  useKnowledgeBase: z.boolean().default(true),
  status: z.enum(["active", "inactive"]).default("active"),
  sort: z.number().int().min(0).max(1000).default(0),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const where: Record<string, unknown> = {};
    if (code) where.code = code;

    const items = await prisma.chatScene.findMany({
      where,
      orderBy: [{ sort: "asc" }, { id: "asc" }],
    });
    return NextResponse.json(success(items, "获取场景列表成功"));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "获取场景失败";
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
      return NextResponse.json(errorResp(parsed.error.issues[0]?.message || "参数错误"), { status: 400 });
    }

    const created = await prisma.chatScene.create({ data: parsed.data });
    return NextResponse.json(success(created, "创建成功"));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "创建场景失败";
    if (msg.includes("授权") || msg.includes("token")) {
      return NextResponse.json(unauthorized(msg), { status: 401 });
    }
    return NextResponse.json(errorResp(msg), { status: 500 });
  }
}
