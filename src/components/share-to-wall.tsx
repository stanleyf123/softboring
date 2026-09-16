"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { parseWallShareError, type WallShareErrorKey } from "@/lib/wall-share";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function shareErrorCopy(
  t: ReturnType<typeof useTranslations<"Wall">>,
  code: WallShareErrorKey,
) {
  switch (code) {
    case "auth_required":
      return t("shareError_auth_required");
    case "review_not_found":
      return t("shareError_review_not_found");
    case "review_required":
      return t("shareError_review_required");
    case "locked":
      return t("shareError_locked");
    case "soft_plus_required":
      return t("shareError_soft_plus_required");
    case "forbidden":
      return t("shareError_forbidden");
    default:
      return t("shareError");
  }
}

export function ShareToWall({
  reviewId,
  initialNoteId,
  variant = "card",
}: {
  reviewId: string;
  initialNoteId: string | null;
  variant?: "card" | "hero";
}) {
  const t = useTranslations("Wall");
  const router = useRouter();
  const [noteId, setNoteId] = useState(initialNoteId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<WallShareErrorKey | null>(null);
  const hero = variant === "hero";

  async function share() {
    if (busy) return;
    setBusy(true);
    setError(null);
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
        setError(parseWallShareError(data.error));
        return;
      }
      setNoteId(data.wallNoteId);
      router.push({ pathname: "/wall", query: { shared: "1" } });
    } catch {
      setError("generic");
    } finally {
      setBusy(false);
    }
  }

  async function unshare() {
    if (busy || !noteId) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/wall/notes/${encodeURIComponent(noteId)}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(parseWallShareError(data.error));
        return;
      }
      setNoteId(null);
    } catch {
      setError("generic");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={
        hero
          ? "rounded-[2rem] bg-peach px-8 py-10 shadow-soft ring-2 ring-accent/50"
          : "mt-10 rounded-[1.75rem] bg-mint/60 px-6 py-5 shadow-card"
      }
    >
      <p
        className={
          hero
            ? "font-display text-3xl tracking-tight"
            : "font-display text-lg tracking-tight"
        }
      >
        {noteId ? t("sharedTitle") : t("shareTitle")}
      </p>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted sm:text-base">
        {noteId ? t("sharedBody") : t("shareBody")}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        {noteId ? (
          <>
            <Link
              href="/wall"
              className="inline-flex min-h-12 items-center rounded-full bg-accent px-6 py-3 text-sm text-paper shadow-card sm:text-base"
            >
              {t("openWall")}
            </Link>
            <button
              type="button"
              onClick={unshare}
              disabled={busy}
              className="inline-flex min-h-12 items-center rounded-full border border-line px-5 py-2.5 text-sm text-muted disabled:opacity-60"
            >
              {busy ? t("saving") : t("unshare")}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={share}
            disabled={busy}
            className={
              hero
                ? "inline-flex min-h-12 items-center rounded-full bg-accent px-7 py-3.5 text-base text-paper shadow-soft disabled:opacity-60"
                : "inline-flex min-h-11 items-center rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card disabled:opacity-60"
            }
          >
            {busy ? t("saving") : t("shareCta")}
          </button>
        )}
      </div>
      {error ? (
        <p className="mt-4 text-sm text-accent" role="alert">
          {shareErrorCopy(t, error)}
        </p>
      ) : null}
    </div>
  );
}
