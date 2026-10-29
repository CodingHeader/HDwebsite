/**
 * 健康检查（V8-T-04：迁入 withApi，统一鉴权/参数/事件入口）
 *
 * 关键取舍（独立复核提出，已修）：
 *   `withApi` 的默认异常路径会 `emitApiError()` → 触发 system_error 邮件通知。
 *   health 是**公开、无鉴权、高频**的探活端点：DB 一挂，每个探活周期都会打一次通知，
 *   存在放大甚至自激风险（通知链路本身也可能依赖 DB）。因此这里**在 handler 内部捕获**，
 *   直接返回 500，不让异常冒泡到 withApi 的统一映射——与迁移前的行为完全一致。
 *
 * - 公开路由（探活用，无需鉴权）
 * - 保留 0 参可调用性：既有契约测试（lane-b/routes-public.test.ts）以 `healthGET()` 直接调用
 */
import { prisma } from "@/lib/prisma";
import { productionPort } from "@/lib/env";
import { success, serverError } from "@/lib/api-response";
import { withApi } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

const handler = withApi(
  async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (err) {
      // 刻意不回抛：避免高频公开探活把 system_error 通知打爆（见文件头说明）
      console.error("[health] 数据库探活失败：", err instanceof Error ? err.message : err);
      return serverError("数据库不可用");
    }
    return success({
      status: "ok",
      db: "up",
      // V22-ENV-02：应用自证标识——一条 curl 即可确认打开的是 HDwebsite 而非其它项目
      app: "hdwebsite",
      port: productionPort(),
      time: new Date().toISOString(),
    });
  },
  { route: "health/GET" }
);

/** GET /api/health：应用 + 数据库连通性（步行骨架验收项） */
export async function GET(request?: Request): Promise<Response> {
  return handler(request ?? new Request("http://localhost/api/health"));
}