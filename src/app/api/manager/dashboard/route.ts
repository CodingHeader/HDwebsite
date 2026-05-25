import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api-response";
import { authenticateRequest } from "@/lib/api-auth";

/**
 * 获取管理后台仪表盘数据
 * GET /api/manager/dashboard
 *
 * 需要权限: manager 或 admin
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (auth.response) {
      return auth.response;
    }

    // 获取统计数据
    const [
      totalCourses,
      totalArticles,
      totalStudents,
      pendingStudents,
      recentStudents,
      recentArticles,
    ] = await Promise.all([
      // 课程总数
      prisma.course.count(),
      // 文章总数
      prisma.article.count(),
      // 学员总数
      prisma.student.count(),
      // 待审核学员
      prisma.student.count({ where: { status: "pending" } }),
      // 最近学员
      prisma.student.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          status: true,
          course: { select: { title: true } },
        },
      }),
      // 最近文章
      prisma.article.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          viewCount: true,
          publishedAt: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json(
      success({
        stats: {
          totalCourses,
          totalArticles,
          totalStudents,
          pendingStudents,
        },
        recentStudents,
        recentArticles,
      }, "获取仪表盘数据成功")
    );
  } catch (err) {
    console.error("Dashboard error:", err);
    return NextResponse.json(error("获取仪表盘数据失败"), { status: 500 });
  }
}
