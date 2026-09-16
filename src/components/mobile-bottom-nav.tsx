"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

const items = [
  { href: "/", key: "home" as const, icon: HomeIcon },
  { href: "/review", key: "review" as const, icon: ReviewIcon },
  { href: "/history", key: "history" as const, icon: HistoryIcon },
  { href: "/wall", key: "wall" as const, icon: WallIcon },
] as const;

function itemActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNav({ email }: { email: string | null }) {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const authHref = email ? "/account" : "/login";
  const authKey = email ? ("account" as const) : ("login" as const);
  const authActive = pathname === authHref || pathname.startsWith(`${authHref}/`);

  return (
    <nav
      data-bottom-nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line/80 bg-paper/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 shadow-soft backdrop-blur-md md:hidden print:hidden"
      aria-label={t("memberNav")}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {items.map((item) => {
          const active = itemActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1 text-[11px] ${
                  active ? "bg-peach text-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{t(item.key)}</span>
              </Link>
            </li>
          );
        })}
        <li className="flex-1">
          <Link
            href={authHref}
            aria-current={authActive ? "page" : undefined}
            className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1 text-[11px] ${
              authActive ? "bg-blush text-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            <AccountIcon className="h-5 w-5" />
            <span>{t(authKey)}</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4.5 11.5 12 5l7.5 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-4v-5h-4v5H6A1.5 1.5 0 0 1 4.5 19v-7.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ReviewIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="4" width="14" height="16" rx="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8.5 9h7M8.5 12.5h7M8.5 16h4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="7.25" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 8.5V12l2.5 1.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function WallIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4.5" y="5.5" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
      <rect x="12.5" y="8.5" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
      <rect x="7" y="13" width="6.5" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function AccountIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="9" r="3.2" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M6.5 18.5c1.2-2.6 3.1-3.8 5.5-3.8s4.3 1.2 5.5 3.8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
