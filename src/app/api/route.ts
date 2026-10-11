import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** 根探活（原项目口径） */
export async function GET() {
  return NextResponse.json({ code: 200, data: { ok: true }, message: "HDwebsite API" });
}
