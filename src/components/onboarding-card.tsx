"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { SITE_SHELL_CLASS } from "@/lib/site-shell";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { SoftMark } from "./soft-doodles";

const HIDDEN_PATHS = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/privacy",
  "/terms",
  "/history/export",
]);

export function OnboardingCard({
  reviewCount,
  historySeen,
  wallSeen,
  dismissed,
}: {
  reviewCount: number;
  historySeen: boolean;
  wallSeen: boolean;
  dismissed: boolean;
}) {
  const t = useTranslations("Onboarding");
  const pathname = usePathname();
  const [hidden, setHidden] = useState(dismissed);
  const [busy, setBusy] = useState(false);

  if (hidden || HIDDEN_PATHS.has(pathname)) return null;

  const wrote = reviewCount > 0;
  const items = [
    {
      done: wrote,
      title: t("writeTitle"),
      body: t("writeBody"),
      href: "/review" as const,
      cta: t("writeCta"),
    },
    {
      done: historySeen,
      title: t("historyTitle"),
      body: t("historyBody"),
      href: "/history" as const,
      cta: t("historyCta"),
    },
    {
      done: wallSeen,
      title: t("wallTitle"),
      body: t("wallBody"),
      href: "/wall" as const,
      cta: t("wallCta"),
    },
  ];

  async function dismiss() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch("/api/account/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboardingDismissed: true }),
      });
      setHidden(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`${SITE_SHELL_CLASS} mb-8 print:hidden`}>
      <div className="overflow-hidden rounded-[2rem] bg-paper shadow-card">
        <div className="flex items-start justify-between gap-4 bg-mint/70 px-6 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            <SoftMark className="h-10 w-10" />
            <div>
              <p className="font-display text-xl tracking-tight">{t("title")}</p>
              <p className="text-sm text-muted">{t("lead")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            disabled={busy}
            className="shrink-0 text-sm text-muted hover:text-foreground disabled:opacity-60"
          >
            {t("dismiss")}
          </button>
        </div>
        <ol className="space-y-3 px-6 py-6 sm:px-8">
          {items.map((item, index) => (
            <li
              key={item.href}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] bg-peach/40 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-display text-lg tracking-tight">
                  <span className="mr-2 text-sm text-muted">{index + 1}.</span>
                  {item.done ? "✓ " : ""}
                  {item.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{item.body}</p>
              </div>
              <Link
                href={item.href}
                className="rounded-full bg-blush px-4 py-1.5 text-sm shadow-card"
              >
                {item.cta}
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
