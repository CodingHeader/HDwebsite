import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error, unauthorized, forbidden, serverError } from "@/lib/api-response";
import { authenticateRequest } from "@/lib/api-auth";
import { requirePermission } from "@/lib/auth";

// GET /api/hot-majors
// 默认返回 active 状态的热门专业（前台用）
// GET /api/hot-majors?all=1 返回全部（后台用，需认证）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all") === "1";

    const where = all ? {} : { status: "active" };

    const hotMajors = await prisma.hotMajor.findMany({
      where,
      orderBy: { sort: "asc" },
    });

    return NextResponse.json(success(hotMajors));
  } catch (err) {
    console.error("Get hot majors error:", err);
    return NextResponse.json(serverError("获取热门专业失败"), { status: 500 });
  }
}

// POST /api/hot-majors - 创建热门专业
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    try {
      await requirePermission(authHeader, "content:create");
    } catch {
      return NextResponse.json(forbidden("权限不足"), { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      subtitle,
      description,
      duration,
      iconType,
      iconImage,
      iconColor,
      link,
      sort,
      status,
    } = body;

    if (!title) {
      return NextResponse.json(error("专业名称不能为空"), { status: 400 });
    }

    const hotMajor = await prisma.hotMajor.create({
      data: {
        title,
        subtitle: subtitle || "专升本",
        description: description || null,
        duration: duration || "2年",
        iconType: iconType || "text",
        iconImage: iconImage || null,
        iconColor: iconColor || "from-blue-500 to-blue-600",
        link: link || "/apply",
        sort: sort ?? 0,
        status: status || "active",
      },
    });

    return NextResponse.json(success(hotMajor, "创建成功"), { status: 201 });
  } catch (err) {
    console.error("Create hot major error:", err);
    return NextResponse.json(serverError("创建热门专业失败"), { status: 500 });
  }
}
