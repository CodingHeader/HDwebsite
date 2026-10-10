import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api-response";
import { z } from "zod";
import { authenticateRequest } from "@/lib/api-auth";

const partnerSchema = z.object({
  name: z.string().min(1, "院校名称不能为空"),
  logo: z.string().min(1, "Logo不能为空"),
  website: z.string().optional(),
  sort: z.number().default(0),
  status: z.enum(["active", "inactive"]).default("active"),
});

// GET /api/partners - 获取招生院校列表
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

    const partners = await prisma.partner.findMany({
      where,
      orderBy: [{ sort: "asc" }, { id: "desc" }],
    });

    return NextResponse.json(success(partners));
  } catch (err) {
    console.error("Error fetching partners:", err);
    return NextResponse.json(error("获取院校列表失败"), { status: 500 });
  }
}

// POST /api/partners - 创建招生院校
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (auth.response) {
      return auth.response;
    }

    const body = await request.json();
    const result = partnerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(error(result.error.issues[0].message), { status: 400 });
    }

    const partner = await prisma.partner.create({
      data: result.data,
    });

    return NextResponse.json(success(partner, "创建成功"));
  } catch (err) {
    console.error("Error creating partner:", err);
    return NextResponse.json(error("创建失败"), { status: 500 });
  }
}
