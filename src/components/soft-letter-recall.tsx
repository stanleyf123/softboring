"use client";

import { Link } from "@/i18n/navigation";
import { useHydrated } from "@/lib/use-hydrated";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type LetterPayload = {
  weekKey: string;
  letter: { body: string; weekKey: string } | null;
  current?: boolean;
};

/** Read-only letter for the week of a saved review. Soft+ only. */
export function SoftLetterRecall({
  createdAt,
  softPlus,
}: {
  createdAt: string;
  softPlus: boolean;
}) {
  const t = useTranslations("SoftLetter");
  const hydrated = useHydrated();
  const [letter, setLetter] = useState<LetterPayload | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!hydrated || !softPlus) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(
          `/api/soft-letters?at=${encodeURIComponent(createdAt)}`,
          { cache: "no-store" },
        );
        if (!response.ok) {
          if (!cancelled) setError(true);
          return;
        }
        const data = (await response.json()) as LetterPayload;
        if (!cancelled) setLetter(data);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [createdAt, hydrated, softPlus]);

  if (!softPlus) return null;
  if (!hydrated || (!letter && !error)) return null;
  if (error || !letter) return null;

  return (
    <section
      className="mt-10 rounded-[1.75rem] bg-blush/40 px-6 py-6 print:hidden"
      data-soft-letter-recall
    >
      <p className="text-sm text-accent">{t("plusKicker")}</p>
      <p className="mt-1 font-display text-lg tracking-tight">{t("recallTitle")}</p>
      <p className="mt-1 text-xs text-muted">{t("weekLabel", { week: letter.weekKey })}</p>
      {letter.letter?.body ? (
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{letter.letter.body}</p>
      ) : (
        <p className="mt-4 text-sm leading-relaxed text-muted">{t("recallEmpty")}</p>
      )}
      {letter.current ? (
        <Link href="/review" className="mt-4 inline-flex text-sm text-accent">
          {t("editThisWeek")}
        </Link>
      ) : null}
    </section>
  );
}
