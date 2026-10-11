/**
 * seed 中内联的设置键清单（与 prisma/seed.ts seedSettings 保持同步；
 * 由 settings-registry.test.ts 校验其必须 ⊆ Registry，防止双体系漂移）
 */
export const seedSettingKeys = [
  "siteName",
  "siteDescription",
  "siteLogo",
  "topNoticeText",
  "topNoticePhone",
  "contactPhone",
  "contactPhone2",
  "address",
  "seoTitle",
  "seoKeywords",
  "seoDescription",
  "workHours",
];
