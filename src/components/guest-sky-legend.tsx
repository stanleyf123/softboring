"use client";

import { guestPaperColors, guestSkyMoods } from "@/lib/guest-sky-legend";
import { WEEK_MOOD_SWATCH } from "@/lib/week-mood";
import type { WallColor } from "@/lib/wall-canvas";
import { useTranslations } from "next-intl";

const PAPER: Record<WallColor, string> = {
  peach: "bg-peach",
  blush: "bg-blush",
  mint: "bg-mint",
  cream: "bg-cream",
  lemon: "bg-lemon",
  sky: "bg-sky",
};

/** A quiet key for guests. Personal Soft+ washes are not listed. */
export function GuestSkyLegend({ variant }: { variant: "home" | "wall" }) {
  const t = useTranslations("GuestLegend");
  const tMood = useTranslations("WeekMood");
  const tWall = useTranslations("Wall");
  const moods = guestSkyMoods();
  const papers = variant === "wall" ? guestPaperColors() : [];

  return (
    <section
      className="rounded-[1.75rem] bg-paper/80 px-4 py-4 shadow-card sm:px-5"
      aria-labelledby={`guest-sky-legend-${variant}`}
      data-guest-sky-legend={variant}
    >
      <p id={`guest-sky-legend-${variant}`} className="font-display text-base tracking-tight">
        {t("title")}
      </p>
      <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">{t("lead")}</p>
      {variant === "home" ? (
        <p className="mt-2 text-xs leading-relaxed text-muted" data-guest-sky-note>
          {t("homeNote")}
        </p>
      ) : null}

      <p className="mt-4 font-display text-base tracking-tight">{t("skyTitle")}</p>
      <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">{t("skyLead")}</p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {moods.map((mood) => (
          <li
            key={mood}
            data-guest-mood={mood}
            className="inline-flex items-center gap-2 rounded-full bg-cream/70 py-1 pl-1 pr-3 text-xs"
          >
            <span
              className={`h-5 w-5 shrink-0 rounded-full border border-line/80 ${WEEK_MOOD_SWATCH[mood]}`}
              aria-hidden="true"
            />
            <span>
              <span className="text-foreground">{tMood(`name_${mood}`)}</span>
              <span className="text-muted"> · {tMood(`phrase_${mood}`)}</span>
            </span>
          </li>
        ))}
      </ul>

      {papers.length > 0 ? (
        <>
          <p className="mt-4 font-display text-base tracking-tight">{t("paperTitle")}</p>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">{t("paperLead")}</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {papers.map((color) => (
              <li
                key={color}
                data-guest-paper={color}
                className="inline-flex items-center gap-2 rounded-full bg-cream/70 py-1 pl-1 pr-3 text-xs"
              >
                <span
                  className={`h-5 w-5 shrink-0 rounded-full border border-line/80 ${PAPER[color]}`}
                  aria-hidden="true"
                />
                <span>
                  <span className="text-foreground">{tWall(`color_${color}`)}</span>
                  <span className="text-muted"> · {tWall(`palette_${color}`)}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
