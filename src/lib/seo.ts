import { routing, type AppLocale } from "@/i18n/routing";
import { publicOrigin } from "@/lib/public-origin";
import type { Metadata } from "next";

export function localeOg(locale: AppLocale) {
  return locale === "zh-tw" ? "zh_TW" : "en_US";
}

export function pageMetadata({
  locale,
  title,
  description,
  path,
  requestUrl = "https://softboring.com/",
}: {
  locale: AppLocale;
  title: string;
  description: string;
  path: string;
  requestUrl?: string;
}): Metadata {
  const origin = publicOrigin(requestUrl);
  const url = `${origin}/${locale}${path === "/" ? "" : path}`;
  const languages: Record<string, string> = {};
  for (const item of routing.locales) {
    languages[item === "zh-tw" ? "zh-TW" : item] =
      `${origin}/${item}${path === "/" ? "" : path}`;
  }

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "Soft Boring Weekly",
      locale: localeOg(locale),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
