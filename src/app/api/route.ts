/**
 * API 根探活（V8-T-04：迁入 withApi，统一信封与异常映射）
 * 公开路由，无需鉴权。
 * 保留 0 参可调用性：既有契约测试（lane-b/routes-public.test.ts）以 `apiRootGET()` 直接调用。
 */
import { success } from "@/lib/api-response";
import { withApi } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

const handler = withApi(async () => success({ ok: true }, "HDwebsite API"), {
  route: "api-root/GET",
});

/** GET /api：根探活（原项目口径；契约信封 success()） */
export async function GET(request?: Request): Promise<Response> {
  return handler(request ?? new Request("http://localhost/api"));
}
