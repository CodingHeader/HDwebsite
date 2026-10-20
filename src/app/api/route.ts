import { success } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** 根探活（原项目口径；改用契约信封 success()） */
export async function GET() {
  return success({ ok: true }, "HDwebsite API");
}