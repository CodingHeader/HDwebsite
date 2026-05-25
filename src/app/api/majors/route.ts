import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/api-auth";
import { success, error } from "@/lib/api-response";
import { createMajorSlug, ensureCourseForMajor } from "@/lib/enrollment-sync";

const majorSchema = z.object({
  name: z.string().min(1, "专业名称不能为空"),
  description: z.string().optional().nullable(),
  duration: z.string().optional().nullable(),
  cover: z.string().optional().nullable(),
  status: z.enum(["active", "inactive"]).default("active"),
  sort: z.number().default(0),
  categoryId: z.number().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search")?.trim();

    const majors = await prisma.major.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(search ? { name: { contains: search } } : {}),
      },
      include: { category: true },
      orderBy: [{ sort: "asc" }, { id: "asc" }],
    });

    return NextResponse.json(success(majors));
  } catch (err) {
    console.error("Get majors error:", err);
    return NextResponse.json(error("获取专业列表失败"), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (auth.response) {
      return auth.response;
    }

    const body = await request.json();
    const result = majorSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(error(result.error.issues[0].message), { status: 400 });
    }

    const major = await prisma.major.create({
      data: {
        ...result.data,
        slug: createMajorSlug(result.data.name),
      },
    });

    await ensureCourseForMajor(major.id);

    return NextResponse.json(success(major, "创建成功"), { status: 201 });
  } catch (err) {
    console.error("Create major error:", err);
    return NextResponse.json(error("创建专业失败"), { status: 500 });
  }
}
