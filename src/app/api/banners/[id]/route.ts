import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error, notFound, unauthorized, forbidden } from "@/lib/api-response";
import { z } from "zod";
import { authenticateRequest } from "@/lib/api-auth";
import { requireAuth, requirePermission } from "@/lib/auth";

const bannerSchema = z.object({
  image: z.string().min(1).optional(),
  link: z.string().optional(),
  sort: z.number().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

// GET /api/banners/[id] - 获取轮播图详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const banner = await prisma.banner.findUnique({
      where: { id: parseInt(id) },
    });

    if (!banner) {
      return NextResponse.json(notFound("轮播图不存在"), { status: 404 });
    }

    return NextResponse.json(success(banner));
  } catch (err) {
    console.error("Get banner error:", err);
    return NextResponse.json(error("获取轮播图详情失败"), { status: 500 });
  }
}

// PUT /api/banners/[id] - 更新轮播图
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 鉴权检查
    const authHeader = request.headers.get("authorization");
    try {
      await requireAuth(authHeader);
    } catch {
      return NextResponse.json(unauthorized("未登录或登录已过期"), { status: 401 });
    }

    // 权限检查
    try {
      await requirePermission(authHeader, "banner:update");
    } catch {
      return NextResponse.json(forbidden("权限不足：需要 banner:update 权限"), { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const result = bannerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(error(result.error.issues[0].message), { status: 400 });
    }

    const banner = await prisma.banner.update({
      where: { id: parseInt(id) },
      data: result.data,
    });

    return NextResponse.json(success(banner, "更新成功"));
  } catch (err) {
    console.error("Update banner error:", err);
    return NextResponse.json(error("更新轮播图失败"), { status: 500 });
  }
}

// DELETE /api/banners/[id] - 删除轮播图
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
    await prisma.banner.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json(success(null, "删除成功"));
  } catch (err) {
    console.error("Delete banner error:", err);
    return NextResponse.json(error("删除轮播图失败"), { status: 500 });
  }
}
