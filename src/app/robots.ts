import { siteOrigin } from "@/lib/seo";
import { localePrivateDisallow } from "@/lib/seo-index";
import type { MetadataRoute } from "next";

const PRIVATE_ROOTS = ["/admin", "/api/", "/account"];

export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: localePrivateDisallow(PRIVATE_ROOTS),
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
