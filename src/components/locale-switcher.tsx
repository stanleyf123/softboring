"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";

export function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <div
      className="flex items-center gap-1 text-sm text-muted"
      role="group"
      aria-label={t("label")}
    >
      <Link
        href={pathname}
        locale="en"
        className={
          locale === "en"
            ? "inline-flex min-h-9 min-w-9 items-center justify-center rounded-full bg-peach px-2.5 py-1 text-foreground"
            : "inline-flex min-h-9 min-w-9 items-center justify-center rounded-full px-2.5 py-1 hover:text-foreground"
        }
      >
        {t("en")}
      </Link>
      <span aria-hidden="true">·</span>
      <Link
        href={pathname}
        locale="zh-tw"
        className={
          locale === "zh-tw"
            ? "inline-flex min-h-9 min-w-9 items-center justify-center rounded-full bg-mint px-2.5 py-1 text-foreground"
            : "inline-flex min-h-9 min-w-9 items-center justify-center rounded-full px-2.5 py-1 hover:text-foreground"
        }
      >
        {t("zhTW")}
      </Link>
      <span aria-hidden="true">·</span>
      <Link
        href={pathname}
        locale="ja"
        className={
          locale === "ja"
            ? "inline-flex min-h-9 min-w-9 items-center justify-center rounded-full bg-lemon px-2.5 py-1 text-foreground"
            : "inline-flex min-h-9 min-w-9 items-center justify-center rounded-full px-2.5 py-1 hover:text-foreground"
        }
      >
        {t("ja")}
      </Link>
    </div>
  );
}
