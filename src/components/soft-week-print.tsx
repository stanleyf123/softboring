"use client";

import type { CustomAnswer } from "@/lib/custom-questions";
import type { Review } from "@/lib/review-types";
import { useFormatter, useTranslations } from "next-intl";

type PrintReview = Pick<
  Review,
  "createdAt" | "summary" | "feeling" | "energy" | "drain" | "lessOf" | "priorities" | "customAnswers"
>;

const ANSWER_FIELDS = ["energy", "drain", "lessOf", "priorities"] as const;

function panelTone(field: (typeof ANSWER_FIELDS)[number]) {
  if (field === "energy") return "soft-week-print__panel--mint";
  if (field === "drain") return "soft-week-print__panel--blush";
  if (field === "lessOf") return "soft-week-print__panel--cream";
  return "soft-week-print__panel--sky";
}

/** Print-only cream sheet for one week already on screen (browser print → PDF). */
export function SoftWeekPrintPostcard({ review }: { review: PrintReview }) {
  const t = useTranslations("Postcard");
  const tQuestions = useTranslations("Questions");
  const tHistory = useTranslations("History");
  const format = useFormatter();
  const dateLabel = format.dateTime(new Date(review.createdAt), { dateStyle: "long" });
  const title =
    review.summary.trim() ||
    (review.feeling ? tHistory("feeling", { value: review.feeling }) : t("noFeeling"));
  const feelingLabel = review.feeling
    ? t("feeling", { value: review.feeling })
    : t("noFeeling");
  const customAnswers: CustomAnswer[] = review.customAnswers ?? [];

  return (
    <div className="soft-week-print" aria-hidden="true">
      <div className="soft-week-print__card">
        <p className="soft-week-print__brand">{t("brand")}</p>
        <p className="soft-week-print__kind">{t("kindWeek")}</p>
        <p className="soft-week-print__date">{dateLabel}</p>
        <h1 className="soft-week-print__title">{title}</h1>
        <p className="soft-week-print__feeling">{feelingLabel}</p>
        <div className="soft-week-print__grid">
          {ANSWER_FIELDS.map((field) => (
            <div key={field} className={`soft-week-print__panel ${panelTone(field)}`}>
              <p className="soft-week-print__label">{tQuestions(field)}</p>
              <p className="soft-week-print__body">{review[field].trim() || "—"}</p>
            </div>
          ))}
          {customAnswers.map((item) => (
            <div key={item.id} className="soft-week-print__panel soft-week-print__panel--cream">
              <p className="soft-week-print__label">{item.prompt}</p>
              <p className="soft-week-print__body">{item.answer.trim() || "—"}</p>
            </div>
          ))}
        </div>
        <p className="soft-week-print__footer">{t("footer")}</p>
      </div>
    </div>
  );
}
