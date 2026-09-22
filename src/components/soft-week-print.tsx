"use client";

import type { Review } from "@/lib/review-types";
import { useFormatter, useTranslations } from "next-intl";

/** Print-only soft postcard layout for one week (browser print → PDF). */
export function SoftWeekPrintPostcard({
  review,
}: {
  review: Pick<Review, "createdAt" | "summary" | "feeling" | "energy" | "drain">;
}) {
  const t = useTranslations("Postcard");
  const tHistory = useTranslations("History");
  const format = useFormatter();
  const dateLabel = format.dateTime(new Date(review.createdAt), { dateStyle: "long" });
  const title =
    review.summary.trim() ||
    (review.feeling ? tHistory("feeling", { value: review.feeling }) : t("noFeeling"));
  const feelingLabel = review.feeling
    ? t("feeling", { value: review.feeling })
    : t("noFeeling");

  return (
    <div className="soft-week-print" aria-hidden="true">
      <div className="soft-week-print__card">
        <p className="soft-week-print__brand">{t("brand")}</p>
        <p className="soft-week-print__kind">{t("kindWeek")}</p>
        <p className="soft-week-print__date">{dateLabel}</p>
        <h1 className="soft-week-print__title">{title}</h1>
        <p className="soft-week-print__feeling">{feelingLabel}</p>
        <div className="soft-week-print__grid">
          <div className="soft-week-print__panel soft-week-print__panel--mint">
            <p className="soft-week-print__label">{t("energy")}</p>
            <p className="soft-week-print__body">{review.energy.trim() || "—"}</p>
          </div>
          <div className="soft-week-print__panel soft-week-print__panel--blush">
            <p className="soft-week-print__label">{t("drain")}</p>
            <p className="soft-week-print__body">{review.drain.trim() || "—"}</p>
          </div>
        </div>
        <p className="soft-week-print__footer">{t("footer")}</p>
      </div>
    </div>
  );
}
