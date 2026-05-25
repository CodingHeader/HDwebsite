import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api-response";
import { z } from "zod";
import { authenticateRequest } from "@/lib/api-auth";

const bannerSchema = z.object({
  image: z.string().min(1, "图片不能为空"),
  link: z.string().optional(),
  sort: z.number().default(0),
  status: z.enum(["active", "inactive"]).default("active"),
});

// GET /api/banners - 获取轮播图列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const authHeader = request.headers.get("authorization");
    const auth = authHeader ? await authenticateRequest(request) : null;

    if (auth?.response) {
      return auth.response;
    }

    const where = {
      ...(authHeader
        ? status
          ? { status }
          : {}
        : { status: "active" }),
    };

    const banners = await prisma.banner.findMany({
      where,
      orderBy: { sort: "asc" },
    });

    return NextResponse.json(success(banners));
  } catch (err) {
    console.error("Get banners error:", err);
    return NextResponse.json(error("获取轮播图失败"), { status: 500 });
  }
}

// POST /api/banners - 创建轮播图
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (auth.response) {
      return auth.response;
    }

    const body = await request.json();
    const result = bannerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(error(result.error.issues[0].message), { status: 400 });
    }

    const banner = await prisma.banner.create({
      data: result.data,
    });

    return NextResponse.json(success(banner, "创建成功"), { status: 201 });
  } catch (err) {
    console.error("Create banner error:", err);
    return NextResponse.json(error("创建轮播图失败"), { status: 500 });
  }
}
