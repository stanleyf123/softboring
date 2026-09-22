"use client";

import {
  weeklyPromptDots,
  type WeeklyPromptId,
} from "@/lib/review-progress";
import { useTranslations } from "next-intl";

export function ReviewProgressDots({
  values,
  labels,
}: {
  values: Record<WeeklyPromptId, string>;
  labels: Record<WeeklyPromptId, string>;
}) {
  const t = useTranslations("Review");
  const dots = weeklyPromptDots(values);

  return (
    <div data-review-progress="dots">
      <p id="review-progress-hint" className="text-sm text-muted">
        {t("progressHint")}
      </p>
      <ul
        className="mt-3 flex list-none items-center gap-2.5 p-0"
        aria-labelledby="review-progress-hint"
      >
        {dots.map((dot) => {
          const name = dot.filled
            ? t("progressFilled", { prompt: labels[dot.id] })
            : t("progressEmpty", { prompt: labels[dot.id] });
          return (
            <li key={dot.id} aria-label={name}>
              <span
                data-review-progress-dot={dot.id}
                data-filled={dot.filled ? "yes" : "no"}
                title={name}
                aria-hidden="true"
                className={
                  dot.filled ? "soft-progress-dot is-filled" : "soft-progress-dot"
                }
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
