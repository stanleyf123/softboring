"use client";

import { Link } from "@/i18n/navigation";
import { ensureLocalReviewsMigrated, fetchReviews, type Review } from "@/lib/reviews";
import { useHydrated } from "@/lib/use-hydrated";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

export function HistoryList() {
  const t = useTranslations("History");
  const format = useFormatter();
  const hydrated = useHydrated();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;

    (async () => {
      try {
        await ensureLocalReviewsMigrated();
        const next = await fetchReviews();
        if (!cancelled) setReviews(next);
      } catch {
        if (!cancelled) setError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  if (!hydrated || (reviews === null && !error)) {
    return <div className="min-h-48" aria-hidden="true" />;
  }

  if (error) {
    return (
      <section className="rounded-[2rem] bg-paper px-8 py-12 shadow-card">
        <h2 className="font-display text-2xl tracking-tight">{t("loadErrorTitle")}</h2>
        <p className="mt-3 max-w-md text-muted leading-relaxed">{t("loadError")}</p>
      </section>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <section className="rounded-[2rem] bg-paper px-8 py-12 shadow-card">
        <h2 className="font-display text-2xl tracking-tight">{t("emptyTitle")}</h2>
        <p className="mt-3 max-w-md text-muted leading-relaxed">{t("emptyBody")}</p>
        <Link
          href="/review"
          className="mt-8 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card"
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
            className="block rounded-[1.75rem] bg-paper px-6 py-5 shadow-card"
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
