/**
 * 招生同步更新/删除（V11-ENR-01 自 main/hdwebsite_0429 `PUT|DELETE /api/enrollment-offerings/[id]` 移植）
 *
 * 与既有 CRUD 路由（/api/enrollment-offerings/[id]）的分工：本路由在 main 语义上补齐
 * 学费回写（更新后刷新新旧专业的最低价；删除后刷新所属专业）与名称维度的专业/院校 ensure。
 * 输入契约：enrollmentSyncUpdateSchema（src/lib/enrollment-sync.ts）。
 */
import { success } from "@/lib/api-response";
import { notFoundError, parseBody, parseId, withApi } from "@/lib/api-handler";
import { clientIp, logOperation } from "@/lib/log";
import {
  ensureCourseCategory,
  ensureMajor,
  ensurePartner,
  enrollmentSyncUpdateSchema,
  refreshMajorCoursePricing,
} from "@/lib/enrollment-sync";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type IdParams = { id: string };

export const PUT = withApi<IdParams>(
  async ({ request, params, session }) => {
    const id = parseId(params.id);
    const input = await parseBody(request, enrollmentSyncUpdateSchema);
    const existing = await prisma.enrollmentOffering.findUnique({ where: { id } });
    if (!existing) throw notFoundError("招生计划不存在");

    const category = input.majorName ? await ensureCourseCategory() : null;
    const major = input.majorName ? await ensureMajor(input.majorName, category?.id) : null;
    const partner = input.partnerName ? await ensurePartner(input.partnerName) : null;

    const offering = await prisma.enrollmentOffering.update({
      where: { id: existing.id },
      data: {
        ...(major ? { majorId: major.id } : {}),
        ...(partner ? { partnerId: partner.id } : {}),
        // undefined = 未传（Prisma 语义：不改动）；显式 null = 清空（main 同款）
        level: input.level,
        majorCode: input.majorCode,
        studyForm: input.studyForm,
        yearTuition: input.yearTuition,
        totalTuition: input.totalTuition,
        feeDetail: input.feeDetail,
        extraFeeNote: input.extraFeeNote,
        status: input.status,
        sort: input.sort,
        // main 同款 hasPrice 推导：本次带 totalTuition → true；显式 null → false；未传 → 沿用原值
        hasPrice:
          input.totalTuition !== null && input.totalTuition !== undefined
            ? true
            : input.totalTuition === null
              ? false
              : existing.hasPrice,
      },
      include: { major: true, partner: true },
    });

    await refreshMajorCoursePricing(existing.majorId);
    if (major && major.id !== existing.majorId) {
      await refreshMajorCoursePricing(major.id);
    }

    await logOperation({
      userId: session.id,
      username: session.username,
      module: "enrollment",
      action: "update",
      title: String(offering.id),
      before: { id },
      after: { id },
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent"),
    });
    return success(offering, "更新成功");
  },
  { permission: "enrollment:edit", errorMessage: "更新招生计划失败", route: "enrollment-offerings/sync/PUT" }
);

export const DELETE = withApi<IdParams>(
  async ({ request, params, session }) => {
    const id = parseId(params.id);
    const existing = await prisma.enrollmentOffering.findUnique({ where: { id } });
    if (!existing) throw notFoundError("招生计划不存在");

    await prisma.enrollmentOffering.delete({ where: { id: existing.id } });
    await refreshMajorCoursePricing(existing.majorId);

    await logOperation({
      userId: session.id,
      username: session.username,
      module: "enrollment",
      action: "delete",
      title: String(existing.id),
      before: { id },
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent"),
    });
    return success(null, "删除成功");
  },
  { permission: "enrollment:delete", errorMessage: "删除招生计划失败", route: "enrollment-offerings/sync/DELETE" }
);
