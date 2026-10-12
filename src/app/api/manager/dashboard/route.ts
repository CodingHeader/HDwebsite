import { prisma } from "@/lib/prisma";
import { success } from "@/lib/api-response";
import { withApi } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

/** GET /api/manager/dashboard：管理端概览计数 */
export const GET = withApi(
  async () => {
    const [articles, published, students, courses] = await Promise.all([
      prisma.article.count(),
      prisma.article.count({ where: { status: "published" } }),
      prisma.student.count(),
      prisma.course.count(),
    ]);
    return success({ articles, published, students, courses }, "获取成功");
  },
  { permission: "article:list", route: "manager/dashboard", errorMessage: "获取仪表盘数据失败" }
);
