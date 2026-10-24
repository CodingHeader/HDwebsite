/**
 * 招生同步与学费回写（V11-ENR-01 自 main/hdwebsite_0429 `src/lib/enrollment-sync.ts` 移植）
 *
 * 移植范围（行为与 main 对齐，对照表见 evidence/V11/ENR-01）：
 * - ensureCourseCategory / ensureMajor / ensurePartner / ensureCourseForMajor / refreshMajorCoursePricing
 * - upsertEnrollmentOffering：名称维度 upsert（专业/院校不存在则建）+ 触发最低学费回写 Course
 *
 * V11-ENR-01 唯一性防重（审计 §招生.2：唯一键含空值导致的重复写入）：
 * - 键字段 level/majorCode 经 normalizeBlankLevel 空值归一（""/"/" → null），同键推送命中同一条；
 * - 进程内 upsert 串行链（同 notify aggregateChain 模式）关闭"查后建"竞态；
 * - 建行 P2002（非空键唯一冲突，ADR-028 同款码检测）→ 回退为对既有行 update，重复推送幂等。
 *   说明：SQLite 唯一索引视 NULL 互异，跨进程并发 + 全空键的理论重复无法由索引兜底
 *   （部分索引需改表，冻结面禁止）；本实现为应用层最强可达口径，残余风险已登记。
 */
import { prisma } from "@/lib/prisma";
import { getLowestTotalTuition, normalizeBlankLevel } from "@/lib/enrollment-pricing";
import { z } from "zod";

type ActiveOfferingWithNames = {
  educationType: string;
  level: string | null;
  totalTuition: number | null;
  hasPrice: boolean;
  major: { name: string };
  partner: { name: string };
};

export type EnrollmentOfferingInput = {
  majorName: string;
  partnerName: string;
  partnerLogo?: string | null;
  sourceBatch?: string;
  educationType?: string;
  level?: string | null;
  majorCode?: string | null;
  studyForm?: string | null;
  yearTuition?: number | null;
  totalTuition?: number | null;
  feeDetail?: string | null;
  extraFeeNote?: string | null;
  status?: string;
  sort?: number;
};

/**
 * 同步推送输入契约（V11-ENR-01）：main 同名接口的移植形态。
 * 说明：冻结契约（src/contracts）不可新增；既有 offeringCreateSchema 是 id 型 CRUD 输入，
 * 与本 name 型同步输入用途不同，故此 DTO 定于本模块单源，长度上限对齐冻结契约口径。
 * status 兼容 main 的 inactive 与 upgrade 契约的 draft/archived。
 */
export const enrollmentSyncSchema = z.object({
  majorName: z.string().min(1, "专业名称不能为空").max(100),
  partnerName: z.string().min(1, "学校名称不能为空").max(100),
  partnerLogo: z.string().max(500).optional().nullable(),
  sourceBatch: z.string().max(20).optional(),
  educationType: z.string().max(20).optional(),
  level: z.string().max(50).optional().nullable(),
  majorCode: z.string().max(50).optional().nullable(),
  studyForm: z.string().max(50).optional().nullable(),
  yearTuition: z.number().min(0).optional().nullable(),
  totalTuition: z.number().min(0).optional().nullable(),
  feeDetail: z.string().max(2000).optional().nullable(),
  extraFeeNote: z.string().max(500).optional().nullable(),
  status: z.enum(["active", "inactive", "draft", "archived"]).optional(),
  sort: z.number().int().optional(),
});

/** 招生计划更新输入（main PUT [id] 同款；字段均 optional） */
export const enrollmentSyncUpdateSchema = enrollmentSyncSchema.partial();

export function createMajorSlug(name: string): string {
  return encodeURIComponent(name.trim()).replace(/%/g, "").toLowerCase();
}

export async function ensureCourseCategory() {
  const existing = await prisma.category.findFirst({
    where: { type: "course" },
    orderBy: { sort: "asc" },
  });

  if (existing) {
    return existing;
  }

  return prisma.category.create({
    data: {
      name: "招生专业",
      slug: "enrollment-majors",
      type: "course",
      sort: 0,
    },
  });
}

export async function ensureMajor(name: string, categoryId?: number | null) {
  const normalizedName = name.trim();
  const existing = await prisma.major.findUnique({ where: { name: normalizedName } });

  if (existing) {
    return existing;
  }

  return prisma.major.create({
    data: {
      name: normalizedName,
      slug: createMajorSlug(normalizedName),
      categoryId: categoryId || null,
      status: "active",
    },
  });
}

export async function ensurePartner(name: string, logo?: string | null) {
  const normalizedName = name.trim();
  const existing = await prisma.partner.findFirst({ where: { name: normalizedName } });

  if (existing) {
    return existing;
  }

  return prisma.partner.create({
    data: {
      name: normalizedName,
      logo: logo || "/images/logo.png",
      sort: 0,
      status: "active",
    },
  });
}

export async function ensureCourseForMajor(majorId: number) {
  const major = await prisma.major.findUnique({ where: { id: majorId } });

  if (!major) {
    return null;
  }

  const existingByMajor = await prisma.course.findFirst({ where: { majorId } });

  if (existingByMajor) {
    return existingByMajor;
  }

  const existingByTitle = await prisma.course.findFirst({
    where: { title: { contains: major.name } },
    orderBy: { id: "asc" },
  });

  if (existingByTitle) {
    return prisma.course.update({
      where: { id: existingByTitle.id },
      data: { majorId },
    });
  }

  const category = major.categoryId
    ? await prisma.category.findUnique({ where: { id: major.categoryId } })
    : await ensureCourseCategory();

  const fallbackCategory = category || (await ensureCourseCategory());

  return prisma.course.create({
    data: {
      title: major.name,
      description: major.description || "专业能力培养，面向实际就业岗位。",
      price: 0,
      priceText: "--",
      duration: major.duration || "咨询确认",
      cover: major.cover || null,
      status: major.status,
      categoryId: fallbackCategory.id,
      majorId,
    },
  });
}

/** 最低学费回写：active 计划取最低 totalTuition → 该专业全部课程 price/priceText（main 同款） */
export async function refreshMajorCoursePricing(majorId: number) {
  const offerings = await prisma.enrollmentOffering.findMany({
    where: { majorId, status: "active" },
    include: {
      major: { select: { name: true } },
      partner: { select: { name: true } },
    },
  });
  const result = getLowestTotalTuition(
    (offerings as ActiveOfferingWithNames[]).map((offering) => ({
      majorName: offering.major.name,
      educationType: offering.educationType,
      level: offering.level,
      partnerName: offering.partner.name,
      totalTuition: offering.totalTuition,
      hasPrice: offering.hasPrice,
    })),
  );

  await ensureCourseForMajor(majorId);

  await prisma.course.updateMany({
    where: { majorId },
    data: {
      price: result.minTotalTuition || 0,
      priceText: result.displayPrice,
    },
  });

  return result;
}

/** upsert 键（空值归一后）：sourceBatch + partnerId + majorId + educationType + level + majorCode */
function upsertKeyWhere(input: {
  sourceBatch: string;
  partnerId: number;
  majorId: number;
  educationType: string;
  level: string | null;
  majorCode: string | null;
}) {
  return {
    sourceBatch: input.sourceBatch,
    partnerId: input.partnerId,
    majorId: input.majorId,
    educationType: input.educationType,
    level: input.level,
    majorCode: input.majorCode,
  };
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === "P2002";
}

// 进程内串行链：并发推送同键时不交错（跨进程由 P2002 回退兜底）
let upsertChain: Promise<unknown> = Promise.resolve();

/** 同步入口（main POST /api/enrollment-offerings 语义）：名称 upsert + 学费回写，重复推送幂等 */
export function upsertEnrollmentOffering(input: EnrollmentOfferingInput) {
  const run = upsertChain.then(() => upsertEnrollmentOfferingInner(input));
  upsertChain = run.catch(() => undefined);
  return run;
}

async function upsertEnrollmentOfferingInner(input: EnrollmentOfferingInput) {
  const category = await ensureCourseCategory();
  const major = await ensureMajor(input.majorName, category.id);
  const partner = await ensurePartner(input.partnerName, input.partnerLogo);
  // V11-ENR-01：键字段空值归一（""/"/" → null），main 原样推送（level="/") 与空值视为同键
  const level = normalizeBlankLevel(input.level ?? null);
  const majorCode = normalizeBlankLevel(input.majorCode ?? null);
  const hasPrice = input.totalTuition !== null && input.totalTuition !== undefined;
  const sourceBatch = input.sourceBatch || "26春";
  const educationType = input.educationType || "自考";
  const status = input.status || "active";
  const where = upsertKeyWhere({
    sourceBatch,
    partnerId: partner.id,
    majorId: major.id,
    educationType,
    level,
    majorCode,
  });
  const data = {
    majorId: major.id,
    partnerId: partner.id,
    sourceBatch,
    educationType,
    level,
    majorCode,
    studyForm: input.studyForm ?? null,
    yearTuition: input.yearTuition ?? null,
    totalTuition: input.totalTuition ?? null,
    feeDetail: input.feeDetail ?? null,
    extraFeeNote: input.extraFeeNote ?? null,
    hasPrice,
    status,
    sort: input.sort ?? 0,
  };

  const existing = await prisma.enrollmentOffering.findFirst({ where });
  let offering;
  if (existing) {
    offering = await prisma.enrollmentOffering.update({ where: { id: existing.id }, data });
  } else {
    try {
      offering = await prisma.enrollmentOffering.create({ data });
    } catch (err) {
      // V11-ENR-01：非空键唯一冲突（并发推送）→ 回退更新既有行，重复推送幂等
      if (!isUniqueViolation(err)) throw err;
      const raced = await prisma.enrollmentOffering.findFirst({ where });
      if (!raced) throw err;
      offering = await prisma.enrollmentOffering.update({ where: { id: raced.id }, data });
    }
  }

  await refreshMajorCoursePricing(major.id);

  return offering;
}
