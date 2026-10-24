/**
 * 招生学费价格计算（V11-ENR-01 自 main/hdwebsite_0429 `src/lib/enrollment-pricing.ts` 移植）
 *
 * 移植口径：纯函数逐字对齐 main（normalizeBlankLevel / inheritEnrollmentLevels /
 * formatTotalTuitionPrice / getLowestTotalTuition），无框架依赖，可直接单测对照。
 * - normalizeBlankLevel：空串/"/" 归一为 null（唯一键空值归一化的基础，见 enrollment-sync.ts）
 * - getLowestTotalTuition：active 计划中的最低总学费 + 展示文案（无价 → "--"）
 */

export type EnrollmentLevelInput = {
  schoolName: string;
  level: string | null | undefined;
};

export type EnrollmentLevelOutput<T extends EnrollmentLevelInput> = T & {
  resolvedLevel: string | null;
};

export type EnrollmentPriceInput = {
  majorName: string;
  educationType: string;
  level: string | null;
  partnerName: string;
  totalTuition: number | null;
  hasPrice: boolean;
};

export type LowestTotalTuitionResult = {
  minTotalTuition: number | null;
  displayPrice: string;
  sourcePartnerName: string | null;
  pricedOfferingCount: number;
  unpricedOfferingCount: number;
};

export function normalizeBlankLevel(level: string | null | undefined): string | null {
  const normalized = level?.trim();

  if (!normalized || normalized === "/") {
    return null;
  }

  return normalized;
}

/** 空行层次继承（Excel/表格导入语义）：同校连续行的空层次沿用上一非空值 */
export function inheritEnrollmentLevels<T extends EnrollmentLevelInput>(
  rows: T[],
): EnrollmentLevelOutput<T>[] {
  let currentSchoolName: string | null = null;
  let currentLevel: string | null = null;

  return rows.map((row) => {
    if (row.schoolName !== currentSchoolName) {
      currentSchoolName = row.schoolName;
      currentLevel = null;
    }

    const explicitLevel = normalizeBlankLevel(row.level);

    if (explicitLevel) {
      currentLevel = explicitLevel;
    }

    return {
      ...row,
      resolvedLevel: currentLevel,
    };
  });
}

export function formatTotalTuitionPrice(totalTuition: number | null | undefined): string {
  if (totalTuition === null || totalTuition === undefined) {
    return "--";
  }

  return `¥${Number.isInteger(totalTuition) ? totalTuition : totalTuition.toFixed(2)}`;
}

export function getLowestTotalTuition(
  offerings: EnrollmentPriceInput[],
): LowestTotalTuitionResult {
  const pricedOfferings = offerings.filter(
    (offering) => offering.hasPrice && offering.totalTuition !== null,
  );
  const unpricedOfferingCount = offerings.length - pricedOfferings.length;

  if (pricedOfferings.length === 0) {
    return {
      minTotalTuition: null,
      displayPrice: "--",
      sourcePartnerName: null,
      pricedOfferingCount: 0,
      unpricedOfferingCount,
    };
  }

  const lowest = pricedOfferings.reduce((currentLowest, offering) => {
    if (offering.totalTuition === null) {
      return currentLowest;
    }

    if (currentLowest.totalTuition === null || offering.totalTuition < currentLowest.totalTuition) {
      return offering;
    }

    return currentLowest;
  });

  return {
    minTotalTuition: lowest.totalTuition,
    displayPrice: formatTotalTuitionPrice(lowest.totalTuition),
    sourcePartnerName: lowest.partnerName,
    pricedOfferingCount: pricedOfferings.length,
    unpricedOfferingCount,
  };
}
