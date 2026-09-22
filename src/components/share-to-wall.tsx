"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { parseWallShareError, type WallShareErrorKey } from "@/lib/wall-share";
import {
  isPlusNoteColor,
  isWallColor,
  PLUS_NOTE_COLORS,
  WALL_COLORS,
  type NoteColor,
} from "@/lib/wall-canvas";
import { isWeekMood, type WeekMood } from "@/lib/week-mood";
import { WeekMoodChip } from "@/components/week-mood-picker";
import {
  FREE_RAISED_PIN_LIMIT,
  SOFT_PLUS_RAISED_PIN_LIMIT,
  shareWindowLimit,
} from "@/lib/wall-pin-limit";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const COLOR_SWATCH: Record<NoteColor, string> = {
  peach: "bg-peach",
  blush: "bg-blush",
  mint: "bg-mint",
  cream: "bg-cream",
  lemon: "bg-lemon",
  sky: "bg-sky",
  lilac: "bg-lilac",
  rose: "bg-rose",
  fern: "bg-fern",
  apricot: "bg-apricot",
};

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
  softPlus = false,
  variant = "card",
  mood = null,
}: {
  reviewId: string;
  initialNoteId: string | null;
  softPlus?: boolean;
  variant?: "card" | "hero";
  mood?: WeekMood | null;
}) {
  const t = useTranslations("Wall");
  const router = useRouter();
  const [noteId, setNoteId] = useState(initialNoteId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<WallShareErrorKey | null>(null);
  const [color, setColor] = useState<NoteColor>("peach");
  const [colorReady, setColorReady] = useState(!softPlus);
  const hero = variant === "hero";

  useEffect(() => {
    if (!softPlus || noteId) {
      setColorReady(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/account/settings", { cache: "no-store" });
        if (!response.ok || cancelled) return;
        const data = (await response.json()) as {
          settings?: {
            preferredWallColor?: string | null;
            customNoteColor?: string | null;
          };
        };
        const custom = data.settings?.customNoteColor;
        const preferred = data.settings?.preferredWallColor;
        if (!cancelled && typeof custom === "string" && isPlusNoteColor(custom)) {
          setColor(custom);
        } else if (!cancelled && typeof preferred === "string" && isWallColor(preferred)) {
          setColor(preferred);
        }
      } finally {
        if (!cancelled) setColorReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [softPlus, noteId]);

  async function rememberColor(next: NoteColor) {
    setColor(next);
    if (!softPlus) return;
    const body = isPlusNoteColor(next)
      ? { customNoteColor: next }
      : { preferredWallColor: next, customNoteColor: null };
    try {
      await fetch("/api/account/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      // Preference is optional — share still works.
    }
  }

  async function share() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/wall/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          softPlus ? { reviewId, color } : { reviewId },
        ),
      });
      const data = (await response.json().catch(() => ({}))) as {
        wallNoteId?: string;
        error?: string;
      };
      if (!response.ok || !data.wallNoteId) {
        setError(parseWallShareError(data.error));
        return;
      }
      if (softPlus) {
        void rememberColor(color);
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
        {noteId ? t("unshareHint") : t("shareBody")}
      </p>
      <p
        className="mt-3 max-w-md text-sm leading-relaxed text-muted"
        data-wall-pin-limit={softPlus ? "plus" : "free"}
      >
        {softPlus
          ? t("sharePinLimitPlus", {
              weeks: shareWindowLimit(false) ?? 0,
              raised: SOFT_PLUS_RAISED_PIN_LIMIT,
            })
          : t("sharePinLimitFree", {
              weeks: shareWindowLimit(false) ?? 0,
              raised: SOFT_PLUS_RAISED_PIN_LIMIT,
              freeRaised: FREE_RAISED_PIN_LIMIT,
            })}
      </p>
      {mood && isWeekMood(mood) ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <WeekMoodChip mood={mood} />
        </div>
      ) : null}
      {softPlus && !noteId && colorReady ? (
        <div className="mt-5">
          <p className="text-sm text-muted">{t("colorPreferTitle")}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{t("colorPreferHint")}</p>
          <div role="radiogroup" aria-label={t("colorPreferTitle")}>
            <div className="mt-3 flex flex-wrap gap-2">
              {WALL_COLORS.map((swatch) => {
                const selected = color === swatch;
                return (
                  <button
                    key={swatch}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={t(`color_${swatch}`)}
                    onClick={() => void rememberColor(swatch)}
                    className={`h-9 w-9 rounded-full border-2 shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${COLOR_SWATCH[swatch]} ${
                      selected ? "border-accent" : "border-line/70"
                    }`}
                  />
                );
              })}
            </div>
            <p className="mt-4 text-sm text-muted">{t("personalColorTitle")}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{t("personalColorHint")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {PLUS_NOTE_COLORS.map((swatch) => {
                const selected = color === swatch;
                return (
                  <button
                    key={swatch}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={t(`color_${swatch}`)}
                    onClick={() => void rememberColor(swatch)}
                    className={`h-9 w-9 rounded-full border-2 shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${COLOR_SWATCH[swatch]} ${
                      selected ? "border-accent" : "border-line/70"
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
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
              className="inline-flex min-h-12 items-center rounded-full border border-line bg-paper px-5 py-2.5 text-sm text-muted shadow-card hover:text-foreground disabled:opacity-60"
            >
              {busy ? t("saving") : t("unshare")}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={share}
            disabled={busy || (softPlus && !colorReady)}
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
