"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";

function localeClass(current: boolean, footer: boolean, active: string) {
  if (footer) {
    return current ? "text-foreground" : "hover:text-foreground";
  }
  return current
    ? `inline-flex min-h-9 min-w-9 items-center justify-center rounded-full ${active} px-2.5 py-1 text-foreground`
    : "inline-flex min-h-9 min-w-9 items-center justify-center rounded-full px-2.5 py-1 hover:text-foreground";
}

export function LocaleSwitcher({ variant = "header" }: { variant?: "header" | "footer" }) {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale();
  const pathname = usePathname();
  const footer = variant === "footer";

  return (
    <div
      className={
        footer
          ? "inline-flex flex-wrap items-center gap-2 text-sm"
          : "flex items-center gap-1 text-sm text-muted"
      }
      role="group"
      aria-label={t("label")}
    >
      <Link
        href={pathname}
        locale="en"
        className={localeClass(locale === "en", footer, "bg-peach")}
        aria-current={locale === "en" ? "true" : undefined}
      >
        {t("en")}
      </Link>
      <span aria-hidden="true">·</span>
      <Link
        href={pathname}
        locale="zh-tw"
        className={localeClass(locale === "zh-tw", footer, "bg-mint")}
        aria-current={locale === "zh-tw" ? "true" : undefined}
      >
        {t("zhTW")}
      </Link>
      <span aria-hidden="true">·</span>
      <Link
        href={pathname}
        locale="ja"
        className={localeClass(locale === "ja", footer, "bg-lemon")}
        aria-current={locale === "ja" ? "true" : undefined}
      >
        {t("ja")}
      </Link>
    </div>
  );
}
