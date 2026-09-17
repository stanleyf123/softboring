import { siteOrigin } from "@/lib/seo";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/account"],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
