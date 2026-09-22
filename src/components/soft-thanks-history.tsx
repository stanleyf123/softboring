"use client";

import { Link } from "@/i18n/navigation";
import {
  shapeSoftThanksHistory,
  type SoftThanksEntry,
} from "@/lib/soft-thanks-history";
import { useFormatter, useTranslations } from "next-intl";
import { useId } from "react";

export function SoftThanksHistory({
  softPlus,
  notes,
}: {
  softPlus: boolean;
  notes: SoftThanksEntry[];
}) {
  const t = useTranslations("SoftThanks");
  const format = useFormatter();
  const titleId = useId();

  if (!softPlus) {
    return (
      <section
        className="mt-8 rounded-[1.5rem] bg-peach/45 px-5 py-5"
        data-soft-thanks-tease=""
        aria-labelledby={titleId}
      >
        <p className="text-sm text-accent">{t("eyebrow")}</p>
        <h2 id={titleId} className="mt-1 font-display text-lg tracking-tight">
          {t("teaseTitle")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("teaseBody")}</p>
        <Link
          href="/pricing"
          className="mt-4 inline-flex min-h-11 items-center rounded-full bg-paper px-4 py-2 text-sm shadow-card"
        >
          {t("teaseCta")}
        </Link>
      </section>
    );
  }

  const visible = shapeSoftThanksHistory(notes);

  return (
    <section
      className="mt-8 rounded-[1.5rem] bg-cream/80 px-5 py-5"
      data-soft-thanks-history=""
      aria-labelledby={titleId}
    >
      <p className="text-sm text-accent">{t("eyebrow")}</p>
      <h2 id={titleId} className="mt-1 font-display text-lg tracking-tight">
        {t("title")}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">{t("lead")}</p>
      {visible.length === 0 ? (
        <p className="mt-4 text-sm leading-relaxed text-muted">{t("empty")}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {visible.map((note) => {
            const when = format.dateTime(new Date(note.at), { dateStyle: "medium" });
            return (
              <li key={note.noteId} className="rounded-[1.2rem] bg-paper/85 px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm">{note.nickname?.trim() || t("neighbor")}</p>
                  <time className="text-xs text-muted" dateTime={note.at}>
                    {when}
                  </time>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {note.hidden ? t("hidden") : note.excerpt || t("quiet")}
                </p>
                {note.hidden ? null : (
                  <Link
                    href={{ pathname: "/wall", query: { note: note.noteId } }}
                    className="mt-3 inline-flex min-h-11 items-center text-sm text-accent"
                  >
                    {t("open")}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
