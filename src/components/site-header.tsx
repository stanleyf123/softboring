"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { SITE_SHELL_CLASS } from "@/lib/site-shell";
import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "./locale-switcher";
import { NotificationBell } from "./notification-bell";
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
  unreadNotifications = 0,
}: {
  email: string | null;
  softPlus: boolean;
  unreadNotifications?: number;
}) {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const authHref = email ? "/account" : "/login";
  const authKey = email ? ("account" as const) : ("login" as const);
  const authActive =
    pathname === authHref || pathname.startsWith(`${authHref}/`);
  const trendsActive = pathname === "/trends" || pathname.startsWith("/trends/");
  const digestActive = pathname === "/digest" || pathname.startsWith("/digest/");

  return (
    <header className={`${SITE_SHELL_CLASS} py-4 md:py-5 print:hidden`}>
      <div className="flex items-center justify-between gap-3 rounded-[1.75rem] bg-paper/90 px-3 py-2 shadow-card backdrop-blur-sm md:gap-4 md:rounded-full md:px-5">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 font-display text-lg tracking-tight text-foreground"
        >
          <SoftMark className="h-9 w-9" />
          {t("brand")}
        </Link>
        <div className="flex min-w-0 items-center justify-end gap-2">
          {email ? (
            <div className="md:hidden">
              <NotificationBell unreadCount={unreadNotifications} />
            </div>
          ) : null}
          <div className="md:hidden">
            <LocaleSwitcher />
          </div>
          <nav
            className="hidden flex-wrap items-center justify-end gap-1 text-sm text-muted md:flex lg:gap-1.5"
            aria-label={t("mainNav")}
          >
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
            {softPlus ? (
              <Link
                href="/digest"
                className={
                  digestActive
                    ? "rounded-full bg-lemon px-2.5 py-1 text-foreground"
                    : "rounded-full px-2.5 py-1 hover:text-foreground"
                }
              >
                {t("digest")}
              </Link>
            ) : null}
            {email ? <NotificationBell unreadCount={unreadNotifications} /> : null}
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
        </div>
      </div>
    </header>
  );
}
