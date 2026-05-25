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
