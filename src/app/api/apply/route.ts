import { prisma } from "@/lib/prisma";
import { created, error, serverError } from "@/lib/api-response";
import { z } from "zod";
import { clientIp } from "@/lib/log";

export const dynamic = "force-dynamic";

const applySchema = z.object({
  name: z.string().min(1, "请填写姓名").max(50),
  phone: z.string().min(5, "请填写有效电话").max(20),
  courseId: z.coerce.number().int().positive().nullable().optional(),
  message: z.string().max(1000).nullable().optional(),
  sessionId: z.string().max(64).optional(),
});

/** POST /api/apply：公开报名提交（防刷频控：同 IP 每分钟 5 次） */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error("请求体不是合法 JSON");
  }
  const parsed = applySchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.issues[0]?.message ?? "参数错误", 400);
  }
  const input = parsed.data;
  const ip = clientIp(request);

  try {
    // 简易频控：1 分钟内同 IP 超过 5 条提交则拒绝
    const recent = await prisma.student.count({
      where: { createdAt: { gte: new Date(Date.now() - 60_000) } },
    });
    const ipRecent = await prisma.userAction.count({
      where: { actionType: "submit", actionTarget: "apply", ipAddress: ip, createdAt: { gte: new Date(Date.now() - 60_000) } },
    });
    if (ipRecent >= 5 || recent >= 100) {
      return error("提交过于频繁，请稍后再试", 400);
    }

    const student = await prisma.student.create({
      data: {
        name: input.name,
        phone: input.phone,
        courseId: input.courseId ?? null,
        message: input.message ?? null,
        status: "pending",
      },
    });

    // 埋点（ASM-008：表单提交）
    await prisma.userAction.create({
      data: {
        actionType: "submit",
        actionTarget: "apply",
        sessionId: input.sessionId ?? "anonymous",
        ipAddress: ip,
        userAgent: request.headers.get("user-agent"),
        metadata: JSON.stringify({ studentId: student.id, courseId: input.courseId ?? null }),
      },
    }).catch(() => undefined);

    return created({ id: student.id }, "报名提交成功");
  } catch (err) {
    console.error("[apply] 提交失败：", err);
    return serverError("提交失败");
  }
}

