import { prisma } from "@/lib/prisma";
import { created } from "@/lib/api-response";
import { clientIp } from "@/lib/log";
import { ApiHttpError, withApi } from "@/lib/api-handler";
// CCR-W2-08-01：请求体 DTO 唯一源在 src/contracts，路由内不再自行定义 zod schema
import { applySubmitSchema } from "@/contracts/resources";

export const dynamic = "force-dynamic";

/** POST /api/apply：公开报名提交（防刷频控：同 IP 每分钟 5 次；全站每分钟 100 条） */
export const POST = withApi(
  async ({ request }) => {
    // 公开路由：保留 M1 文案「请填写姓名/有效电话」——不用 parseBody 默认「参数校验失败」
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiHttpError(400, "请求体不是合法 JSON");
    }
    const parsed = applySubmitSchema.safeParse(body);
    if (!parsed.success) throw new ApiHttpError(400, parsed.error.issues[0]?.message ?? "参数错误");
    const input = parsed.data;
    const ip = clientIp(request);

    // 简易频控：1 分钟内同 IP 超过 5 条提交则拒绝（沿用 M1 口径与中文文案）
    const recent = await prisma.student.count({
      where: { createdAt: { gte: new Date(Date.now() - 60_000) } },
    });
    const ipRecent = await prisma.userAction.count({
      where: { actionType: "submit", actionTarget: "apply", ipAddress: ip, createdAt: { gte: new Date(Date.now() - 60_000) } },
    });
    if (ipRecent >= 5 || recent >= 100) {
      throw new ApiHttpError(400, "提交过于频繁，请稍后再试");
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
  },
  { errorMessage: "提交失败", route: "apply/POST" }
);