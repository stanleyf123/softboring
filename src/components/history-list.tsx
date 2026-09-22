"use client";

import { EmptyState, ListSkeleton } from "@/components/empty-state";
import { Link } from "@/i18n/navigation";
import { reviewMatchesQuery } from "@/lib/plus-insights";
import {
  ensureLocalReviewsMigrated,
  fetchReviews,
  type HistoryReview,
  type ReviewAccessInfo,
} from "@/lib/reviews";
import { useHydrated } from "@/lib/use-hydrated";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

export function HistoryList() {
  const t = useTranslations("History");
  const format = useFormatter();
  const hydrated = useHydrated();
  const [reviews, setReviews] = useState<HistoryReview[] | null>(null);
  const [access, setAccess] = useState<ReviewAccessInfo | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;

    (async () => {
      try {
        await ensureLocalReviewsMigrated();
        const next = await fetchReviews();
        if (!cancelled) {
          setReviews(next.reviews);
          setAccess(next.access);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  const visible = useMemo(() => {
    if (!reviews) return [];
    if (!access?.softPlus || !query.trim()) return reviews;
    return reviews.filter((review) => !review.locked && reviewMatchesQuery(review, query));
  }, [reviews, access, query]);

  if (!hydrated || (reviews === null && !error)) {
    return <ListSkeleton label={t("loading")} />;
  }

  if (error) {
    return (
      <EmptyState title={t("loadErrorTitle")} body={t("loadError")} />
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <EmptyState
        title={t("emptyTitle")}
        body={t("emptyBody")}
        ctaHref="/review"
        ctaLabel={t("emptyCta")}
        wash="bg-peach/50"
        illustration="history"
      />
    );
  }

  return (
    <div className="space-y-6">
      {access?.isGuest ? (
        <section className="rounded-[1.75rem] bg-blush/70 px-6 py-5 shadow-card">
          <p className="font-display text-lg tracking-tight">{t("guestBannerTitle")}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">{t("guestBanner")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={{ pathname: "/register", query: { next: "/history" } }}
              className="rounded-full bg-accent px-4 py-2 text-sm text-paper shadow-card"
            >
              {t("guestCta")}
            </Link>
            <Link
              href="/pricing"
              className="rounded-full bg-paper px-4 py-2 text-sm shadow-card"
            >
              {t("lockedCta")}
            </Link>
          </div>
        </section>
      ) : null}
      {access && !access.softPlus && !access.isGuest ? (
        <section className="rounded-[1.75rem] bg-peach/70 px-6 py-5 shadow-card">
          <p className="font-display text-lg tracking-tight">{t("freeBannerTitle")}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">{t("freeBanner")}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">{t("freeDownloadHint")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href="/api/account/export"
              className="inline-flex rounded-full bg-paper px-4 py-2 text-sm shadow-card"
            >
              {t("freeDownload")}
            </a>
            <Link
              href="/pricing"
              className="inline-flex rounded-full bg-accent px-4 py-2 text-sm text-paper shadow-card"
            >
              {t("lockedCta")}
            </Link>
          </div>
        </section>
      ) : null}

      {access && !access.isGuest ? (
        <p>
          <Link
            href="/account/snapshot"
            className="inline-flex rounded-full bg-cream px-4 py-2 text-sm shadow-card"
          >
            {t("softMonth")}
          </Link>
        </p>
      ) : null}

      {access?.softPlus ? (
        <section className="rounded-[1.75rem] bg-paper px-6 py-5 shadow-card">
          <p className="font-display text-lg tracking-tight">{t("plusToolsTitle")}</p>
          <label className="mt-4 block">
            <span className="sr-only">{t("searchLabel")}</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full rounded-full border border-line bg-cream/70 px-4 py-2.5 text-sm outline-none focus:border-accent"
            />
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href="/api/reviews/export"
              className="rounded-full bg-mint px-4 py-2 text-sm shadow-card"
            >
              {t("exportCsv")}
            </a>
            <Link
              href="/history/export"
              className="rounded-full bg-blush px-4 py-2 text-sm shadow-card"
            >
              {t("exportPrint")}
            </Link>
            <Link
              href="/history/compare"
              className="rounded-full border border-line px-4 py-2 text-sm text-muted"
            >
              {t("compareWeeks")}
            </Link>
          </div>
        </section>
      ) : null}

      {visible.length === 0 ? (
        <p className="rounded-[1.5rem] bg-paper px-6 py-8 text-sm text-muted shadow-card">
          {t("searchEmpty")}
        </p>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {visible.map((review) =>
            review.locked ? (
              <li key={review.id}>
                <div className="rounded-[1.75rem] border border-dashed border-line bg-paper/70 px-6 py-5">
                  <p className="text-sm text-muted">
                    {format.dateTime(new Date(review.createdAt), { dateStyle: "medium" })}
                  </p>
                  <p className="mt-2 font-display text-lg tracking-tight">{t("lockedTitle")}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{t("lockedBody")}</p>
                  <Link href="/pricing" className="mt-4 inline-block text-sm text-accent">
                    {t("lockedCta")}
                  </Link>
                </div>
              </li>
            ) : (
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
            ),
          )}
        </ul>
      )}
    </div>
  );
}
