import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, unauthorized, error as errorResp } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";

const chatPostSchema = z.object({
  sessionId: z.string().min(1, "sessionId 不能为空").max(64),
  conversationId: z.string().min(1).max(64).optional(),
  role: z.enum(["user", "assistant", "system"]),
  message: z.string().min(1, "message 不能为空").max(5000),
  model: z.string().max(64).optional(),
  temperature: z.number().optional(),
  tokensUsed: z.number().int().optional(),
  responseTime: z.number().int().optional(),
  pageUrl: z.string().max(500).optional(),
  pageTitle: z.string().max(200).optional(),
  metadata: z.string().max(2000).optional(),
});

/**
 * POST /api/chat-history
 * 公开写入端点：前台聊天页在每轮 user/assistant 消息后调用，记录到 AIChatHistory
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = chatPostSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        errorResp(result.error.issues[0]?.message || "参数错误"),
        { status: 400 }
      );
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;
    const ua = request.headers.get("user-agent");

    const data = result.data;
    const created = await prisma.aIChatHistory.create({
      data: {
        sessionId: data.sessionId,
        conversationId: data.conversationId || data.sessionId,
        role: data.role,
        message: data.message,
        ipAddress: ip,
        userAgent: ua,
        model: data.model ?? null,
        temperature: data.temperature ?? null,
        tokensUsed: data.tokensUsed ?? null,
        responseTime: data.responseTime ?? null,
        pageUrl: data.pageUrl ?? null,
        pageTitle: data.pageTitle ?? null,
        metadata: data.metadata ?? null,
      },
    });

    return NextResponse.json(success({ id: created.id }, "记录成功"));
  } catch (err) {
    console.error("Error creating chat history:", err);
    return NextResponse.json(errorResp("记录失败"), { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    await requireAuth(authHeader);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const search = searchParams.get("search") || "";
    const sessionId = searchParams.get("sessionId") || "";

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { message: { contains: search } },
        { sessionId: { contains: search } },
        { conversationId: { contains: search } },
      ];
    }
    if (sessionId) {
      where.sessionId = sessionId;
    }

    const [items, total] = await Promise.all([
      prisma.aIChatHistory.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.aIChatHistory.count({ where }),
    ]);

    return NextResponse.json(
      success(
        { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
        "获取对话日志成功"
      )
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "获取对话日志失败";
    return NextResponse.json(unauthorized(message), { status: 401 });
  }
}
