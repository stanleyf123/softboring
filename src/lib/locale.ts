import { routing, type AppLocale } from "@/i18n/routing";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

export function assertLocale(locale: string): AppLocale {
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  return locale;
}

export function htmlLang(locale: AppLocale): string {
  if (locale === "zh-tw") {
    return "zh-TW";
  }
  return locale;
}
