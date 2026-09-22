"use client";

import { Link } from "@/i18n/navigation";
import { useHydrated } from "@/lib/use-hydrated";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import {
  GUEST_SPOTLIGHT_INTERVAL_MS,
  rotatingSpotlightIndex,
  type SoftSpotlightPick,
} from "@/lib/wall-spotlight";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

function authorLabel(item: SoftSpotlightPick, someone: string) {
  return item.ownerNickname || item.ownerFallback || someone;
}

export function GuestWallSpotlight({
  items: initialItems = [],
  initialIndex = 0,
}: {
  items?: SoftSpotlightPick[];
  initialIndex?: number;
}) {
  const t = useTranslations("GuestSpotlight");
  const hydrated = useHydrated();
  const reducedMotion = usePrefersReducedMotion();
  const seeded = initialItems.length > 0;
  const [items, setItems] = useState<SoftSpotlightPick[] | null>(seeded ? initialItems : null);
  const [error, setError] = useState(false);
  const [index, setIndex] = useState(() => {
    if (!seeded) return 0;
    const size = initialItems.length;
    const next = Number.isFinite(initialIndex) ? Math.floor(initialIndex) : 0;
    return ((next % size) + size) % size;
  });
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!hydrated || seeded) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/wall/spotlight/guest", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) setError(true);
          return;
        }
        const data = (await response.json()) as { items?: SoftSpotlightPick[] };
        if (cancelled) return;
        const next = Array.isArray(data.items) ? data.items : [];
        setItems(next);
        setIndex(rotatingSpotlightIndex(next.length, Date.now()));
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, seeded]);

  useEffect(() => {
    if (!items || items.length < 2 || reducedMotion || paused) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % items.length);
    }, GUEST_SPOTLIGHT_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [items, reducedMotion, paused]);

  const shell =
    "mt-6 rounded-[1.75rem] bg-paper/90 px-5 py-5 shadow-card sm:px-6";

  if (items === null && !error) {
    return (
      <section
        className={shell}
        aria-labelledby="guest-spotlight-title"
        aria-busy="true"
        data-guest-spotlight="loading"
      >
        <p id="guest-spotlight-title" className="font-display text-lg tracking-tight">
          {t("title")}
        </p>
        <p className="mt-2 text-sm text-muted">{t("loading")}</p>
      </section>
    );
  }

  if (error) {
    return (
      <section
        className={shell}
        aria-labelledby="guest-spotlight-title"
        data-guest-spotlight="error"
      >
        <p id="guest-spotlight-title" className="font-display text-lg tracking-tight">
          {t("title")}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("loadError")}</p>
      </section>
    );
  }

  if (!items || items.length === 0) {
    return (
      <section
        className={shell}
        aria-labelledby="guest-spotlight-title"
        data-guest-spotlight="empty"
      >
        <p id="guest-spotlight-title" className="font-display text-lg tracking-tight">
          {t("title")}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-muted">{t("lead")}</p>
        <p className="mt-3 text-sm leading-relaxed text-muted">{t("empty")}</p>
      </section>
    );
  }

  const item = items[index % items.length] ?? items[0];
  const motion = reducedMotion ? "still" : paused ? "paused" : "move";

  return (
    <section
      className={shell}
      aria-labelledby="guest-spotlight-title"
      data-guest-spotlight="card"
      data-guest-motion={motion}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <p id="guest-spotlight-title" className="font-display text-lg tracking-tight">
        {t("title")}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-muted">{t("lead")}</p>
      <article
        className="mt-4 rounded-[1.35rem] bg-cream/80 px-4 py-4"
        aria-label={t("cardAria")}
      >
        <p className="text-xs uppercase tracking-wide text-muted">
          <span className="rounded-full bg-blush/80 px-2 py-0.5">
            {item.reason === "pinned" ? t("reasonPinned") : t("reasonPraise")}
          </span>
        </p>
        <p className="mt-3 text-sm leading-relaxed">{item.excerpt.trim() || t("aNote")}</p>
        <p className="mt-3 text-xs text-muted">
          {t("byAuthor", { name: authorLabel(item, t("someone")) })}
          {item.praiseCount > 0 ? ` · ${t("praise", { count: item.praiseCount })}` : ""}
        </p>
      </article>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {items.length > 1 ? (
          <button
            type="button"
            onClick={() => setIndex((current) => (current + 1) % items.length)}
            className="inline-flex min-h-11 items-center rounded-full bg-peach px-4 py-2 text-sm shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            aria-label={t("nextAria")}
          >
            {t("next")}
          </button>
        ) : null}
        <p className="text-xs text-muted">
          {t("position", { current: (index % items.length) + 1, total: items.length })}
        </p>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted">{t("plusHint")}</p>
      <Link
        href="/pricing"
        className="mt-3 inline-flex min-h-11 items-center rounded-full bg-mint px-4 py-2 text-sm shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {t("plusCta")}
      </Link>
    </section>
  );
}
