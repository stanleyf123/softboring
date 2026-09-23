"use client";

import { Link } from "@/i18n/navigation";
import { SOFT_CHROME_FOCUS } from "@/lib/soft-focus";
import type { SoftIntentionHistoryItem } from "@/lib/soft-intention-history";
import { useHydrated } from "@/lib/use-hydrated";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type HistoryPayload = {
  history?: SoftIntentionHistoryItem[] | null;
  historyLocked?: boolean;
};

function isHistoryItem(value: unknown): value is SoftIntentionHistoryItem {
  if (!value || typeof value !== "object") return false;
  const item = value as SoftIntentionHistoryItem;
  return (
    typeof item.id === "string" &&
    typeof item.weekKey === "string" &&
    typeof item.body === "string" &&
    typeof item.updatedAt === "string"
  );
}

export function SoftIntentionHistory({
  signedIn,
  softPlus,
  variant = "review",
}: {
  signedIn: boolean;
  softPlus: boolean;
  variant?: "review" | "account";
}) {
  const t = useTranslations("SoftIntention");
  const hydrated = useHydrated();
  const [items, setItems] = useState<SoftIntentionHistoryItem[] | null>(null);
  const [locked, setLocked] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!hydrated || !signedIn || !softPlus) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/soft-intentions", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) setLoadError(true);
          return;
        }
        const data = (await response.json()) as HistoryPayload;
        if (cancelled) return;
        if (data.historyLocked || !Array.isArray(data.history)) {
          setLocked(true);
          return;
        }
        setItems(data.history.filter(isHistoryItem));
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, signedIn, softPlus]);

  const shell =
    variant === "account"
      ? "mt-8 rounded-[1.5rem] bg-cream/80 px-5 py-5"
      : "rounded-[1.75rem] bg-cream/70 px-6 py-6 shadow-card sm:px-8";
  const nextPath = variant === "account" ? "/account" : "/review";

  if (!signedIn) {
    return (
      <section
        className={shell}
        data-intention-history="guest"
        aria-labelledby="intention-history-title"
      >
        <p className="text-sm text-accent">{t("plusKicker")}</p>
        <p id="intention-history-title" className="mt-1 font-display text-lg tracking-tight">
          {t("historyTitle")}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("historyGuestBody")}</p>
        <Link
          href={{ pathname: "/login", query: { next: nextPath } }}
          className={`${SOFT_CHROME_FOCUS} mt-4 inline-flex min-h-11 items-center rounded-full border border-line px-4 py-2 text-sm text-muted`}
        >
          {t("loginCta")}
        </Link>
      </section>
    );
  }

  if (!softPlus || locked) {
    return (
      <section
        className={shell}
        data-intention-history="tease"
        aria-labelledby="intention-history-title"
      >
        <p className="text-sm text-accent">{t("plusKicker")}</p>
        <p id="intention-history-title" className="mt-1 font-display text-lg tracking-tight">
          {t("historyTeaseTitle")}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("historyTeaseBody")}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("historyPrivacy")}</p>
        <Link
          href="/pricing"
          className={`${SOFT_CHROME_FOCUS} mt-4 inline-flex min-h-11 items-center rounded-full bg-accent px-4 py-2 text-sm text-paper shadow-card`}
        >
          {t("historyTeaseCta")}
        </Link>
      </section>
    );
  }

  if (!hydrated || (items === null && !loadError)) {
    return (
      <section
        className={shell}
        data-intention-history="loading"
        aria-labelledby="intention-history-title"
        aria-busy="true"
      >
        <p id="intention-history-title" className="font-display text-lg tracking-tight">
          {t("historyTitle")}
        </p>
        <p className="mt-2 text-sm text-muted">{t("historyLoading")}</p>
      </section>
    );
  }

  if (loadError || !items) {
    return (
      <section
        className={shell}
        data-intention-history="error"
        aria-labelledby="intention-history-title"
      >
        <p id="intention-history-title" className="font-display text-lg tracking-tight">
          {t("historyTitle")}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("historyError")}</p>
      </section>
    );
  }

  return (
    <section
      className={shell}
      data-intention-history="open"
      aria-labelledby="intention-history-title"
    >
      <p className="text-sm text-accent">{t("plusKicker")}</p>
      <p id="intention-history-title" className="mt-1 font-display text-lg tracking-tight">
        {t("historyTitle")}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{t("historyLead")}</p>
      {items.length === 0 ? (
        <div className="mt-4" data-intention-history-empty>
          <p className="text-sm leading-relaxed text-muted">{t("historyEmpty")}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">{t("historyEmptyHint")}</p>
        </div>
      ) : (
        <>
          <p className="mt-4 text-xs text-muted">{t("historyCount", { count: items.length })}</p>
          <ul className="mt-3 space-y-3" aria-label={t("historyAria")} data-intention-history-list>
            {items.map((item) => (
              <li
                key={item.id}
                className="rounded-[1.25rem] bg-paper/90 px-4 py-3 shadow-card"
                data-intention-week={item.weekKey}
              >
                <p className="text-xs text-muted">{t("weekLabel", { week: item.weekKey })}</p>
                <p className="mt-1 text-sm leading-relaxed">“{item.body}”</p>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="mt-4 text-xs leading-relaxed text-muted">{t("historyPrivacy")}</p>
    </section>
  );
}
