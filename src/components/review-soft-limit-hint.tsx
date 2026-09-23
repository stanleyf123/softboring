"use client";

import { reviewFieldNeedsSoftHint } from "@/lib/review-soft-limit";
import { useTranslations } from "next-intl";

/** Gentle hint only. The field stays editable and the review can still be saved. */
export function ReviewSoftLimitHint({ id, value }: { id: string; value: string }) {
  const t = useTranslations("Review");
  if (!reviewFieldNeedsSoftHint(value)) return null;
  return (
    <p
      id={id}
      className="soft-limit-hint mt-2 text-xs leading-relaxed text-muted"
      data-soft-limit="hint"
      role="status"
    >
      {t("softLimitHint")}
    </p>
  );
}
