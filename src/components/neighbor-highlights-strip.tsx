"use client";

import { Link } from "@/i18n/navigation";
import { useHydrated } from "@/lib/use-hydrated";
import type { NeighborHighlight } from "@/lib/neighbor-highlights";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

function authorName(item: NeighborHighlight, someone: string) {
  return item.nickname?.trim() || someone;
}

export function NeighborHighlightsStrip({
  softPlus,
  refreshToken = 0,
  onOpen,
}: {
  softPlus: boolean;
  refreshToken?: number;
  onOpen?: (noteId: string) => void;
}) {
  const t = useTranslations("NeighborHighlights");
  const hydrated = useHydrated();
  const [items, setItems] = useState<NeighborHighlight[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!hydrated || !softPlus) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/wall/highlights", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) setError(true);
          return;
        }
        const data = (await response.json()) as { items?: NeighborHighlight[] };
        if (!cancelled) {
          setError(false);
          setItems(Array.isArray(data.items) ? data.items : []);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, softPlus, refreshToken]);

  if (!softPlus) return null;

  if (!hydrated || (items === null && !error)) {
    return (
      <section
        className="rounded-[1.75rem] bg-blush/40 px-5 py-5 shadow-card sm:px-6"
        aria-labelledby="neighbor-highlights-title"
        aria-busy="true"
      >
        <p id="neighbor-highlights-title" className="font-display text-lg tracking-tight">
          {t("title")}
        </p>
        <p className="mt-2 text-sm text-muted">{t("loading")}</p>
      </section>
    );
  }

  if (error) {
    return (
      <section
        className="rounded-[1.75rem] bg-blush/40 px-5 py-5 shadow-card sm:px-6"
        aria-labelledby="neighbor-highlights-title"
      >
        <p id="neighbor-highlights-title" className="font-display text-lg tracking-tight">
          {t("title")}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("loadError")}</p>
      </section>
    );
  }

  return (
    <section
      className="rounded-[1.75rem] bg-blush/40 px-5 py-5 shadow-card sm:px-6"
      aria-labelledby="neighbor-highlights-title"
    >
      <p id="neighbor-highlights-title" className="font-display text-lg tracking-tight">
        {t("title")}
      </p>
      <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">{t("lead")}</p>
      {!items || items.length === 0 ? (
        <p className="mt-3 text-sm leading-relaxed text-muted">{t("empty")}</p>
      ) : (
        <ul className="mt-4 flex gap-3 overflow-x-auto pb-1" aria-label={t("listAria")}>
          {items.map((item) => (
            <li
              key={item.noteId}
              className="min-w-[14rem] max-w-[16rem] shrink-0 rounded-[1.35rem] bg-paper/90 px-4 py-4"
            >
              <p className="text-sm leading-relaxed">{item.excerpt.trim() || t("aNote")}</p>
              <p className="mt-3 text-xs text-muted">
                {t("byAuthor", { name: authorName(item, t("someone")) })}
                {` · ${t("count", { count: item.thankCount })}`}
              </p>
              <Link
                href={`/wall?note=${encodeURIComponent(item.noteId)}`}
                onClick={(event) => {
                  if (!onOpen) return;
                  event.preventDefault();
                  onOpen(item.noteId);
                }}
                className="mt-3 inline-flex min-h-11 items-center text-sm text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {t("open")}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
