import type { MetadataRoute } from "next";
import { BRAND_DEFAULTS } from "@/config/brand";

const domain = process.env.APP_DOMAIN ?? BRAND_DEFAULTS.siteDomain;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/manager", "/api"] }],
    sitemap: `https://${domain}/sitemap.xml`,
  };
}
