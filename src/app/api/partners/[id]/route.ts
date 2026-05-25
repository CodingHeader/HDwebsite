import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api-response";
import { z } from "zod";
import { authenticateRequest } from "@/lib/api-auth";

const partnerSchema = z.object({
  name: z.string().min(1, "院校名称不能为空").optional(),
  logo: z.string().min(1, "Logo不能为空").optional(),
  website: z.string().optional(),
  sort: z.number().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

// GET /api/partners/[id] - 获取单个院校
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const partner = await prisma.partner.findUnique({
      where: { id: parseInt(id) },
    });

    if (!partner) {
      return NextResponse.json(error("院校不存在"), { status: 404 });
    }

    return NextResponse.json(success(partner));
  } catch (err) {
    console.error("Error fetching partner:", err);
    return NextResponse.json(error("获取院校失败"), { status: 500 });
  }
}

// PUT /api/partners/[id] - 更新院校
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = partnerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(error(result.error.issues[0].message), { status: 400 });
    }

    const partner = await prisma.partner.update({
      where: { id: parseInt(id) },
      data: result.data,
    });

    return NextResponse.json(success(partner, "更新成功"));
  } catch (err) {
    console.error("Error updating partner:", err);
    return NextResponse.json(error("更新失败"), { status: 500 });
  }
}

// DELETE /api/partners/[id] - 删除院校
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
    await prisma.partner.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json(success(null, "删除成功"));
  } catch (err) {
    console.error("Error deleting partner:", err);
    return NextResponse.json(error("删除失败"), { status: 500 });
  }
}
