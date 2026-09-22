"use client";

import { Link } from "@/i18n/navigation";
import { useHydrated } from "@/lib/use-hydrated";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

export type WallActivityItem = {
  id: string;
  kind: "comment" | "reply" | "sticker";
  createdAt: string;
  noteId: string;
  noteExcerpt: string;
  actorNickname: string | null;
  actorFallback: string | null;
  body: string | null;
  stickerEmoji: string | null;
};

function actorLabel(item: WallActivityItem, someone: string) {
  return item.actorNickname || item.actorFallback || someone;
}

export function WallActivityStrip({
  softPlus,
  compact = false,
}: {
  softPlus: boolean;
  compact?: boolean;
}) {
  const t = useTranslations("WallActivity");
  const format = useFormatter();
  const hydrated = useHydrated();
  const [items, setItems] = useState<WallActivityItem[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!hydrated || !softPlus) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(
          `/api/wall/activity?limit=${compact ? 6 : 24}`,
          { cache: "no-store" },
        );
        if (!response.ok) {
          if (!cancelled) setError(true);
          return;
        }
        const data = (await response.json()) as { items: WallActivityItem[] };
        if (!cancelled) setItems(data.items);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, softPlus, compact]);

  if (!softPlus) return null;

  if (!hydrated || (items === null && !error)) {
    return (
      <section className="rounded-[1.75rem] bg-paper/90 px-5 py-5 shadow-card sm:px-6">
        <p className="font-display text-lg tracking-tight">{t("title")}</p>
        <p className="mt-2 text-sm text-muted">{t("loading")}</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-[1.75rem] bg-paper/90 px-5 py-5 shadow-card sm:px-6">
        <p className="font-display text-lg tracking-tight">{t("title")}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("loadError")}</p>
      </section>
    );
  }

  if (!items || items.length === 0) {
    return (
      <section className="rounded-[1.75rem] bg-paper/90 px-5 py-5 shadow-card sm:px-6">
        <p className="font-display text-lg tracking-tight">{t("title")}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("empty")}</p>
      </section>
    );
  }

  return (
    <section className="rounded-[1.75rem] bg-paper/90 px-5 py-5 shadow-card sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-display text-lg tracking-tight">{t("title")}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">{t("lead")}</p>
        </div>
        {compact ? (
          <Link
            href="/wall/activity"
            className="rounded-full border border-line px-4 py-2 text-sm text-muted hover:text-foreground"
          >
            {t("seeAll")}
          </Link>
        ) : null}
      </div>
      <ul className="mt-4 space-y-3">
        {items.map((item) => {
          const who = actorLabel(item, t("someone"));
          const line =
            item.kind === "sticker"
              ? t("stickerLine", {
                  who,
                  emoji: item.stickerEmoji ?? "♡",
                  excerpt: item.noteExcerpt || t("aNote"),
                })
              : item.kind === "reply"
                ? t("replyLine", {
                    who,
                    body: item.body ?? t("aQuietWord"),
                    excerpt: item.noteExcerpt || t("aNote"),
                  })
                : t("commentLine", {
                    who,
                    body: item.body ?? t("aQuietWord"),
                    excerpt: item.noteExcerpt || t("aNote"),
                  });
          return (
            <li
              key={`${item.kind}-${item.id}`}
              className="rounded-[1.25rem] bg-cream/70 px-4 py-3 text-sm leading-relaxed"
            >
              <p>{line}</p>
              <p className="mt-1 text-xs text-muted">
                {format.dateTime(new Date(item.createdAt), {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
