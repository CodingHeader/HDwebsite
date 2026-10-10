/**
 * HomeCard API - 首页四宫格卡片管理
 *
 * GET    /api/home-cards      → 获取所有活跃卡片（前台用）
 * GET    /api/home-cards?all=1 → 获取所有卡片（后台用）
 * POST   /api/home-cards      → 创建卡片
 * PUT    /api/home-cards/[id] → 更新卡片
 * DELETE /api/home-cards/[id] → 删除卡片
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error, unauthorized, forbidden, serverError, notFound } from "@/lib/api-response";
import { authenticateRequest } from "@/lib/api-auth";
import { requirePermission } from "@/lib/auth";

// GET /api/home-cards
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all") === "1";

    const where = all ? {} : { status: "active" };

    const cards = await prisma.homeCard.findMany({
      where,
      orderBy: { sort: "asc" },
    });

    return NextResponse.json(success(cards));
  } catch (err) {
    console.error("Get home cards error:", err);
    return NextResponse.json(serverError("获取卡片失败"), { status: 500 });
  }
}

// POST /api/home-cards
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    try {
      await requirePermission(authHeader, "content:create");
    } catch {
      return NextResponse.json(forbidden("权限不足"), { status: 403 });
    }

    const body = await request.json();
    const { title, subtitle, icon, href, gradient, hoverGradient, shadow, sort } = body;

    if (!title || !subtitle) {
      return NextResponse.json(error("标题和副标题不能为空"), { status: 400 });
    }

    const card = await prisma.homeCard.create({
      data: {
        title,
        subtitle,
        icon: icon || "MessageSquare",
        href: href || "/courses",
        gradient: gradient || "from-blue-500 to-blue-600",
        hoverGradient: hoverGradient || "from-blue-400 to-blue-500",
        shadow: shadow || "shadow-blue-200",
        sort: sort ?? 0,
        status: "active",
      },
    });

    return NextResponse.json(success(card, "创建成功"), { status: 201 });
  } catch (err) {
    console.error("Create home card error:", err);
    return NextResponse.json(serverError("创建卡片失败"), { status: 500 });
  }
}
