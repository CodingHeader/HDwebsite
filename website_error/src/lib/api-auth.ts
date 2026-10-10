import { NextRequest, NextResponse } from "next/server";
import { requireAuth, SessionUser } from "@/lib/auth";
import { unauthorized } from "@/lib/api-response";

export async function authenticateRequest(
  request: NextRequest
): Promise<{ user?: SessionUser; response?: NextResponse }> {
  try {
    const user = await requireAuth(request.headers.get("authorization"));
    return { user };
  } catch (err) {
    const message = err instanceof Error ? err.message : "未授权访问";
    return {
      response: NextResponse.json(unauthorized(message), { status: 401 }),
    };
  }
}
