"use client";

import { Link } from "@/i18n/navigation";
import type { PastLetterInboxItem } from "@/lib/past-self-letter";
import { useHydrated } from "@/lib/use-hydrated";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type InboxPayload = {
  letters: PastLetterInboxItem[];
  timeZone?: string;
};

export function PastLetterInbox({
  signedIn,
  softPlus,
}: {
  signedIn: boolean;
  softPlus: boolean;
}) {
  const t = useTranslations("PastLetter");
  const format = useFormatter();
  const hydrated = useHydrated();
  const [inbox, setInbox] = useState<InboxPayload | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!hydrated || !signedIn || !softPlus) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/past-letters", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) setLoadError(true);
          return;
        }
        const data = (await response.json()) as InboxPayload;
        if (!cancelled) setInbox({ letters: Array.isArray(data.letters) ? data.letters : [] });
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, signedIn, softPlus]);

  const shell = "mt-8 rounded-[1.5rem] bg-cream/80 px-5 py-5";

  if (!signedIn) {
    return (
      <section className={shell} data-past-letter-inbox="guest" aria-labelledby="past-letter-inbox-title">
        <p className="text-sm text-accent">{t("plusKicker")}</p>
        <p id="past-letter-inbox-title" className="mt-1 font-display text-lg tracking-tight">
          {t("inboxTitle")}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("inboxGuestBody")}</p>
        <Link
          href={{ pathname: "/login", query: { next: "/account" } }}
          className="mt-4 inline-flex min-h-11 items-center rounded-full border border-line px-4 py-2 text-sm text-muted"
        >
          {t("loginCta")}
        </Link>
      </section>
    );
  }

  if (!softPlus) {
    return (
      <section className={shell} data-past-letter-inbox="tease" aria-labelledby="past-letter-inbox-title">
        <p className="text-sm text-accent">{t("plusKicker")}</p>
        <p id="past-letter-inbox-title" className="mt-1 font-display text-lg tracking-tight">
          {t("inboxTeaseTitle")}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("inboxTeaseBody")}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("inboxPrivacy")}</p>
        <Link
          href="/pricing"
          className="mt-4 inline-flex min-h-11 items-center rounded-full bg-accent px-4 py-2 text-sm text-paper shadow-card"
        >
          {t("teaseCta")}
        </Link>
      </section>
    );
  }

  if (!hydrated || (!inbox && !loadError)) {
    return (
      <section
        className={shell}
        data-past-letter-inbox="loading"
        aria-labelledby="past-letter-inbox-title"
        aria-busy="true"
      >
        <p id="past-letter-inbox-title" className="font-display text-lg tracking-tight">
          {t("inboxTitle")}
        </p>
        <p className="mt-2 text-sm text-muted">{t("inboxLoading")}</p>
      </section>
    );
  }

  if (loadError || !inbox) {
    return (
      <section className={shell} data-past-letter-inbox="error" aria-labelledby="past-letter-inbox-title">
        <p id="past-letter-inbox-title" className="font-display text-lg tracking-tight">
          {t("inboxTitle")}
        </p>
        <p className="mt-2 text-sm text-muted">{t("inboxError")}</p>
      </section>
    );
  }

  const letters = inbox.letters;

  return (
    <section className={shell} data-past-letter-inbox="open" aria-labelledby="past-letter-inbox-title">
      <p className="text-sm text-accent">{t("plusKicker")}</p>
      <p id="past-letter-inbox-title" className="mt-1 font-display text-lg tracking-tight">
        {t("inboxTitle")}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{t("inboxLead")}</p>
      {letters.length === 0 ? (
        <div className="mt-4" data-past-letter-inbox-empty>
          <p className="text-sm leading-relaxed text-muted">{t("inboxEmpty")}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">{t("inboxEmptyHint")}</p>
        </div>
      ) : (
        <>
          <p className="mt-4 text-xs text-muted">{t("inboxCount", { count: letters.length })}</p>
          <ul className="mt-3 space-y-3" data-past-letter-inbox-list>
            {letters.map((letter) => {
              const updated = new Date(letter.updatedAt);
              const when = Number.isNaN(updated.getTime())
                ? null
                : format.dateTime(updated, { dateStyle: "medium" });
              const summary = letter.summary.trim();
              return (
                <li
                  key={letter.id}
                  className="rounded-[1.25rem] bg-paper/90 px-4 py-3 shadow-card"
                  data-past-letter={letter.id}
                >
                  {letter.weekKey ? (
                    <p className="text-xs text-muted">{t("weekLabel", { week: letter.weekKey })}</p>
                  ) : null}
                  <p className="mt-1 text-sm leading-relaxed">{summary || t("quietWeek")}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">
                    {letter.body}
                  </p>
                  {when ? <p className="mt-2 text-xs text-muted">{when}</p> : null}
                  <Link
                    href={`/history/${letter.reviewId}#past-self-letter`}
                    className="mt-2 inline-flex min-h-11 items-center text-sm text-accent"
                  >
                    {t("inboxOpen")}
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
      <p className="mt-4 text-xs leading-relaxed text-muted">{t("inboxPrivacy")}</p>
    </section>
  );
}
