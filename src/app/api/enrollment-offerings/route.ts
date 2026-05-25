import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/api-auth";
import { success, error } from "@/lib/api-response";
import { upsertEnrollmentOffering } from "@/lib/enrollment-sync";

const offeringSchema = z.object({
  majorName: z.string().min(1, "专业名称不能为空"),
  partnerName: z.string().min(1, "学校名称不能为空"),
  partnerLogo: z.string().optional().nullable(),
  sourceBatch: z.string().optional(),
  educationType: z.string().optional(),
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolName = searchParams.get("schoolName")?.trim();
    const majorName = searchParams.get("majorName")?.trim();
    const educationType = searchParams.get("educationType")?.trim();
    const level = searchParams.get("level")?.trim();
    const status = searchParams.get("status")?.trim();
    const hasPrice = searchParams.get("hasPrice");
    const page = Math.max(parseInt(searchParams.get("page") || "1"), 1);
    const pageSize = Math.min(Math.max(parseInt(searchParams.get("pageSize") || "20"), 1), 100);
    const where = {
      ...(educationType ? { educationType } : {}),
      ...(level ? { level } : {}),
      ...(status ? { status } : {}),
      ...(hasPrice === "true" ? { hasPrice: true } : {}),
      ...(hasPrice === "false" ? { hasPrice: false } : {}),
      ...(schoolName ? { partner: { name: { contains: schoolName } } } : {}),
      ...(majorName ? { major: { name: { contains: majorName } } } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.enrollmentOffering.findMany({
        where,
        include: { major: true, partner: true },
        orderBy: [{ sort: "asc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.enrollmentOffering.count({ where }),
    ]);

    return NextResponse.json(success({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }));
  } catch (err) {
    console.error("Get enrollment offerings error:", err);
    return NextResponse.json(error("获取招生计划失败"), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (auth.response) {
      return auth.response;
    }

    const body = await request.json();
    const result = offeringSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(error(result.error.issues[0].message), { status: 400 });
    }

    const offering = await upsertEnrollmentOffering(result.data);

    return NextResponse.json(success(offering, "保存成功"), { status: 201 });
  } catch (err) {
    console.error("Create enrollment offering error:", err);
    return NextResponse.json(error("保存招生计划失败"), { status: 500 });
  }
}
