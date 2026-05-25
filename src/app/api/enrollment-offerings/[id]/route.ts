import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/api-auth";
import { success, error, notFound } from "@/lib/api-response";
import { ensureCourseCategory, ensureMajor, ensurePartner, refreshMajorCoursePricing } from "@/lib/enrollment-sync";

const updateSchema = z.object({
  majorName: z.string().min(1, "专业名称不能为空").optional(),
  partnerName: z.string().min(1, "学校名称不能为空").optional(),
  level: z.string().optional().nullable(),
  majorCode: z.string().optional().nullable(),
  studyForm: z.string().optional().nullable(),
  yearTuition: z.number().optional().nullable(),
  totalTuition: z.number().optional().nullable(),
  feeDetail: z.string().optional().nullable(),
  extraFeeNote: z.string().optional().nullable(),
  status: z.enum(["active", "inactive"]).optional(),
  sort: z.number().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticateRequest(request);
    if (auth.response) {
      return auth.response;
    }

    const { id } = await params;
    const body = await request.json();
    const result = updateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(error(result.error.issues[0].message), { status: 400 });
    }

    const existing = await prisma.enrollmentOffering.findUnique({ where: { id: parseInt(id) } });

    if (!existing) {
      return NextResponse.json(notFound("招生计划不存在"), { status: 404 });
    }

    const category = result.data.majorName ? await ensureCourseCategory() : null;
    const major = result.data.majorName ? await ensureMajor(result.data.majorName, category?.id) : null;
    const partner = result.data.partnerName ? await ensurePartner(result.data.partnerName) : null;

    const offering = await prisma.enrollmentOffering.update({
      where: { id: existing.id },
      data: {
        ...(major ? { majorId: major.id } : {}),
        ...(partner ? { partnerId: partner.id } : {}),
        level: result.data.level,
        majorCode: result.data.majorCode,
        studyForm: result.data.studyForm,
        yearTuition: result.data.yearTuition,
        totalTuition: result.data.totalTuition,
        feeDetail: result.data.feeDetail,
        extraFeeNote: result.data.extraFeeNote,
        status: result.data.status,
        sort: result.data.sort,
        hasPrice: result.data.totalTuition !== null && result.data.totalTuition !== undefined
          ? true
          : result.data.totalTuition === null
            ? false
            : existing.hasPrice,
      },
      include: { major: true, partner: true },
    });

    await refreshMajorCoursePricing(existing.majorId);
    if (major && major.id !== existing.majorId) {
      await refreshMajorCoursePricing(major.id);
    }

    return NextResponse.json(success(offering, "更新成功"));
  } catch (err) {
    console.error("Update enrollment offering error:", err);
    return NextResponse.json(error("更新招生计划失败"), { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticateRequest(request);
    if (auth.response) {
      return auth.response;
    }

    const { id } = await params;
    const existing = await prisma.enrollmentOffering.findUnique({ where: { id: parseInt(id) } });

    if (!existing) {
      return NextResponse.json(notFound("招生计划不存在"), { status: 404 });
    }

    await prisma.enrollmentOffering.delete({ where: { id: existing.id } });
    await refreshMajorCoursePricing(existing.majorId);

    return NextResponse.json(success(null, "删除成功"));
  } catch (err) {
    console.error("Delete enrollment offering error:", err);
    return NextResponse.json(error("删除招生计划失败"), { status: 500 });
  }
}
