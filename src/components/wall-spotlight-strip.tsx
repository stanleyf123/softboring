"use client";

import { DemoNeighborBadge } from "@/components/demo-neighbor-badge";
import { Link } from "@/i18n/navigation";
import { useHydrated } from "@/lib/use-hydrated";
import type { SoftSpotlightPick } from "@/lib/wall-spotlight";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

function authorLabel(item: SoftSpotlightPick, someone: string) {
  return item.ownerNickname || item.ownerFallback || someone;
}

export function WallSpotlightStrip({ softPlus }: { softPlus: boolean }) {
  const t = useTranslations("WallSpotlight");
  const hydrated = useHydrated();
  const [items, setItems] = useState<SoftSpotlightPick[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!hydrated || !softPlus) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/wall/spotlight?limit=5", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) setError(true);
          return;
        }
        const data = (await response.json()) as { items: SoftSpotlightPick[] };
        if (!cancelled) setItems(data.items);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, softPlus]);

  if (!softPlus) return null;

  if (!hydrated || (items === null && !error)) {
    return (
      <section
        className="rounded-[1.75rem] bg-paper/90 px-5 py-5 shadow-card sm:px-6"
        aria-labelledby="wall-spotlight-title"
        aria-busy="true"
      >
        <p id="wall-spotlight-title" className="font-display text-lg tracking-tight">
          {t("title")}
        </p>
        <p className="mt-2 text-sm text-muted">{t("loading")}</p>
      </section>
    );
  }

  if (error) {
    return (
      <section
        className="rounded-[1.75rem] bg-paper/90 px-5 py-5 shadow-card sm:px-6"
        aria-labelledby="wall-spotlight-title"
      >
        <p id="wall-spotlight-title" className="font-display text-lg tracking-tight">
          {t("title")}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("loadError")}</p>
      </section>
    );
  }

  if (!items || items.length === 0) {
    return (
      <section
        className="rounded-[1.75rem] bg-paper/90 px-5 py-5 shadow-card sm:px-6"
        aria-labelledby="wall-spotlight-title"
      >
        <p id="wall-spotlight-title" className="font-display text-lg tracking-tight">
          {t("title")}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-muted">{t("lead")}</p>
        <p className="mt-3 text-sm leading-relaxed text-muted">{t("empty")}</p>
      </section>
    );
  }

  return (
    <section
      className="rounded-[1.75rem] bg-paper/90 px-5 py-5 shadow-card sm:px-6"
      aria-labelledby="wall-spotlight-title"
    >
      <div>
        <p id="wall-spotlight-title" className="font-display text-lg tracking-tight">
          {t("title")}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-muted">{t("lead")}</p>
      </div>
      <ul className="mt-4 flex gap-3 overflow-x-auto pb-1" aria-label={t("listAria")}>
        {items.map((item) => (
          <li
            key={item.noteId}
            className="min-w-[14rem] max-w-[16rem] shrink-0 rounded-[1.35rem] bg-cream/80 px-4 py-4"
          >
            <p className="text-xs uppercase tracking-wide text-muted">
              {item.reason === "pinned" ? t("reasonPinned") : t("reasonPraise")}
            </p>
            <p className="mt-2 text-sm leading-relaxed">
              {item.excerpt.trim() || t("aNote")}
            </p>
            <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
              <span>
                {t("byAuthor", { name: authorLabel(item, t("someone")) })}
                {item.praiseCount > 0
                  ? ` · ${t("praise", { count: item.praiseCount })}`
                  : ""}
              </span>
              {item.ownerIsDemo ? <DemoNeighborBadge /> : null}
            </p>
            <Link
              href={`/wall?note=${encodeURIComponent(item.noteId)}`}
              className="mt-3 inline-block text-sm text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {t("open")}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
