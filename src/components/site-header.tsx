"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "./locale-switcher";
import { SoftMark } from "./soft-doodles";

const links = [
  { href: "/", key: "home" as const },
  { href: "/review", key: "review" as const },
  { href: "/history", key: "history" as const },
];

export function SiteHeader() {
  const t = useTranslations("Nav");
  const pathname = usePathname();

  return (
    <header className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-4 px-6 py-6">
      <Link
        href="/"
        className="flex items-center gap-2.5 font-display text-lg tracking-tight text-foreground"
      >
        <SoftMark className="h-9 w-9" />
        {t("brand")}
      </Link>
      <nav className="flex flex-wrap items-center gap-4 rounded-full bg-paper/80 px-4 py-2 text-sm text-muted shadow-card">
        {links.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname === link.href || pathname.startsWith(`${link.href}/`);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={
                active
                  ? "rounded-full bg-peach px-2.5 py-1 text-foreground"
                  : "rounded-full px-2.5 py-1 hover:text-foreground"
              }
            >
              {t(link.key)}
            </Link>
          );
        })}
        <LocaleSwitcher />
      </nav>
    </header>
  );
}
