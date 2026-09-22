import { routing } from "@/i18n/routing";
import { localizedPath, PUBLIC_SEO_PATHS, type PublicSeoPath } from "@/lib/seo";

/**
 * Paths that must never appear in sitemap.xml.
 * `/account/activity` is a personal desk and stays here.
 * Digest, year, and guidelines are public product pages and are not listed.
 */
export const SITEMAP_BLOCKED_PREFIXES = [
  "/account",
  "/admin",
  "/api",
  "/welcome",
  "/invite",
  "/forgot-password",
  "/reset-password",
  "/thanks/plus",
  "/trends",
  "/wall/saved",
  "/wall/activity",
  "/history/export",
  "/history/compare",
] as const;

/** Locale-prefixed private URLs. Account activity is covered by `/account`. */
export const PRIVATE_LOCALE_PATHS = [
  "/account",
  "/account/activity",
  "/account/snapshot",
  "/welcome",
  "/invite",
  "/forgot-password",
  "/reset-password",
  "/thanks/plus",
  "/trends",
  "/wall/saved",
  "/wall/activity",
  "/history/export",
  "/history/compare",
] as const;

const LOCALE_PREFIX = /^\/(en|zh-tw|ja)(?=\/|$)/;

export function isBlockedSitemapPath(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (/\/zh-TW(?:\/|$)/.test(normalized)) return true;
  const stripped = normalized.replace(LOCALE_PREFIX, "") || "/";
  return SITEMAP_BLOCKED_PREFIXES.some(
    (prefix) => stripped === prefix || stripped.startsWith(`${prefix}/`),
  );
}

export function indexableSeoPaths(
  paths: readonly string[] = PUBLIC_SEO_PATHS,
): string[] {
  return paths.filter((path) => !isBlockedSitemapPath(path));
}

export function sitemapChangeFrequency(
  path: string,
): "weekly" | "monthly" {
  if (path === "/" || path === "/wall" || path === "/digest") return "weekly";
  return "monthly";
}

export function sitemapPriority(path: string) {
  if (path === "/") return 1;
  if (path === "/pricing" || path === "/wall") return 0.8;
  if (path === "/digest" || path === "/year" || path === "/guidelines") return 0.7;
  return 0.6;
}

export function localePrivateDisallow(
  roots: readonly string[],
  locales: readonly string[] = routing.locales,
) {
  const paths = [...roots];
  for (const locale of locales) {
    if (locale !== "en" && locale !== "zh-tw" && locale !== "ja") continue;
    for (const path of PRIVATE_LOCALE_PATHS) {
      paths.push(`/${locale}${path}`);
    }
  }
  return paths;
}

export function publicSitemapUrls(origin: string, paths: readonly string[] = PUBLIC_SEO_PATHS) {
  return indexableSeoPaths(paths).flatMap((path) =>
    routing.locales.map((locale) => `${origin}${localizedPath(locale, path)}`),
  );
}

export function isListedPublicPath(path: PublicSeoPath) {
  return indexableSeoPaths().includes(path);
}
