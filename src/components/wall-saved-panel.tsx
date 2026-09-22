"use client";

import { EmptyState, ListSkeleton } from "@/components/empty-state";
import { Link } from "@/i18n/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type SavedNote = {
  id: string;
  excerpt: string;
  summary: string;
  feeling: number | null;
  praiseCount: number;
  bookmarkedAt: string;
  ownerNickname?: string | null;
  ownerFallback?: string | null;
  color: string;
};

const COLOR_CLASS: Record<string, string> = {
  peach: "bg-peach/70",
  blush: "bg-blush/70",
  mint: "bg-mint/70",
  cream: "bg-cream/80",
  lemon: "bg-lemon/70",
  sky: "bg-sky/70",
};

export function WallSavedPanel({ softPlus }: { softPlus: boolean }) {
  const t = useTranslations("WallSaved");
  const tWall = useTranslations("Wall");
  const format = useFormatter();
  const [notes, setNotes] = useState<SavedNote[] | null>(null);
  const [error, setError] = useState<"locked" | "generic" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!softPlus) {
      setNotes([]);
      setError("locked");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/wall/bookmarks", { cache: "no-store" });
        if (response.status === 401 || response.status === 403) {
          if (!cancelled) {
            setError("locked");
            setNotes([]);
          }
          return;
        }
        if (!response.ok) throw new Error("failed");
        const data = (await response.json()) as { notes: SavedNote[] };
        if (!cancelled) {
          setNotes(data.notes);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError("generic");
          setNotes([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [softPlus]);

  async function unsave(id: string) {
    if (busyId) return;
    setBusyId(id);
    try {
      const response = await fetch(`/api/wall/notes/${encodeURIComponent(id)}/bookmark`, {
        method: "POST",
      });
      if (!response.ok) return;
      const data = (await response.json()) as { bookmarked: boolean };
      if (!data.bookmarked) {
        setNotes((current) => (current ? current.filter((note) => note.id !== id) : current));
      }
    } finally {
      setBusyId(null);
    }
  }

  if (notes === null) {
    return <ListSkeleton label={t("loading")} />;
  }

  if (error === "locked") {
    return (
      <EmptyState
        title={t("lockedTitle")}
        body={t("lockedBody")}
        ctaHref="/pricing"
        ctaLabel={t("lockedCta")}
        wash="bg-peach/40"
        illustration="saved"
      />
    );
  }

  if (error === "generic") {
    return <EmptyState title={t("loadErrorTitle")} body={t("loadError")} illustration="saved" />;
  }

  if (notes.length === 0) {
    return (
      <EmptyState
        title={t("emptyTitle")}
        body={t("empty")}
        ctaHref="/wall"
        ctaLabel={t("emptyCta")}
        wash="bg-blush/40"
        illustration="saved"
      />
    );
  }

  return (
    <ul className="space-y-4">
      {notes.map((note) => {
        const wash = COLOR_CLASS[note.color] ?? "bg-peach/70";
        const author =
          note.ownerNickname?.trim() ||
          note.ownerFallback?.trim() ||
          tWall("softVisitor");
        return (
          <li
            key={note.id}
            className={`rounded-[1.75rem] ${wash} px-5 py-5 shadow-card sm:px-6`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted">{t("byAuthor", { name: author })}</p>
                <p className="mt-2 font-display text-xl tracking-tight">
                  {note.summary?.trim() || note.excerpt || tWall("untitled")}
                </p>
                {note.feeling != null ? (
                  <p className="mt-2 text-sm text-muted">
                    {tWall("feeling", { value: note.feeling })}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-muted">
                  {t("savedOn", {
                    date: format.dateTime(new Date(note.bookmarkedAt), {
                      dateStyle: "medium",
                    }),
                  })}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={{ pathname: "/wall", query: { note: note.id } }}
                  className="rounded-full bg-accent px-4 py-2 text-sm text-paper shadow-card"
                >
                  {t("open")}
                </Link>
                <button
                  type="button"
                  onClick={() => unsave(note.id)}
                  disabled={busyId === note.id}
                  className="rounded-full border border-line px-4 py-2 text-sm text-muted hover:text-foreground disabled:opacity-60"
                >
                  {busyId === note.id ? t("saving") : t("unsave")}
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
