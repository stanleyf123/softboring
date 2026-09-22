"use client";

import type { Review } from "@/lib/review-types";
import { useFormatter, useTranslations } from "next-intl";

export function ExportPrintView({ reviews }: { reviews: Review[] }) {
  const t = useTranslations("Export");
  const tQuestions = useTranslations("Questions");
  const tHistory = useTranslations("History");
  const format = useFormatter();

  return (
    <div className="soft-export-sheet soft-print-sheet">
      <div className="print:hidden mb-6">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card"
        >
          {t("print")}
        </button>
      </div>
      {reviews.length === 0 ? (
        <p className="rounded-[1.75rem] bg-paper px-6 py-10 text-muted shadow-card">
          {t("empty")}
        </p>
      ) : (
        <ol className="space-y-6">
          {reviews.map((review) => (
            <li
              key={review.id}
              className="soft-print-card break-inside-avoid rounded-[1.75rem] bg-paper px-6 py-6 shadow-card"
            >
              <p className="text-sm text-muted">
                {format.dateTime(new Date(review.createdAt), { dateStyle: "long" })}
              </p>
              <h2 className="mt-2 font-display text-2xl tracking-tight">
                {review.summary.trim() || tHistory("untitled")}
              </h2>
              <p className="mt-2 text-sm text-muted">
                {review.feeling
                  ? tHistory("feeling", { value: review.feeling })
                  : t("noFeeling")}
              </p>
              <dl className="mt-5 space-y-4 text-sm leading-relaxed">
                {(["energy", "drain", "lessOf", "priorities"] as const).map((field) => (
                  <div key={field}>
                    <dt className="text-muted">{tQuestions(field)}</dt>
                    <dd className="mt-1 whitespace-pre-wrap">{review[field].trim() || "—"}</dd>
                  </div>
                ))}
                {(review.customAnswers ?? []).map((item) => (
                  <div key={item.id}>
                    <dt className="text-muted">{item.prompt}</dt>
                    <dd className="mt-1 whitespace-pre-wrap">{item.answer.trim() || "—"}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
