"use client";

import {
  isWeekMood,
  WEEK_MOOD_SWATCH,
  WEEK_MOODS,
  type WeekMood,
} from "@/lib/week-mood";
import { useTranslations } from "next-intl";

export function WeekMoodChip({ mood }: { mood: WeekMood }) {
  const t = useTranslations("WeekMood");
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-paper/90 px-2.5 py-1 text-xs text-foreground shadow-card">
      <span
        className={`h-2.5 w-2.5 shrink-0 rounded-full border border-line/80 ${WEEK_MOOD_SWATCH[mood]}`}
        aria-hidden="true"
      />
      {t(`name_${mood}`)}
    </span>
  );
}

export function WeekMoodPicker({
  mood,
  onChange,
  disabled = false,
  status = null,
}: {
  mood: WeekMood | null;
  onChange: (mood: WeekMood | null) => void;
  disabled?: boolean;
  status?: "saved" | "error" | null;
}) {
  const t = useTranslations("WeekMood");

  return (
    <fieldset className="rounded-[1.75rem] bg-paper/80 px-5 py-5 shadow-card" disabled={disabled}>
      <legend className="font-display text-lg tracking-tight">{t("title")}</legend>
      <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">{t("lead")}</p>
      <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label={t("title")}>
        {WEEK_MOODS.map((swatch) => {
          const selected = mood === swatch;
          return (
            <button
              key={swatch}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(swatch)}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3 py-1.5 text-sm shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                selected ? "border-accent bg-paper" : "border-line/80 bg-cream/60"
              }`}
            >
              <span
                className={`h-5 w-5 rounded-full border border-line/80 ${WEEK_MOOD_SWATCH[swatch]}`}
                aria-hidden="true"
              />
              <span>{t(`name_${swatch}`)}</span>
              <span className="text-xs text-muted">{t(`phrase_${swatch}`)}</span>
            </button>
          );
        })}
        <button
          type="button"
          role="radio"
          aria-checked={mood === null}
          onClick={() => onChange(null)}
          className={`inline-flex min-h-11 items-center rounded-full border px-3 py-1.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
            mood === null ? "border-accent bg-paper text-foreground" : "border-line text-muted"
          }`}
        >
          {t("clear")}
        </button>
      </div>
      {mood && isWeekMood(mood) ? (
        <p className="mt-3 text-xs text-muted">{t("shareHint")}</p>
      ) : null}
      {status === "saved" ? (
        <p className="mt-3 text-sm text-muted" role="status">
          {t("saved")}
        </p>
      ) : null}
      {status === "error" ? (
        <p className="mt-3 text-sm text-accent" role="alert">
          {t("saveError")}
        </p>
      ) : null}
    </fieldset>
  );
}
