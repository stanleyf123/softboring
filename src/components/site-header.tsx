"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "./locale-switcher";
import { SoftMark } from "./soft-doodles";

const links = [
  { href: "/", key: "home" as const },
  { href: "/review", key: "review" as const },
  { href: "/history", key: "history" as const },
  { href: "/wall", key: "wall" as const },
  { href: "/pricing", key: "pricing" as const },
];

export function SiteHeader({
  email,
  softPlus,
}: {
  email: string | null;
  softPlus: boolean;
}) {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const authHref = email ? "/account" : "/login";
  const authKey = email ? ("account" as const) : ("login" as const);
  const authActive =
    pathname === authHref || pathname.startsWith(`${authHref}/`);
  const trendsActive = pathname === "/trends" || pathname.startsWith("/trends/");

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
        {softPlus ? (
          <Link
            href="/trends"
            className={
              trendsActive
                ? "rounded-full bg-mint px-2.5 py-1 text-foreground"
                : "rounded-full px-2.5 py-1 hover:text-foreground"
            }
          >
            {t("trends")}
          </Link>
        ) : null}
        <Link
          href={authHref}
          className={
            authActive
              ? "rounded-full bg-blush px-2.5 py-1 text-foreground"
              : "rounded-full px-2.5 py-1 hover:text-foreground"
          }
        >
          {t(authKey)}
        </Link>
        <LocaleSwitcher />
      </nav>
    </header>
  );
}
