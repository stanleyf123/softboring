"use client";

import { TeacupDoodle } from "@/components/soft-doodles";
import { Link } from "@/i18n/navigation";
import type { StreakMilestone } from "@/lib/plus-insights";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

export function StreakCelebration({
  streak,
  softPlus,
  onClose,
}: {
  streak: StreakMilestone;
  softPlus: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("Streak");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="soft-streak-backdrop fixed inset-0 z-[80] flex items-end justify-center bg-foreground/15 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="streak-title"
      onClick={onClose}
    >
      <div
        className="soft-streak-card relative w-full max-w-sm overflow-hidden rounded-[2rem] bg-paper px-6 py-8 shadow-soft sm:px-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="soft-streak-doodle absolute -right-2 top-2 w-20 opacity-90">
          <TeacupDoodle />
        </div>
        <p className="font-display italic text-accent">{t("eyebrow")}</p>
        <h2 id="streak-title" className="mt-2 font-display text-3xl tracking-tight">
          {t("title", { count: streak })}
        </h2>
        <p className="mt-4 leading-relaxed text-muted">
          {t(
            (
              {
                2: "body_2",
                4: "body_4",
                8: "body_8",
                12: "body_12",
              } as const
            )[streak],
          )}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {softPlus ? (
            <Link
              href="/trends"
              className="inline-flex min-h-11 items-center rounded-full bg-mint px-5 py-2.5 text-sm shadow-card"
            >
              {t("seeTrends")}
            </Link>
          ) : (
            <Link
              href="/pricing"
              className="inline-flex min-h-11 items-center rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card"
            >
              {t("seePlus")}
            </Link>
          )}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center rounded-full px-5 py-2.5 text-sm text-muted hover:text-foreground"
          >
            {t("close")}
          </button>
        </div>
      </div>
    </div>
  );
}
