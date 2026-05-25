import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api-response";
import { z } from "zod";
import { authenticateRequest } from "@/lib/api-auth";

const serviceGuideSchema = z.object({
  slug: z.string().max(80).optional().nullable(),
  title: z.string().min(1, "标题不能为空"),
  subtitle: z.string().max(200).optional().nullable(),
  content: z.string().max(50000).optional().nullable(),
  icon: z.string().min(1, "图标不能为空"),
  link: z.string().min(1, "链接不能为空"),
  sort: z.number().default(0),
  status: z.enum(["active", "inactive"]).default("active"),
});

// GET /api/service-guides - 获取服务指南列表
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

    const guides = await prisma.serviceGuide.findMany({
      where,
      orderBy: [{ sort: "asc" }, { id: "asc" }],
    });

    return NextResponse.json(success(guides));
  } catch (err) {
    console.error("Error fetching service guides:", err);
    return NextResponse.json(error("获取服务指南失败"), { status: 500 });
  }
}

// POST /api/service-guides - 创建服务指南
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (auth.response) {
      return auth.response;
    }

    const body = await request.json();
    const result = serviceGuideSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(error(result.error.issues[0].message), { status: 400 });
    }

    const guide = await prisma.serviceGuide.create({
      data: result.data,
    });

    return NextResponse.json(success(guide, "创建成功"));
  } catch (err) {
    console.error("Error creating service guide:", err);
    return NextResponse.json(error("创建失败"), { status: 500 });
  }
}
