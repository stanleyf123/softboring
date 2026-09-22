"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { SITE_SHELL_CLASS } from "@/lib/site-shell";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { SoftMark } from "./soft-doodles";

/** Soft checklist only on home + account — not naggy across the app. */
const VISIBLE_PATHS = new Set(["/", "/account"]);

type ChecklistItem = {
  id: string;
  done: boolean;
  title: string;
  body: string;
  href: "/account" | "/review" | "/wall";
  cta: string;
};

export function OnboardingCard({
  reviewCount,
  historySeen: _historySeen,
  wallSeen,
  dismissed,
  softPlus = false,
  hasNickname = false,
  hasInvite = false,
}: {
  reviewCount: number;
  historySeen: boolean;
  wallSeen: boolean;
  dismissed: boolean;
  softPlus?: boolean;
  hasNickname?: boolean;
  hasInvite?: boolean;
}) {
  const t = useTranslations("Onboarding");
  const pathname = usePathname();
  const [hidden, setHidden] = useState(dismissed);
  const [busy, setBusy] = useState(false);

  if (hidden || !VISIBLE_PATHS.has(pathname)) return null;

  const wrote = reviewCount > 0;
  const items: ChecklistItem[] = [
    {
      id: "nickname",
      done: hasNickname,
      title: t("nicknameTitle"),
      body: t("nicknameBody"),
      href: "/account",
      cta: t("nicknameCta"),
    },
    {
      id: "write",
      done: wrote,
      title: t("writeTitle"),
      body: t("writeBody"),
      href: "/review",
      cta: t("writeCta"),
    },
    {
      id: "wall",
      done: wallSeen,
      title: t("wallTitle"),
      body: t("wallBody"),
      href: "/wall",
      cta: t("wallCta"),
    },
  ];

  if (softPlus) {
    items.push({
      id: "invite",
      done: hasInvite,
      title: t("inviteTitle"),
      body: t("inviteBody"),
      href: "/account",
      cta: t("inviteCta"),
    });
  }

  // Quietly tuck away once every soft step is done — no nag.
  if (items.every((item) => item.done)) return null;

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
    <section className={`${SITE_SHELL_CLASS} mb-8 print:hidden`} data-onboarding>
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
              key={item.id}
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
              {!item.done ? (
                <Link
                  href={item.href}
                  className="rounded-full bg-blush px-4 py-1.5 text-sm shadow-card"
                >
                  {item.cta}
                </Link>
              ) : (
                <span className="rounded-full bg-mint/80 px-4 py-1.5 text-sm text-muted">
                  {t("done")}
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
