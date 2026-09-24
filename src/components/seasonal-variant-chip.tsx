"use client";

import type { SeasonalVariantId } from "@/lib/seasonal-variants";
import { useTranslations } from "next-intl";

const chipClass =
  "inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function SeasonalVariantChip({
  season,
  active,
  hidden,
  onActive,
}: {
  season: SeasonalVariantId;
  active: boolean;
  hidden: boolean;
  onActive: (next: boolean) => void;
}) {
  const t = useTranslations("SeasonalVariants");
  if (hidden) return null;
  const seasonName = t(`season_${season}`);

  return (
    <section
      className="rounded-[1.75rem] bg-lemon/25 px-5 py-5 shadow-card"
      data-seasonal-variant={active ? season : "usual"}
      aria-labelledby="seasonal-variant-title"
    >
      <p id="seasonal-variant-title" className="font-display text-lg tracking-tight">
        {t("title")}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{t("lead")}</p>
      <div
        className="mt-4 flex flex-wrap gap-2"
        role="group"
        aria-label={t("chipLabel")}
      >
        <button
          type="button"
          aria-pressed={!active}
          data-seasonal-variant-choice="usual"
          onClick={() => onActive(false)}
          className={`${chipClass} ${active ? "border border-line bg-paper text-muted" : "bg-accent text-paper"}`}
        >
          {t("usual")}
        </button>
        <button
          type="button"
          aria-pressed={active}
          data-seasonal-variant-choice="season"
          onClick={() => onActive(true)}
          className={`${chipClass} ${active ? "bg-accent text-paper" : "border border-line bg-paper text-muted"}`}
        >
          {t("hear", { season: seasonName })}
        </button>
      </div>
      {active ? (
        <p className="mt-3 text-sm leading-relaxed text-muted" data-seasonal-variant-on="">
          {t("on", { season: seasonName })}
        </p>
      ) : null}
    </section>
  );
}
