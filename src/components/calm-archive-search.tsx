"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export function CalmArchiveSearch({
  softPlus,
  isGuest,
  query,
  onQuery,
}: {
  softPlus: boolean;
  isGuest: boolean;
  query: string;
  onQuery: (value: string) => void;
}) {
  const t = useTranslations("History");

  if (softPlus) {
    return (
      <section
        className="rounded-[1.75rem] bg-paper px-6 py-5 shadow-card"
        data-archive-search="open"
      >
        <p className="font-display text-lg tracking-tight">{t("archiveTitle")}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("archiveLead")}</p>
        <label className="mt-4 block">
          <span className="sr-only">{t("searchLabel")}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder={t("archivePlaceholder")}
            className="w-full rounded-full border border-line bg-cream/70 px-4 py-2.5 text-sm outline-none focus:border-accent"
          />
        </label>
      </section>
    );
  }

  return (
    <section
      className="rounded-[1.75rem] bg-peach/70 px-6 py-5 shadow-card"
      data-archive-search="tease"
    >
      <p className="font-display text-lg tracking-tight">{t("archiveTeaseTitle")}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {isGuest ? t("archiveGuestBody") : t("archiveTeaseBody")}
      </p>
      <label className="mt-4 block">
        <span className="sr-only">{t("searchLabel")}</span>
        <input
          type="search"
          value=""
          disabled
          placeholder={t("archivePlaceholder")}
          className="w-full cursor-not-allowed rounded-full border border-line bg-paper/70 px-4 py-2.5 text-sm text-muted"
        />
      </label>
      <div className="mt-4 flex flex-wrap gap-2">
        {isGuest ? (
          <Link
            href={{ pathname: "/register", query: { next: "/history" } }}
            className="inline-flex rounded-full bg-paper px-4 py-2 text-sm shadow-card"
          >
            {t("archiveGuestCta")}
          </Link>
        ) : null}
        <Link
          href="/pricing"
          className="inline-flex rounded-full bg-accent px-4 py-2 text-sm text-paper shadow-card"
        >
          {t("archiveTeaseCta")}
        </Link>
      </div>
    </section>
  );
}
