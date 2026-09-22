"use client";

import { usePathname } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { rewriteLocalePath } from "@/lib/locale-path";
import { SOFT_CHROME_FOCUS } from "@/lib/soft-focus";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

function localeClass(current: boolean, footer: boolean, active: string) {
  const focus = SOFT_CHROME_FOCUS;
  if (footer) {
    return current
      ? `inline-flex min-h-11 items-center gap-1.5 rounded-full ${active} px-3 py-1.5 text-sm text-foreground shadow-card ${focus}`
      : `inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line/80 bg-paper/80 px-3 py-1.5 text-sm text-muted hover:text-foreground ${focus}`;
  }
  return current
    ? `inline-flex min-h-9 min-w-9 items-center justify-center rounded-full ${active} px-2.5 py-1 text-foreground ${focus}`
    : `inline-flex min-h-9 min-w-9 items-center justify-center rounded-full px-2.5 py-1 hover:text-foreground ${focus}`;
}

export function LocaleSwitcher({ variant = "header" }: { variant?: "header" | "footer" }) {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale();
  const pathname = usePathname();
  const footer = variant === "footer";
  const [extra, setExtra] = useState("");

  useEffect(() => {
    setExtra(`${window.location.search}${window.location.hash}`);
  }, [pathname]);

  const hrefFor = (next: AppLocale) => rewriteLocalePath(`${pathname || "/"}${extra}`, next);

  return (
    <div
      className={
        footer
          ? "inline-flex flex-wrap items-center gap-2 text-sm"
          : "flex items-center gap-1 text-sm text-muted"
      }
      role="group"
      aria-label={t("label")}
      data-locale-switcher={variant}
    >
      <a
        href={hrefFor("en")}
        hrefLang="en"
        lang="en"
        data-locale="en"
        className={localeClass(locale === "en", footer, "bg-peach")}
        aria-current={locale === "en" ? "true" : undefined}
        title={t("enName")}
      >
        <span>{t("en")}</span>
        {footer ? <span>{t("enName")}</span> : null}
      </a>
      <span aria-hidden="true">·</span>
      <a
        href={hrefFor("zh-tw")}
        hrefLang="zh-Hant"
        lang="zh-Hant"
        data-locale="zh-tw"
        className={localeClass(locale === "zh-tw", footer, "bg-mint")}
        aria-current={locale === "zh-tw" ? "true" : undefined}
        title={t("zhName")}
      >
        <span>{t("zhTW")}</span>
        {footer ? <span>{t("zhName")}</span> : null}
      </a>
      <span aria-hidden="true">·</span>
      <a
        href={hrefFor("ja")}
        hrefLang="ja"
        lang="ja"
        data-locale="ja"
        className={localeClass(locale === "ja", footer, "bg-lemon")}
        aria-current={locale === "ja" ? "true" : undefined}
        title={t("jaName")}
      >
        <span>{t("ja")}</span>
        {footer ? <span>{t("jaName")}</span> : null}
      </a>
    </div>
  );
}
