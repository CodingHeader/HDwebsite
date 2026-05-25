import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api-response";
import { z } from "zod";
import { authenticateRequest } from "@/lib/api-auth";

const studentSchema = z.object({
  name: z.string().min(1, "姓名不能为空"),
  phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入正确的手机号"),
  courseId: z.number().min(1, "请选择课程"),
  message: z.string().optional(),
});

// GET /api/students - 获取学员列表（需要认证）
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (auth.response) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where = {
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { phone: { contains: search } },
            ],
          }
        : {}),
    };

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        include: { course: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.student.count({ where }),
    ]);

    return NextResponse.json(
      success({
        items: students,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      })
    );
  } catch (err) {
    console.error("Get students error:", err);
    return NextResponse.json(error("获取学员列表失败"), { status: 500 });
  }
}

// POST /api/students - 创建报名（公开接口）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = studentSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(error(result.error.issues[0].message), { status: 400 });
    }

    const student = await prisma.student.create({
      data: {
        ...result.data,
        status: "pending",
      },
      include: { course: true },
    });

    return NextResponse.json(success(student, "报名成功"), { status: 201 });
  } catch (err) {
    console.error("Create student error:", err);
    return NextResponse.json(error("报名失败"), { status: 500 });
  }
}
