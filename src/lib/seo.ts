import { routing, type AppLocale } from "@/i18n/routing";
import { publicOrigin } from "@/lib/public-origin";
import type { Metadata } from "next";

export const SITE_NAME = "Soft Boring Weekly";
export const DEFAULT_SITE_URL = "https://softboring.com";

/** Public marketing URLs that should appear in sitemap.xml (locale prefix added later). */
export const PUBLIC_SEO_PATHS = [
  "/",
  "/pricing",
  "/wall",
  "/review",
  "/history",
  "/login",
  "/register",
  "/privacy",
  "/terms",
  "/guidelines",
  "/thanks",
  "/digest",
  "/year",
] as const;

export type PublicSeoPath = (typeof PUBLIC_SEO_PATHS)[number];

export function siteOrigin(siteUrl = process.env.SITE_URL): string {
  return publicOrigin(`${DEFAULT_SITE_URL}/`, siteUrl);
}

export function localizedPath(locale: AppLocale, path: string) {
  return `/${locale}${path === "/" ? "" : path}`;
}

export function localeOg(locale: AppLocale) {
  if (locale === "zh-tw") return "zh_TW";
  if (locale === "ja") return "ja_JP";
  return "en_US";
}

export function hreflangTag(locale: AppLocale) {
  if (locale === "zh-tw") return "zh-TW";
  return locale;
}

export function hreflangLanguages(origin: string, path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const item of routing.locales) {
    languages[hreflangTag(item)] = `${origin}${localizedPath(item, path)}`;
  }
  languages["x-default"] = `${origin}${localizedPath(routing.defaultLocale, path)}`;
  return languages;
}

export function verificationMetadata(): Pick<Metadata, "verification"> {
  const google = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  const bing = process.env.BING_SITE_VERIFICATION?.trim();
  if (!google && !bing) return {};

  return {
    verification: {
      ...(google ? { google } : {}),
      ...(bing ? { other: { "msvalidate.01": bing } } : {}),
    },
  };
}

export function pageMetadata({
  locale,
  title,
  description,
  path,
  requestUrl = `${DEFAULT_SITE_URL}/`,
  noIndex = false,
  socialPath,
  image,
}: {
  locale: AppLocale;
  title: string;
  description: string;
  path: string;
  requestUrl?: string;
  noIndex?: boolean;
  /** Share URL when it should differ from the canonical path. */
  socialPath?: string;
  /** Replaces the default locale OG card. Pass a path or absolute URL. */
  image?: { url: string; alt?: string; width?: number; height?: number };
}): Metadata {
  const origin = publicOrigin(requestUrl);
  const url = `${origin}${localizedPath(locale, path)}`;
  const socialUrl = socialPath
    ? `${origin}${localizedPath(locale, socialPath)}`
    : url;
  const languages = hreflangLanguages(origin, path);
  const ogImage = resolvePageImage(origin, locale, title, image);

  return {
    metadataBase: new URL(origin),
    title,
    description,
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    alternates: {
      canonical: url,
      languages,
    },
    openGraph: {
      title,
      description,
      url: socialUrl,
      siteName: SITE_NAME,
      locale: localeOg(locale),
      alternateLocale: routing.locales
        .filter((item) => item !== locale)
        .map((item) => localeOg(item)),
      type: "website",
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage.url],
    },
  };
}

function resolvePageImage(
  origin: string,
  locale: AppLocale,
  title: string,
  image?: { url: string; alt?: string; width?: number; height?: number },
) {
  if (!image) {
    return {
      url: `${origin}${localizedPath(locale, "/opengraph-image")}`,
      width: 1200,
      height: 630,
      alt: title,
    };
  }
  const raw = image.url.trim();
  const absolute =
    raw.startsWith("https://") || raw.startsWith("http://")
      ? raw
      : `${origin}${raw.startsWith("/") ? raw : localizedPath(locale, raw)}`;
  return {
    url: absolute,
    width: image.width ?? 1200,
    height: image.height ?? 630,
    alt: image.alt?.trim() || title,
  };
}

export function siteJsonLd(origin = siteOrigin()) {
  const logo = `${origin}/icons/icon-512.png`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${origin}/#organization`,
        name: SITE_NAME,
        url: origin,
        logo: {
          "@type": "ImageObject",
          url: logo,
        },
      },
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        name: SITE_NAME,
        url: origin,
        inLanguage: ["en", "zh-TW", "ja"],
        publisher: { "@id": `${origin}/#organization` },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${origin}/#app`,
        name: SITE_NAME,
        url: origin,
        applicationCategory: "ProductivityApplication",
        operatingSystem: "Web",
        description:
          "A gentle weekly review. Six small questions, once a week — not a to-do list.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          name: "Free",
        },
      },
    ],
  };
}
