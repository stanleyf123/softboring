import { hreflangLanguages, PUBLIC_SEO_PATHS, siteOrigin } from "@/lib/seo";
import { indexableSeoPaths } from "@/lib/seo-index";
import { asMetadataSitemap, buildPublicSitemap } from "@/lib/sitemap-build";
import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

const FALLBACK_ORIGIN = "https://softboring.com";

function safeOrigin() {
  try {
    return siteOrigin();
  } catch {
    return FALLBACK_ORIGIN;
  }
}

/**
 * Wall notes are optional. A missing native module, empty database, or locked
 * file must not take down sitemap.xml.
 */
async function optionalWallNotes() {
  try {
    const { readOptionalSitemapNotes } = await import("@/lib/sitemap-notes");
    return readOptionalSitemapNotes();
  } catch (error) {
    console.error("sitemap notes skipped", error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const entries = buildPublicSitemap({
      origin: safeOrigin(),
      paths: indexableSeoPaths(PUBLIC_SEO_PATHS),
      notes: await optionalWallNotes(),
      languagesFor: hreflangLanguages,
    });
    return asMetadataSitemap(entries);
  } catch (error) {
    console.error("sitemap fell back to public pages", error);
    return asMetadataSitemap(
      buildPublicSitemap({
        origin: FALLBACK_ORIGIN,
        paths: indexableSeoPaths(PUBLIC_SEO_PATHS),
        notes: [],
        languagesFor: hreflangLanguages,
      }),
    );
  }
}
