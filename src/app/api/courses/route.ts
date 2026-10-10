import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api-response";
import { z } from "zod";
import { authenticateRequest } from "@/lib/api-auth";

const courseSchema = z.object({
  title: z.string().min(1, "标题不能为空"),
  description: z.string().optional(),
  price: z.number().min(0, "价格不能为负数").default(0),
  duration: z.string().optional(),
  outline: z.string().optional(),
  cover: z.string().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
  categoryId: z.number().min(1, "请选择分类"),
});

// GET /api/courses - 获取课程列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("category");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search");

    const authHeader = request.headers.get("authorization");
    const auth = authHeader ? await authenticateRequest(request) : null;

    if (auth?.response) {
      return auth.response;
    }

    const where = {
      ...(authHeader ? {} : { status: "active" }),
      ...(categoryId ? { categoryId: parseInt(categoryId) } : {}),
      ...(search ? { title: { contains: search } } : {}),
    };

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        include: { category: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.course.count({ where }),
    ]);

    return NextResponse.json(
      success({
        items: courses,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      })
    );
  } catch (err) {
    console.error("Get courses error:", err);
    return NextResponse.json(error("获取课程列表失败"), { status: 500 });
  }
}

// POST /api/courses - 创建课程（需要认证）
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (auth.response) {
      return auth.response;
    }

    const body = await request.json();
    const result = courseSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(error(result.error.issues[0].message), { status: 400 });
    }

    const course = await prisma.course.create({
      data: result.data,
      include: { category: true },
    });

    return NextResponse.json(success(course, "创建成功"), { status: 201 });
  } catch (err) {
    console.error("Create course error:", err);
    return NextResponse.json(error("创建课程失败"), { status: 500 });
  }
}
