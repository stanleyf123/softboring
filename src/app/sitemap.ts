import { routing } from "@/i18n/routing";
import {
  hreflangLanguages,
  localizedPath,
  PUBLIC_SEO_PATHS,
  siteOrigin,
} from "@/lib/seo";
import {
  indexableSeoPaths,
  sitemapChangeFrequency,
  sitemapPriority,
} from "@/lib/seo-index";
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin();

  return indexableSeoPaths(PUBLIC_SEO_PATHS).map((path) => ({
    url: `${origin}${localizedPath(routing.defaultLocale, path)}`,
    lastModified: new Date(),
    changeFrequency: sitemapChangeFrequency(path),
    priority: sitemapPriority(path),
    alternates: {
      languages: hreflangLanguages(origin, path),
    },
  }));
}
