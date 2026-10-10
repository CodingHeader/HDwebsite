import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api-response";
import { z } from "zod";
import { authenticateRequest } from "@/lib/api-auth";

const campusSchema = z.object({
  name: z.string().min(1, "校区名称不能为空"),
  address: z.string().optional(),
  sort: z.number().default(0),
  status: z.enum(["active", "inactive"]).default("active"),
});

// GET /api/campus - 获取校区列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const authHeader = request.headers.get("authorization");
    const auth = authHeader ? await authenticateRequest(request) : null;

    if (auth?.response) {
      return auth.response;
    }

    const where = authHeader ? (status ? { status } : {}) : { status: "active" };

    const campusList = await prisma.campus.findMany({
      where,
      include: {
        images: {
          orderBy: { sort: "asc" },
        },
      },
      orderBy: [{ sort: "asc" }, { id: "desc" }],
    });

    return NextResponse.json(success(campusList));
  } catch (err) {
    console.error("Error fetching campus list:", err);
    return NextResponse.json(error("获取校区列表失败"), { status: 500 });
  }
}

// POST /api/campus - 创建校区
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (auth.response) {
      return auth.response;
    }

    const body = await request.json();
    const result = campusSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(error(result.error.issues[0].message), { status: 400 });
    }

    const campus = await prisma.campus.create({
      data: result.data,
    });

    return NextResponse.json(success(campus, "创建成功"));
  } catch (err) {
    console.error("Error creating campus:", err);
    return NextResponse.json(error("创建失败"), { status: 500 });
  }
}
