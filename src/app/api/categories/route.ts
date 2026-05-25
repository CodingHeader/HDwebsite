import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api-response";
import { z } from "zod";
import { authenticateRequest } from "@/lib/api-auth";

const categorySchema = z.object({
  name: z.string().min(1, "分类名称不能为空"),
  slug: z.string().min(1, "分类标识不能为空"),
  sort: z.number().default(0),
});

// GET /api/categories - 获取分类列表
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { courses: true },
        },
      },
      orderBy: { sort: "asc" },
    });

    return NextResponse.json(success(categories));
  } catch (err) {
    console.error("Get categories error:", err);
    return NextResponse.json(error("获取分类列表失败"), { status: 500 });
  }
}

// POST /api/categories - 创建分类
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (auth.response) {
      return auth.response;
    }

    const body = await request.json();
    const result = categorySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(error(result.error.issues[0].message), { status: 400 });
    }

    const category = await prisma.category.create({
      data: result.data,
    });

    return NextResponse.json(success(category, "创建成功"), { status: 201 });
  } catch (err) {
    console.error("Create category error:", err);
    return NextResponse.json(error("创建分类失败"), { status: 500 });
  }
}
