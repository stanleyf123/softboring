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
            ? "rounded-full bg-peach px-2.5 py-1 text-foreground"
            : "rounded-full px-2.5 py-1 hover:text-foreground"
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
            ? "rounded-full bg-mint px-2.5 py-1 text-foreground"
            : "rounded-full px-2.5 py-1 hover:text-foreground"
        }
      >
        {t("zhTW")}
      </Link>
    </div>
  );
}
