"use client";

import { SoftPostcardFromReview } from "@/components/soft-postcard-button";
import { ShareToWall } from "@/components/share-to-wall";
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
  const [wall, setWall] = useState<{ noteId: string | null; canShare: boolean } | null>(
    null,
  );
  const [softPlus, setSoftPlus] = useState(false);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;

    (async () => {
      try {
        await ensureLocalReviewsMigrated();
        const [next, me] = await Promise.all([
          fetchReview(id),
          fetch("/api/auth/me", { cache: "no-store" })
            .then((response) => response.json())
            .catch(() => null),
        ]);
        if (cancelled) return;
        const planSoftPlus = Boolean(
          me &&
            typeof me === "object" &&
            "user" in me &&
            me.user &&
            typeof me.user === "object" &&
            "softPlus" in me.user &&
            me.user.softPlus === true,
        );
        setSoftPlus(planSoftPlus);
        if (!next) {
          setReview(null);
          return;
        }
        if ("locked" in next && next.locked) {
          setLocked(true);
          setReview(null);
          return;
        }
        if ("review" in next) {
          setReview(next.review);
          setWall(next.wall);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, id]);

  if (!hydrated || (review === undefined && !error && !locked)) {
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

  if (locked) {
    return (
      <section className="rounded-[2rem] bg-paper px-8 py-12 shadow-card">
        <h1 className="font-display text-3xl tracking-tight">{t("lockedTitle")}</h1>
        <p className="mt-3 max-w-md text-muted leading-relaxed">{t("lockedBody")}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/pricing"
            className="rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card"
          >
            {t("lockedCta")}
          </Link>
          <Link href="/history" className="rounded-full px-5 py-2.5 text-sm text-muted">
            {t("back")}
          </Link>
        </div>
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

      <dl className="mt-10 grid gap-8 lg:grid-cols-2">
        {DETAIL_FIELDS.map((field) => (
          <div key={field} className={field === "summary" ? "lg:col-span-2" : undefined}>
            <dt className="text-sm text-muted">{tQuestions(field)}</dt>
            <dd className="mt-2 whitespace-pre-wrap leading-relaxed">
              {review[field].trim() || "—"}
            </dd>
          </div>
        ))}
        {(review.customAnswers ?? []).map((item) => (
          <div key={item.id}>
            <dt className="text-sm text-muted">{item.prompt}</dt>
            <dd className="mt-2 whitespace-pre-wrap leading-relaxed">
              {item.answer.trim() || "—"}
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
      <SoftPostcardFromReview review={review} softPlus={softPlus} />
      {wall?.canShare ? (
        <ShareToWall reviewId={review.id} initialNoteId={wall.noteId} />
      ) : null}
    </article>
  );
}
