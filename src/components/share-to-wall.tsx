"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function ShareToWall({
  reviewId,
  initialNoteId,
}: {
  reviewId: string;
  initialNoteId: string | null;
}) {
  const t = useTranslations("Wall");
  const [noteId, setNoteId] = useState(initialNoteId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function share() {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      const response = await fetch("/api/wall/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        wallNoteId?: string;
        error?: string;
      };
      if (!response.ok || !data.wallNoteId) {
        setError(true);
        return;
      }
      setNoteId(data.wallNoteId);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function unshare() {
    if (busy || !noteId) return;
    setBusy(true);
    setError(false);
    try {
      const response = await fetch(`/api/wall/notes/${encodeURIComponent(noteId)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        setError(true);
        return;
      }
      setNoteId(null);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-10 rounded-[1.75rem] bg-mint/60 px-6 py-5 shadow-card">
      <p className="font-display text-lg tracking-tight">
        {noteId ? t("sharedTitle") : t("shareTitle")}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {noteId ? t("sharedBody") : t("shareBody")}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {noteId ? (
          <>
            <Link
              href="/wall"
              className="rounded-full bg-accent px-4 py-2 text-sm text-paper shadow-card"
            >
              {t("openWall")}
            </Link>
            <button
              type="button"
              onClick={unshare}
              disabled={busy}
              className="rounded-full border border-line px-4 py-2 text-sm text-muted disabled:opacity-60"
            >
              {busy ? t("saving") : t("unshare")}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={share}
            disabled={busy}
            className="rounded-full bg-accent px-4 py-2 text-sm text-paper shadow-card disabled:opacity-60"
          >
            {busy ? t("saving") : t("shareCta")}
          </button>
        )}
      </div>
      {error ? <p className="mt-3 text-sm text-accent">{t("shareError")}</p> : null}
    </div>
  );
}
