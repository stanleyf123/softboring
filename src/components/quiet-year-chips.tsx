"use client";

import { Link } from "@/i18n/navigation";
import type { QuietChip } from "@/lib/quiet-chips";
import { WEEK_MOOD_SWATCH, type WeekMood } from "@/lib/week-mood";
import { useTranslations } from "next-intl";

export function QuietYearChips({
  year,
  chips,
  hiddenCount,
  softPlus,
}: {
  year: number;
  chips: QuietChip[];
  hiddenCount: number;
  softPlus: boolean;
}) {
  const t = useTranslations("QuietChips");
  const tMood = useTranslations("WeekMood");

  return (
    <section
      className="rounded-[2rem] bg-cream/80 px-6 py-8 shadow-card sm:px-8"
      data-quiet-chips
      data-quiet-plus={softPlus ? "1" : "0"}
      aria-labelledby="quiet-chips-title"
    >
      <p className="text-sm text-muted">{t("yearLabel", { year })}</p>
      <h2 id="quiet-chips-title" className="mt-1 font-display text-2xl tracking-tight">
        {t("title")}
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{t("lead")}</p>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
        {softPlus ? t("plusHint") : t("freeHint")}
      </p>
      {chips.length === 0 ? (
        <p className="mt-5 text-sm leading-relaxed text-muted">{t("empty")}</p>
      ) : (
        <ul className="mt-5 flex flex-wrap gap-2" aria-label={t("title")}>
          {chips.map((chip) =>
            chip.kind === "pause" ? (
              <li key={chip.id}>
                <span className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-blush/80 px-3 py-2 text-sm shadow-card">
                  <span aria-hidden="true">☾</span>
                  {t("pause")}
                  <span className="text-muted">{t("week", { week: chip.week })}</span>
                </span>
              </li>
            ) : (
              <li key={chip.id}>
                <Link
                  href={`/history/${chip.reviewId}`}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-paper px-3 py-2 text-sm shadow-card"
                >
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full border border-line/80 ${
                      WEEK_MOOD_SWATCH[chip.mood as WeekMood]
                    }`}
                    aria-hidden="true"
                  />
                  {tMood(`name_${chip.mood as WeekMood}`)}
                  <span className="text-muted">{t("week", { week: chip.week })}</span>
                </Link>
              </li>
            ),
          )}
        </ul>
      )}
      {!softPlus && hiddenCount > 0 ? (
        <p className="mt-4 text-sm leading-relaxed text-muted">
          {t("hidden", { count: hiddenCount })}
        </p>
      ) : null}
    </section>
  );
}
