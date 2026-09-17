import { routing } from "@/i18n/routing";
import {
  hreflangLanguages,
  localizedPath,
  PUBLIC_SEO_PATHS,
  siteOrigin,
} from "@/lib/seo";
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin();

  return PUBLIC_SEO_PATHS.map((path) => ({
    url: `${origin}${localizedPath(routing.defaultLocale, path)}`,
    lastModified: new Date(),
    changeFrequency: path === "/" || path === "/wall" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path === "/pricing" || path === "/wall" ? 0.8 : 0.6,
    alternates: {
      languages: hreflangLanguages(origin, path),
    },
  }));
}
