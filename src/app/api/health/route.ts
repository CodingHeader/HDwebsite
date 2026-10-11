import { prisma } from "@/lib/prisma";
import { success, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** 健康检查：应用 + 数据库连通性（步行骨架验收项） */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return success({
      status: "ok",
      db: "up",
      time: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[health] 数据库探活失败：", err);
    return serverError("数据库不可用");
  }
}
