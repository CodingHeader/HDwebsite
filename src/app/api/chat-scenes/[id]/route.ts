import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { success, error as errorResp, unauthorized, notFound } from "@/lib/api-response";

const updateSchema = z.object({
  code: z.string().min(1).max(32).optional(),
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(500).optional().nullable(),
  greeting: z.string().min(1).max(1000).optional(),
  systemPrompt: z.string().min(1).max(4000).optional(),
  knowledgeTags: z.string().max(200).optional(),
  starters: z.string().max(2000).optional().nullable(),
  pageTitle: z.string().max(80).optional().nullable(),
  pageSubtitle: z.string().max(200).optional().nullable(),
  headerTip: z.string().max(200).optional().nullable(),
  sidebarTitle: z.string().max(80).optional().nullable(),
  processSteps: z.string().max(4000).optional().nullable(),
  promiseList: z.string().max(2000).optional().nullable(),
  contactCardTitle: z.string().max(80).optional().nullable(),
  useKnowledgeBase: z.boolean().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  sort: z.number().int().min(0).max(1000).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum)) return NextResponse.json(errorResp("无效ID"), { status: 400 });
  const item = await prisma.chatScene.findUnique({ where: { id: idNum } });
  if (!item) return NextResponse.json(notFound("场景不存在"), { status: 404 });
  return NextResponse.json(success(item));
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get("authorization");
    await requireAuth(authHeader);

    const { id } = await params;
    const idNum = Number(id);
    if (!Number.isFinite(idNum)) return NextResponse.json(errorResp("无效ID"), { status: 400 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(errorResp(parsed.error.issues[0]?.message || "参数错误"), { status: 400 });
    }

    const updated = await prisma.chatScene.update({
      where: { id: idNum },
      data: parsed.data,
    });
    return NextResponse.json(success(updated, "更新成功"));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "更新失败";
    if (msg.includes("授权") || msg.includes("token")) {
      return NextResponse.json(unauthorized(msg), { status: 401 });
    }
    return NextResponse.json(errorResp(msg), { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get("authorization");
    await requireAuth(authHeader);

    const { id } = await params;
    const idNum = Number(id);
    if (!Number.isFinite(idNum)) return NextResponse.json(errorResp("无效ID"), { status: 400 });

    await prisma.chatScene.delete({ where: { id: idNum } });
    return NextResponse.json(success({ id: idNum }, "删除成功"));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "删除失败";
    if (msg.includes("授权") || msg.includes("token")) {
      return NextResponse.json(unauthorized(msg), { status: 401 });
    }
    return NextResponse.json(errorResp(msg), { status: 500 });
  }
}
