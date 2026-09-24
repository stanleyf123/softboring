"use client";

import { Link } from "@/i18n/navigation";
import { intentionWeeksAgo } from "@/lib/intention-weeks-ago";
import { COPY_TOAST_MS, copyShareText } from "@/lib/soft-copy-link";
import { SOFT_CHROME_FOCUS } from "@/lib/soft-focus";
import { INTENTION_EXPORT_FILENAME } from "@/lib/soft-intention-export";
import type { SoftIntentionHistoryItem } from "@/lib/soft-intention-history";
import { useHydrated } from "@/lib/use-hydrated";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

type HistoryPayload = {
  history?: SoftIntentionHistoryItem[] | null;
  historyLocked?: boolean;
  weekKey?: string;
};

function IntentionCopy({ text }: { text: string }) {
  const t = useTranslations("SoftIntention");
  const [tone, setTone] = useState<"idle" | "copied" | "error">("idle");
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current != null) window.clearTimeout(timer.current);
    };
  }, []);

  async function onCopy() {
    const clipboard = typeof navigator === "undefined" ? null : navigator.clipboard;
    const ok = await copyShareText(text, clipboard);
    setTone(ok ? "copied" : "error");
    if (timer.current != null) window.clearTimeout(timer.current);
    if (ok) {
      timer.current = window.setTimeout(() => setTone("idle"), COPY_TOAST_MS);
    }
  }

  return (
    <div className="mt-2" data-intention-copy>
      <button
        type="button"
        onClick={() => void onCopy()}
        className={`${SOFT_CHROME_FOCUS} inline-flex min-h-11 items-center rounded-full border border-line bg-paper px-3 py-1.5 text-xs text-muted`}
      >
        {t("historyCopy")}
      </button>
      {tone === "copied" ? (
        <p className="mt-2 text-xs leading-relaxed text-muted" role="status" data-intention-copied>
          {t("historyCopied")}
        </p>
      ) : null}
      {tone === "error" ? (
        <p className="mt-2 text-xs leading-relaxed text-muted" role="alert">
          {t("historyCopyError")}
        </p>
      ) : null}
    </div>
  );
}

function IntentionExport({
  mode,
}: {
  mode: "guest" | "tease" | "download";
}) {
  const t = useTranslations("SoftIntention");

  if (mode === "download") {
    return (
      <div className="mt-5 rounded-[1.25rem] bg-mint/45 px-4 py-4" data-intention-export="download">
        <p className="font-display text-base tracking-tight">{t("exportTitle")}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("exportBody")}</p>
        <a
          href="/api/soft-intentions/export"
          download={INTENTION_EXPORT_FILENAME}
          className={`${SOFT_CHROME_FOCUS} mt-4 inline-flex min-h-11 items-center rounded-full bg-paper px-4 py-2 text-sm shadow-card`}
        >
          {t("exportCta")}
        </a>
      </div>
    );
  }

  if (mode === "guest") {
    return (
      <p className="mt-3 text-sm leading-relaxed text-muted" data-intention-export="guest">
        {t("exportGuestBody")}
      </p>
    );
  }

  return (
    <div className="mt-5 rounded-[1.25rem] bg-blush/40 px-4 py-4" data-intention-export="tease">
      <p className="font-display text-base tracking-tight">{t("exportTeaseTitle")}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{t("exportTeaseBody")}</p>
      <Link
        href="/pricing"
        className={`${SOFT_CHROME_FOCUS} mt-4 inline-flex min-h-11 items-center rounded-full bg-accent px-4 py-2 text-sm text-paper shadow-card`}
      >
        {t("exportTeaseCta")}
      </Link>
    </div>
  );
}

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
  const [weekKey, setWeekKey] = useState<string | null>(null);
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
        if (typeof data.weekKey === "string" && data.weekKey.trim()) {
          setWeekKey(data.weekKey.trim());
        }
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
        <IntentionExport mode="guest" />
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
        <IntentionExport mode="tease" />
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
        <IntentionExport mode="download" />
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
        <IntentionExport mode="download" />
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
            {items.map((item) => {
              const weeks = weekKey ? intentionWeeksAgo(item.weekKey, weekKey) : null;
              return (
                <li
                  key={item.id}
                  className="rounded-[1.25rem] bg-paper/90 px-4 py-3 shadow-card"
                  data-intention-week={item.weekKey}
                  data-intention-ago={weeks ?? "week"}
                >
                  <p className="text-xs text-muted">
                    {weeks === 1
                      ? t("historyLastWeek")
                      : weeks != null
                        ? t("historyWeeksAgo", { count: weeks })
                        : t("weekLabel", { week: item.weekKey })}
                    {weeks != null ? (
                      <span className="ml-2">{t("weekLabel", { week: item.weekKey })}</span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed">“{item.body}”</p>
                  <IntentionCopy text={item.body} />
                </li>
              );
            })}
          </ul>
        </>
      )}
      <IntentionExport mode="download" />
      <p className="mt-4 text-xs leading-relaxed text-muted">{t("historyPrivacy")}</p>
    </section>
  );
}
