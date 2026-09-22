"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { SITE_SHELL_CLASS } from "@/lib/site-shell";
import { useHydrated } from "@/lib/use-hydrated";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { SoftMark } from "./soft-doodles";

/** Soft checklist only on home + account — not naggy across the app. */
const VISIBLE_PATHS = new Set(["/", "/account"]);

const DISMISS_KEY = "softboring-onboarding-dismissed";
const PROGRESS_KEY = "softboring-onboarding-progress";

type ChecklistHref = "/account" | "/review" | "/wall";

type ChecklistItem = {
  id: string;
  done: boolean;
  title: string;
  body: string;
  href: ChecklistHref;
  hash?: string;
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
  timezoneSet = false,
}: {
  reviewCount: number;
  historySeen: boolean;
  wallSeen: boolean;
  dismissed: boolean;
  softPlus?: boolean;
  hasNickname?: boolean;
  hasInvite?: boolean;
  timezoneSet?: boolean;
}) {
  const t = useTranslations("Onboarding");
  const pathname = usePathname();
  const hydrated = useHydrated();
  const [dismissedNow, setDismissedNow] = useState(false);
  const [busy, setBusy] = useState(false);

  let storedDismissed = false;
  if (hydrated) {
    try {
      storedDismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      storedDismissed = false;
    }
  }
  const hidden = dismissed || dismissedNow || storedDismissed;

  useEffect(() => {
    try {
      localStorage.setItem(
        PROGRESS_KEY,
        JSON.stringify({
          write: reviewCount > 0,
          nickname: hasNickname,
          timezone: timezoneSet,
          wall: wallSeen,
          history: _historySeen,
        }),
      );
      if (dismissed) localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Private mode can refuse storage; the server flag still holds.
    }
  }, [dismissed, hasNickname, reviewCount, timezoneSet, wallSeen]);

  if (hidden || !VISIBLE_PATHS.has(pathname)) return null;

  const wrote = reviewCount > 0;
  const items: ChecklistItem[] = [
    {
      id: "write",
      done: wrote,
      title: t("writeTitle"),
      body: t("writeBody"),
      href: "/review",
      cta: t("writeCta"),
    },
    {
      id: "nickname",
      done: hasNickname,
      title: t("nicknameTitle"),
      body: t("nicknameBody"),
      href: "/account",
      cta: t("nicknameCta"),
    },
    {
      id: "timezone",
      done: timezoneSet,
      title: t("timezoneTitle"),
      body: t("timezoneBody"),
      href: "/account",
      hash: "member-timezone",
      cta: t("timezoneCta"),
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
      try {
        localStorage.setItem(DISMISS_KEY, "1");
      } catch {
        // Server flag is the durable copy.
      }
      await fetch("/api/account/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboardingDismissed: true }),
      });
      setDismissedNow(true);
    } finally {
      setBusy(false);
    }
  }

  const doneCount = items.filter((item) => item.done).length;

  return (
    <section className={`${SITE_SHELL_CLASS} mb-8 print:hidden`} data-onboarding>
      <div className="overflow-hidden rounded-[2rem] bg-paper shadow-card">
        <div className="flex items-start justify-between gap-4 bg-mint/70 px-6 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            <SoftMark className="h-10 w-10" />
            <div>
              <p className="font-display text-xl tracking-tight">{t("title")}</p>
              <p className="text-sm text-muted">{t("lead")}</p>
              <p className="mt-1 text-xs text-muted">
                {t("progress", { done: doneCount, total: items.length })}
              </p>
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
              data-onboarding-step={item.id}
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
                  href={
                    item.hash ? { pathname: item.href, hash: item.hash } : item.href
                  }
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
