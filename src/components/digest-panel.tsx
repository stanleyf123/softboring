"use client";

import { EmptyState } from "@/components/empty-state";
import { SoftPostcardFromDigest } from "@/components/soft-postcard-button";
import { Link } from "@/i18n/navigation";
import type { MonthlyDigest } from "@/lib/plus-insights";
import { useFormatter, useTranslations } from "next-intl";

export function DigestPanel({ digest }: { digest: MonthlyDigest }) {
  const t = useTranslations("Digest");
  const format = useFormatter();
  const monthLabel = format.dateTime(new Date(digest.year, digest.month - 1, 1), {
    month: "long",
    year: "numeric",
  });

  if (digest.count === 0) {
    return (
      <EmptyState
        title={t("emptyTitle")}
        body={t("empty")}
        ctaHref="/review"
        ctaLabel={t("emptyCta")}
        wash="bg-paper"
        illustration="digest"
      />
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] bg-paper px-6 py-8 shadow-card sm:px-8">
        <p className="text-sm text-muted">{t("monthLabel", { month: monthLabel })}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.4rem] bg-peach/60 px-4 py-4">
            <p className="text-sm text-muted">{t("countLabel")}</p>
            <p className="mt-1 font-display text-2xl tracking-tight">
              {t("count", { count: digest.count })}
            </p>
          </div>
          <div className="rounded-[1.4rem] bg-mint/60 px-4 py-4">
            <p className="text-sm text-muted">{t("feelingLabel")}</p>
            <p className="mt-1 font-display text-2xl tracking-tight">
              {digest.avgFeeling == null
                ? t("feelingEmpty")
                : t("feeling", { value: digest.avgFeeling })}
            </p>
          </div>
          <div className="rounded-[1.4rem] bg-blush/60 px-4 py-4">
            <p className="text-sm text-muted">{t("streakLabel")}</p>
            <p className="mt-1 font-display text-2xl tracking-tight">
              {t("streak", { count: digest.streak })}
            </p>
          </div>
        </div>

        <KeywordRow
          title={t("energyTitle")}
          chips={digest.energyKeywords}
          tone="mint"
          empty={t("chipsEmpty")}
        />
        <KeywordRow
          title={t("drainTitle")}
          chips={digest.drainKeywords}
          tone="blush"
          empty={t("chipsEmpty")}
        />

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/trends"
            className="rounded-full bg-mint px-5 py-2.5 text-sm shadow-card"
          >
            {t("seeTrends")}
          </Link>
          <Link
            href="/year"
            className="rounded-full border border-line px-5 py-2.5 text-sm text-muted"
          >
            {t("seeYear")}
          </Link>
          <Link
            href="/history"
            className="rounded-full border border-line px-5 py-2.5 text-sm text-muted"
          >
            {t("seeHistory")}
          </Link>
        </div>
      </section>
      <SoftPostcardFromDigest digest={digest} />
    </div>
  );
}

function KeywordRow({
  title,
  chips,
  tone,
  empty,
}: {
  title: string;
  chips: Array<{ word: string; count: number }>;
  tone: "mint" | "blush";
  empty: string;
}) {
  const wash = tone === "mint" ? "bg-mint/70" : "bg-blush/70";
  return (
    <div className="mt-8">
      <p className="text-sm text-muted">{title}</p>
      {chips.length === 0 ? (
        <p className="mt-3 text-sm leading-relaxed text-muted">{empty}</p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <li
              key={chip.word}
              className={`rounded-full ${wash} px-3 py-1.5 text-sm`}
            >
              {chip.word}
              <span className="ml-1.5 text-xs text-muted">×{chip.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
