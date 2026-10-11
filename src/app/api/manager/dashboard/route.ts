import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { serverError, success } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** GET /api/manager/dashboard：管理端概览计数 */
export async function GET(request: Request) {
  const guard = await requireAuth(request, "article:list");
  if (!guard.ok) return guard.response;
  try {
    const [articles, published, students, courses] = await Promise.all([
      prisma.article.count(),
      prisma.article.count({ where: { status: "published" } }),
      prisma.student.count(),
      prisma.course.count(),
    ]);
    return success({ articles, published, students, courses }, "获取成功");
  } catch (err) {
    console.error("[manager/dashboard] 查询失败：", err);
    return serverError("获取仪表盘数据失败");
  }
}
