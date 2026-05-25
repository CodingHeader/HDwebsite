import { prisma } from "@/lib/prisma";
import { getLowestTotalTuition } from "@/lib/enrollment-pricing";

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

  const fallbackCategory = category || await ensureCourseCategory();

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

export async function upsertEnrollmentOffering(input: EnrollmentOfferingInput) {
  const category = await ensureCourseCategory();
  const major = await ensureMajor(input.majorName, category.id);
  const partner = await ensurePartner(input.partnerName, input.partnerLogo);
  const hasPrice = input.totalTuition !== null && input.totalTuition !== undefined;
  const sourceBatch = input.sourceBatch || "26春";
  const educationType = input.educationType || "自考";
  const status = input.status || "active";
  const existing = await prisma.enrollmentOffering.findFirst({
    where: {
      sourceBatch,
      partnerId: partner.id,
      majorId: major.id,
      educationType,
      level: input.level || null,
      majorCode: input.majorCode || null,
    },
  });
  const data = {
    majorId: major.id,
    partnerId: partner.id,
    sourceBatch,
    educationType,
    level: input.level || null,
    majorCode: input.majorCode || null,
    studyForm: input.studyForm || null,
    yearTuition: input.yearTuition ?? null,
    totalTuition: input.totalTuition ?? null,
    feeDetail: input.feeDetail || null,
    extraFeeNote: input.extraFeeNote || null,
    hasPrice,
    status,
    sort: input.sort ?? 0,
  };
  const offering = existing
    ? await prisma.enrollmentOffering.update({ where: { id: existing.id }, data })
    : await prisma.enrollmentOffering.create({ data });

  await refreshMajorCoursePricing(major.id);

  return offering;
}
