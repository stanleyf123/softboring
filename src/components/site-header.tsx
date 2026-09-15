"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "./locale-switcher";

const links = [
  { href: "/", key: "home" as const },
  { href: "/review", key: "review" as const },
  { href: "/history", key: "history" as const },
];

export function SiteHeader() {
  const t = useTranslations("Nav");
  const pathname = usePathname();

  return (
    <header className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-4 px-6 py-8">
      <Link
        href="/"
        className="font-display text-lg tracking-tight text-foreground"
      >
        {t("brand")}
      </Link>
      <nav className="flex flex-wrap items-center gap-5 text-sm text-muted">
        {links.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname === link.href || pathname.startsWith(`${link.href}/`);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={active ? "text-foreground" : "hover:text-foreground"}
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
