/**
 * 操作日志写入工具（R7 收敛：路由内不再散落 prisma.operationLog.create）
 */
import { prisma } from "@/lib/prisma";

export async function logOperation(input: {
  userId?: number | null;
  username: string;
  module: string;
  action: string;
  title?: string;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  try {
    await prisma.operationLog.create({
      data: {
        userId: input.userId ?? null,
        username: input.username,
        module: input.module,
        action: input.action,
        title: input.title ?? null,
        content:
          input.before !== undefined || input.after !== undefined
            ? JSON.stringify({ before: input.before ?? null, after: input.after ?? null })
            : null,
        ipAddress: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch {
    // 日志失败不阻断主流程
  }
}

export function clientIp(request: Request): string | null {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null
  );
}
