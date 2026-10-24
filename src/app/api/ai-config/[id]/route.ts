/**
 * 旧入口兼容（V11-COMPAT-01）：/api/ai-config/[id] → 现役 /api/llm/providers/[id]
 * 307 保方法保请求体（详见 ./route.ts 头注释与证据映射表）。
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function redirect(request: Request, id: string, target: string): NextResponse {
  const from = new URL(request.url);
  const to = new URL(`${target}/${encodeURIComponent(id)}`, request.url);
  from.searchParams.forEach((v, k) => to.searchParams.set(k, v));
  return NextResponse.redirect(to, 307);
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  return redirect(request, id, "/api/llm/providers");
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  return redirect(request, id, "/api/llm/providers");
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  return redirect(request, id, "/api/llm/providers");
}
