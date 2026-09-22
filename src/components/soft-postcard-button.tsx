"use client";

import {
  digestToPostcardPayload,
  postcardFilename,
  renderSoftPostcardPng,
  reviewToPostcardPayload,
  type SoftPostcardLabels,
  type SoftPostcardPayload,
} from "@/lib/soft-postcard";
import type { MonthlyDigest } from "@/lib/plus-insights";
import type { Review } from "@/lib/review-types";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function usePostcardLabels(): SoftPostcardLabels {
  const t = useTranslations("Postcard");
  return {
    brand: t("brand"),
    kindWeek: t("kindWeek"),
    kindDigest: t("kindDigest"),
    feeling: (value) => t("feeling", { value }),
    noFeeling: t("noFeeling"),
    energy: t("energy"),
    drain: t("drain"),
    summary: t("summary"),
    count: (value) => t("count", { count: value }),
    streak: (value) => t("streak", { count: value }),
    avgFeeling: (value) => t("avgFeeling", { value }),
    themes: t("themes"),
    footer: t("footer"),
  };
}

async function exportPayload(payload: SoftPostcardPayload, labels: SoftPostcardLabels, stamp: string) {
  const blob = await renderSoftPostcardPng(payload, labels);
  downloadBlob(blob, postcardFilename(payload.kind, stamp));
}

export function SoftPostcardFromReview({
  review,
  softPlus,
}: {
  review: Pick<Review, "id" | "createdAt" | "summary" | "feeling" | "energy" | "drain">;
  softPlus: boolean;
}) {
  const t = useTranslations("Postcard");
  const format = useFormatter();
  const labels = usePostcardLabels();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  if (!softPlus) return null;

  async function onExport() {
    setBusy(true);
    setError(false);
    try {
      const dateLabel = format.dateTime(new Date(review.createdAt), { dateStyle: "long" });
      await exportPayload(reviewToPostcardPayload(review, dateLabel), labels, review.createdAt.slice(0, 10));
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 rounded-[1.75rem] bg-cream/80 px-5 py-5 shadow-card sm:px-6">
      <p className="font-display text-lg tracking-tight">{t("weekTitle")}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{t("weekLead")}</p>
      <button
        type="button"
        onClick={onExport}
        disabled={busy}
        className="mt-4 rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card disabled:opacity-60"
      >
        {busy ? t("exporting") : t("exportWeek")}
      </button>
      {error ? <p className="mt-3 text-sm text-muted">{t("exportError")}</p> : null}
    </div>
  );
}

export function SoftPostcardFromDigest({ digest }: { digest: MonthlyDigest }) {
  const t = useTranslations("Postcard");
  const format = useFormatter();
  const labels = usePostcardLabels();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  if (digest.count === 0) return null;

  async function onExport() {
    setBusy(true);
    setError(false);
    try {
      const monthLabel = format.dateTime(new Date(digest.year, digest.month - 1, 1), {
        month: "long",
        year: "numeric",
      });
      const stamp = `${digest.year}-${String(digest.month).padStart(2, "0")}`;
      await exportPayload(digestToPostcardPayload(digest, monthLabel), labels, stamp);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[1.75rem] bg-cream/80 px-5 py-5 shadow-card sm:px-6">
      <p className="font-display text-lg tracking-tight">{t("digestTitle")}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{t("digestLead")}</p>
      <button
        type="button"
        onClick={onExport}
        disabled={busy}
        className="mt-4 rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card disabled:opacity-60"
      >
        {busy ? t("exporting") : t("exportDigest")}
      </button>
      {error ? <p className="mt-3 text-sm text-muted">{t("exportError")}</p> : null}
    </section>
  );
}
