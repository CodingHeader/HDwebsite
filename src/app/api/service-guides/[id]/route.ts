import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api-response";
import { z } from "zod";
import { authenticateRequest } from "@/lib/api-auth";

const serviceGuideSchema = z.object({
  slug: z.string().max(80).optional().nullable(),
  title: z.string().min(1, "标题不能为空").optional(),
  subtitle: z.string().max(200).optional().nullable(),
  content: z.string().max(50000).optional().nullable(),
  icon: z.string().min(1, "图标不能为空").optional(),
  link: z.string().min(1, "链接不能为空").optional(),
  sort: z.number().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

// GET /api/service-guides/[id] - 获取单个服务指南
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const guide = await prisma.serviceGuide.findUnique({
      where: { id: parseInt(id) },
    });

    if (!guide) {
      return NextResponse.json(error("服务指南不存在"), { status: 404 });
    }

    return NextResponse.json(success(guide));
  } catch (err) {
    console.error("Error fetching service guide:", err);
    return NextResponse.json(error("获取失败"), { status: 500 });
  }
}

// PUT /api/service-guides/[id] - 更新服务指南
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    if (auth.response) {
      return auth.response;
    }

    const { id } = await params;
    const body = await request.json();
    const result = serviceGuideSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(error(result.error.issues[0].message), { status: 400 });
    }

    const guide = await prisma.serviceGuide.update({
      where: { id: parseInt(id) },
      data: result.data,
    });

    return NextResponse.json(success(guide, "更新成功"));
  } catch (err) {
    console.error("Error updating service guide:", err);
    return NextResponse.json(error("更新失败"), { status: 500 });
  }
}

// DELETE /api/service-guides/[id] - 删除服务指南
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    if (auth.response) {
      return auth.response;
    }

    const { id } = await params;
    await prisma.serviceGuide.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json(success(null, "删除成功"));
  } catch (err) {
    console.error("Error deleting service guide:", err);
    return NextResponse.json(error("删除失败"), { status: 500 });
  }
}
