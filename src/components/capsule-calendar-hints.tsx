"use client";

import { Link } from "@/i18n/navigation";
import type { CapsuleDayHint } from "@/lib/capsule-hints";
import { useFormatter, useTranslations } from "next-intl";

function hintDate(unlockOn: string) {
  const [year, month, day] = unlockOn.split("-").map(Number);
  return new Date(Date.UTC(year, (month || 1) - 1, day || 1, 12));
}

function dotClass(hint: CapsuleDayHint) {
  if (hint.sealed > 0 && hint.open > 0) return "bg-peach";
  if (hint.sealed > 0) return "bg-blush";
  return "bg-mint";
}

export function CapsuleCalendarHints({
  softPlus,
  hints,
}: {
  softPlus: boolean;
  hints: CapsuleDayHint[];
}) {
  const t = useTranslations("CapsuleHints");
  const format = useFormatter();

  if (!softPlus) {
    return (
      <section
        className="rounded-[2rem] bg-blush/40 px-6 py-8 shadow-card sm:px-8"
        data-capsule-hints="tease"
        aria-labelledby="capsule-hints-title"
      >
        <p className="text-sm text-accent">{t("teaseKicker")}</p>
        <h2 id="capsule-hints-title" className="mt-1 font-display text-2xl tracking-tight">
          {t("teaseTitle")}
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{t("teaseBody")}</p>
        <div className="mt-5 flex gap-2" aria-hidden="true">
          <span className="h-3.5 w-3.5 rounded-full bg-blush/80" />
          <span className="h-3.5 w-3.5 rounded-full bg-peach/80" />
          <span className="h-3.5 w-3.5 rounded-full bg-mint/80" />
        </div>
        <Link
          href="/pricing"
          className="mt-6 inline-flex min-h-11 items-center rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card"
        >
          {t("teaseCta")}
        </Link>
      </section>
    );
  }

  return (
    <section
      className="rounded-[2rem] bg-cream/80 px-6 py-8 shadow-card sm:px-8"
      data-capsule-hints="plus"
      data-capsule-empty={hints.length === 0 ? "1" : "0"}
      aria-labelledby="capsule-hints-title"
    >
      <p className="text-sm text-accent">{t("kicker")}</p>
      <h2 id="capsule-hints-title" className="mt-1 font-display text-2xl tracking-tight">
        {t("title")}
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{t("lead")}</p>
      <ul className="mt-4 flex flex-wrap gap-3 text-xs text-muted">
        <li className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-blush" aria-hidden="true" />
          {t("sealed")}
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-mint" aria-hidden="true" />
          {t("opened")}
        </li>
      </ul>
      {hints.length === 0 ? (
        <p className="mt-5 text-sm leading-relaxed text-muted">{t("empty")}</p>
      ) : (
        <ul className="mt-5 flex flex-wrap gap-2" aria-label={t("title")}>
          {hints.map((hint) => {
            const state =
              hint.sealed > 0 && hint.open > 0
                ? t("mixed", { sealed: hint.sealed, open: hint.open })
                : hint.sealed > 0
                  ? t("sealed")
                  : t("opened");
            const formatted = format.dateTime(hintDate(hint.unlockOn), {
              month: "short",
              day: "numeric",
            });
            return (
              <li key={hint.unlockOn}>
                <span
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-paper px-3 py-2 text-sm shadow-card"
                  data-capsule-day={hint.unlockOn}
                  data-capsule-sealed={hint.sealed}
                  data-capsule-open={hint.open}
                >
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotClass(hint)}`}
                    aria-hidden="true"
                  />
                  <time dateTime={hint.unlockOn}>{formatted}</time>
                  <span className="text-muted">{state}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-4 max-w-xl text-xs leading-relaxed text-muted">{t("privacy")}</p>
      <Link href="/account" className="mt-4 inline-flex text-sm text-accent hover:text-foreground">
        {t("accountLink")}
      </Link>
    </section>
  );
}
