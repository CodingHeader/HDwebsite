import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api-response";
import { z } from "zod";
import { authenticateRequest } from "@/lib/api-auth";

const newsSchema = z.object({
  title: z.string().min(1, "标题不能为空"),
  content: z.string().optional(),
  cover: z.string().optional(),
  status: z.enum(["draft", "published"]).default("draft"),
});

// GET /api/news - 获取新闻列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

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
        : { status: "published" }),
      ...(search ? { title: { contains: search } } : {}),
    };

    const [news, total] = await Promise.all([
      prisma.news.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.news.count({ where }),
    ]);

    return NextResponse.json(
      success({
        items: news,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      })
    );
  } catch (err) {
    console.error("Get news error:", err);
    return NextResponse.json(error("获取新闻列表失败"), { status: 500 });
  }
}

// POST /api/news - 创建新闻
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (auth.response) {
      return auth.response;
    }

    const body = await request.json();
    const result = newsSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(error(result.error.issues[0].message), { status: 400 });
    }

    const news = await prisma.news.create({
      data: result.data,
    });

    return NextResponse.json(success(news, "创建成功"), { status: 201 });
  } catch (err) {
    console.error("Create news error:", err);
    return NextResponse.json(error("创建新闻失败"), { status: 500 });
  }
}
