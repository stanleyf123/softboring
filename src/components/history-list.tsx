"use client";

import { Link } from "@/i18n/navigation";
import { loadReviews } from "@/lib/reviews";
import { useHydrated } from "@/lib/use-hydrated";
import { useFormatter, useTranslations } from "next-intl";

export function HistoryList() {
  const t = useTranslations("History");
  const format = useFormatter();
  const hydrated = useHydrated();

  if (!hydrated) {
    return <div className="min-h-48" aria-hidden="true" />;
  }

  const reviews = loadReviews();

  if (reviews.length === 0) {
    return (
      <section className="rounded-[2rem] bg-paper px-8 py-12">
        <h2 className="font-display text-2xl tracking-tight">{t("emptyTitle")}</h2>
        <p className="mt-3 max-w-md text-muted leading-relaxed">{t("emptyBody")}</p>
        <Link
          href="/review"
          className="mt-8 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm text-paper"
        >
          {t("emptyCta")}
        </Link>
      </section>
    );
  }

  return (
    <ul className="space-y-4">
      {reviews.map((review) => (
        <li key={review.id}>
          <Link
            href={`/history/${review.id}`}
            className="block rounded-[1.75rem] bg-paper px-6 py-5"
          >
            <p className="text-sm text-muted">
              {format.dateTime(new Date(review.createdAt), { dateStyle: "medium" })}
            </p>
            <p className="mt-2 text-base leading-relaxed">
              {review.summary.trim() || t("untitled")}
            </p>
            {review.feeling ? (
              <p className="mt-3 text-sm text-muted">
                {t("feeling", { value: review.feeling })}
              </p>
            ) : null}
            <span className="mt-4 inline-block text-sm text-accent">{t("open")}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
