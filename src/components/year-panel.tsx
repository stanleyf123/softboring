"use client";

import { EmptyState } from "@/components/empty-state";
import { Link } from "@/i18n/navigation";
import { feelingDotClass, type SoftYearTimeline } from "@/lib/soft-year";
import { useTranslations } from "next-intl";

export function YearPanel({ timeline }: { timeline: SoftYearTimeline }) {
  const t = useTranslations("Year");

  if (timeline.filledCount === 0) {
    return (
      <EmptyState
        title={t("emptyTitle")}
        body={t("empty")}
        ctaHref="/review"
        ctaLabel={t("emptyCta")}
        wash="bg-paper"
        illustration="year"
      />
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] bg-paper px-6 py-8 shadow-card sm:px-8">
        <p className="text-sm text-muted">{t("yearLabel", { year: timeline.year })}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.4rem] bg-mint/60 px-4 py-4">
            <p className="text-sm text-muted">{t("filledLabel")}</p>
            <p className="mt-1 font-display text-2xl tracking-tight">
              {t("filled", { count: timeline.filledCount })}
            </p>
          </div>
          <div className="rounded-[1.4rem] bg-peach/60 px-4 py-4">
            <p className="text-sm text-muted">{t("feelingLabel")}</p>
            <p className="mt-1 font-display text-2xl tracking-tight">
              {timeline.avgFeeling == null
                ? t("feelingEmpty")
                : t("feeling", { value: timeline.avgFeeling })}
            </p>
          </div>
        </div>

        <p className="mt-8 text-sm text-muted">{t("calendarHint")}</p>
        <ol
          className="mt-4 grid grid-cols-8 gap-2 sm:grid-cols-[repeat(13,minmax(0,1fr))]"
          aria-label={t("calendarLabel", { year: timeline.year })}
        >
          {timeline.cells.map((cell) => {
            const filled = Boolean(cell.reviewId);
            const title = filled
              ? t("weekFilled", {
                  week: cell.week,
                  feeling:
                    cell.feeling == null
                      ? t("feelingUnknown")
                      : t("feelingShort", { value: cell.feeling }),
                })
              : t("weekEmpty", { week: cell.week });

            const dot = (
              <span
                className={`block h-3.5 w-3.5 rounded-full transition-transform duration-300 sm:h-4 sm:w-4 ${feelingDotClass(
                  filled ? cell.feeling : null,
                )} ${filled ? "scale-100 opacity-100" : "scale-90 opacity-40"}`}
                aria-hidden="true"
              />
            );

            return (
              <li key={cell.weekKey} className="flex justify-center">
                {cell.reviewId ? (
                  <Link
                    href={`/history/${cell.reviewId}`}
                    title={title}
                    aria-label={title}
                    className="rounded-full p-1 hover:bg-cream/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    {dot}
                  </Link>
                ) : (
                  <span title={title} aria-label={title} className="rounded-full p-1">
                    {dot}
                  </span>
                )}
              </li>
            );
          })}
        </ol>

        <ul className="mt-6 flex flex-wrap gap-3 text-xs text-muted">
          {[1, 2, 3, 4, 5].map((value) => (
            <li key={value} className="inline-flex items-center gap-1.5">
              <span
                className={`h-2.5 w-2.5 rounded-full ${feelingDotClass(value)}`}
                aria-hidden="true"
              />
              {t("legend", { value })}
            </li>
          ))}
          <li className="inline-flex items-center gap-1.5">
            <span
              className={`h-2.5 w-2.5 rounded-full ${feelingDotClass(null)} opacity-40`}
              aria-hidden="true"
            />
            {t("legendEmpty")}
          </li>
        </ul>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/history"
            className="rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card"
          >
            {t("seeHistory")}
          </Link>
          <Link
            href="/trends"
            className="rounded-full border border-line px-5 py-2.5 text-sm text-muted"
          >
            {t("seeTrends")}
          </Link>
          <Link
            href="/digest"
            className="rounded-full border border-line px-5 py-2.5 text-sm text-muted"
          >
            {t("seeDigest")}
          </Link>
        </div>
      </section>
    </div>
  );
}
