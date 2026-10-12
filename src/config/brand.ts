/**
 * 品牌出厂默认值（ADR-010 弘道教育）——全站唯一的品牌联系方式/域名常量出处。
 * 业务代码一律读 Setting（settings-registry 以这里为默认值）或 appOrigin()，不得在 src/lib 内硬编码（P06）。
 */
export const BRAND_DEFAULTS = {
  contactPhone: "400-001-5729",
  siteDomain: "www.hd1994.com",
  emailFrom: "弘道教育 <noreply@hd1994.com>",
} as const;

export const BRAND_SITE_URL = `https://${BRAND_DEFAULTS.siteDomain}`;
