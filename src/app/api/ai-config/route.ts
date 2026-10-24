/**
 * 旧入口兼容（V11-COMPAT-01）：GET/POST /api/ai-config → 现役 GET/POST /api/llm/providers
 *
 * 背景：main@94dbbbb 的旧管理端 AIConfig CRUD 在 upgrade 已由 LLMProvider（/api/llm/providers）
 * 取代，旧表不存在、旧路由不存在（裸 404）。本路由按 307（Temporary Redirect，方法与请求体保留）
 * 映射到现役端点：不复活旧 CRUD 语义，鉴权/校验/字段契约全部以现役端点为准。
 *
 * 映射表（全量，见证据 docs/design/06_validation/evidence/V11/COMPAT-01/execution.md）：
 *   GET  /api/ai-config      → /api/llm/providers
 *   POST /api/ai-config      → /api/llm/providers
 *   GET  /api/ai-config/[id] → /api/llm/providers/[id]
 *   PUT  /api/ai-config/[id] → /api/llm/providers/[id]
 *   DEL  /api/ai-config/[id] → /api/llm/providers/[id]
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function redirect(request: Request, target: string): NextResponse {
  const from = new URL(request.url);
  const to = new URL(target, request.url);
  // 旧查询串（分页/keyword）原样透传
  from.searchParams.forEach((v, k) => to.searchParams.set(k, v));
  return NextResponse.redirect(to, 307);
}

/** GET /api/ai-config：旧列表入口 → 现役供应商列表 */
export async function GET(request: Request): Promise<NextResponse> {
  return redirect(request, "/api/llm/providers");
}

/** POST /api/ai-config：旧新建入口 → 现役供应商新建 */
export async function POST(request: Request): Promise<NextResponse> {
  return redirect(request, "/api/llm/providers");
}
