import type { MetadataRoute } from "next";

const domain = process.env.APP_DOMAIN ?? "www.hd1994.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/manager", "/api"] }],
    sitemap: `https://${domain}/sitemap.xml`,
  };
}
