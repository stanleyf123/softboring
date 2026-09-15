"use client";

import { Link } from "@/i18n/navigation";
import { ensureLocalReviewsMigrated, fetchReview, type Review } from "@/lib/reviews";
import { useHydrated } from "@/lib/use-hydrated";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const DETAIL_FIELDS = [
  "energy",
  "drain",
  "lessOf",
  "priorities",
  "summary",
] as const;

export function HistoryDetail({ id }: { id: string }) {
  const t = useTranslations("HistoryDetail");
  const tQuestions = useTranslations("Questions");
  const tHistory = useTranslations("History");
  const format = useFormatter();
  const hydrated = useHydrated();
  const [review, setReview] = useState<Review | null | undefined>(undefined);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;

    (async () => {
      try {
        await ensureLocalReviewsMigrated();
        const next = await fetchReview(id);
        if (!cancelled) setReview(next ?? null);
      } catch {
        if (!cancelled) setError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, id]);

  if (!hydrated || (review === undefined && !error)) {
    return <div className="min-h-64" aria-hidden="true" />;
  }

  if (error) {
    return (
      <section className="rounded-[2rem] bg-paper px-8 py-12 shadow-card">
        <h1 className="font-display text-3xl tracking-tight">{t("loadErrorTitle")}</h1>
        <p className="mt-3 max-w-md text-muted leading-relaxed">{t("loadError")}</p>
        <Link href="/history" className="mt-8 inline-block text-sm text-accent">
          {t("back")}
        </Link>
      </section>
    );
  }

  if (!review) {
    return (
      <section className="rounded-[2rem] bg-paper px-8 py-12 shadow-card">
        <h1 className="font-display text-3xl tracking-tight">{t("notFound")}</h1>
        <p className="mt-3 max-w-md text-muted leading-relaxed">
          {t("notFoundBody")}
        </p>
        <Link href="/history" className="mt-8 inline-block text-sm text-accent">
          {t("back")}
        </Link>
      </section>
    );
  }

  const date = format.dateTime(new Date(review.createdAt), {
    dateStyle: "long",
  });

  return (
    <article>
      <Link href="/history" className="text-sm text-muted hover:text-foreground">
        {t("back")}
      </Link>
      <p className="mt-8 text-sm text-muted">{t("savedOn", { date })}</p>
      <h1 className="mt-3 font-display text-3xl tracking-tight">
        {review.summary.trim() || tHistory("untitled")}
      </h1>

      <dl className="mt-10 space-y-8">
        {DETAIL_FIELDS.map((field) => (
          <div key={field}>
            <dt className="text-sm text-muted">{tQuestions(field)}</dt>
            <dd className="mt-2 whitespace-pre-wrap leading-relaxed">
              {review[field].trim() || "—"}
            </dd>
          </div>
        ))}
        <div>
          <dt className="text-sm text-muted">{tQuestions("feeling")}</dt>
          <dd className="mt-2">
            {review.feeling
              ? tHistory("feeling", { value: review.feeling })
              : "—"}
          </dd>
        </div>
      </dl>
    </article>
  );
}
