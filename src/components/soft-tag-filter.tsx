"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export function SoftTagFilter({
  softPlus,
  isGuest,
  tags,
  active,
  onActive,
}: {
  softPlus: boolean;
  isGuest: boolean;
  tags: string[];
  active: string | null;
  onActive: (tag: string | null) => void;
}) {
  const t = useTranslations("History");

  if (!softPlus) {
    return (
      <section
        className="rounded-[1.75rem] bg-lavender/60 px-6 py-5 shadow-card"
        data-soft-tags="tease"
      >
        <p className="font-display text-lg tracking-tight">{t("tagsTeaseTitle")}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {isGuest ? t("tagsGuestBody") : t("tagsTeaseBody")}
        </p>
        <Link
          href="/pricing"
          className="mt-4 inline-flex rounded-full bg-accent px-4 py-2 text-sm text-paper shadow-card"
        >
          {t("tagsTeaseCta")}
        </Link>
      </section>
    );
  }

  return (
    <section
      className="rounded-[1.75rem] bg-paper px-6 py-5 shadow-card"
      data-soft-tags="filter"
    >
      <p className="font-display text-lg tracking-tight">{t("tagsTitle")}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{t("tagsLead")}</p>
      {tags.length === 0 ? (
        <p className="mt-4 text-sm leading-relaxed text-muted">{t("tagsEmpty")}</p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={t("tagsFilterAria")}>
          <button
            type="button"
            onClick={() => onActive(null)}
            aria-pressed={active == null}
            className={`rounded-full px-3 py-1.5 text-sm shadow-card ${
              active == null ? "bg-accent text-paper" : "bg-cream text-foreground"
            }`}
          >
            {t("tagsAll")}
          </button>
          {tags.map((tag) => {
            const selected = active?.toLocaleLowerCase() === tag.toLocaleLowerCase();
            return (
              <button
                key={tag.toLocaleLowerCase()}
                type="button"
                onClick={() => onActive(selected ? null : tag)}
                aria-pressed={selected}
                className={`rounded-full px-3 py-1.5 text-sm shadow-card ${
                  selected ? "bg-accent text-paper" : "bg-mint/80 text-foreground"
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
