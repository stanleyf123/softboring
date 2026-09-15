"use client";

import { Link } from "@/i18n/navigation";
import {
  clearDraft,
  emptyDraft,
  loadDraft,
  saveDraft,
  saveReview,
  type ReviewAnswers,
} from "@/lib/reviews";
import { useHydrated } from "@/lib/use-hydrated";
import { useTranslations } from "next-intl";
import { useState } from "react";

const TEXT_FIELDS = [
  "energy",
  "drain",
  "lessOf",
  "priorities",
  "summary",
] as const;

export function ReviewForm() {
  const hydrated = useHydrated();

  if (!hydrated) {
    return <div className="min-h-[28rem]" aria-hidden="true" />;
  }

  return <ReviewFormFields />;
}

function ReviewFormFields() {
  const t = useTranslations("Review");
  const tQuestions = useTranslations("Questions");
  const [draft, setDraft] = useState<ReviewAnswers>(loadDraft);
  const [saved, setSaved] = useState(false);

  function update<K extends keyof ReviewAnswers>(key: K, value: ReviewAnswers[K]) {
    setDraft((current) => {
      const next = { ...current, [key]: value };
      saveDraft(next);
      return next;
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveReview(draft);
    setSaved(true);
  }

  function handleWriteAnother() {
    clearDraft();
    setDraft(emptyDraft());
    setSaved(false);
  }

  if (saved) {
    return (
      <section className="rounded-[2rem] bg-paper px-8 py-12">
        <h2 className="font-display text-3xl tracking-tight">{t("successTitle")}</h2>
        <p className="mt-4 max-w-md text-muted leading-relaxed">{t("successBody")}</p>
        <div className="mt-10 flex flex-wrap gap-4 text-sm">
          <Link
            href="/history"
            className="rounded-full bg-accent px-5 py-2.5 text-paper"
          >
            {t("viewHistory")}
          </Link>
          <button
            type="button"
            onClick={handleWriteAnother}
            className="rounded-full px-5 py-2.5 text-muted hover:text-foreground"
          >
            {t("writeAnother")}
          </button>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8" autoComplete="off">
      {TEXT_FIELDS.map((field) => (
        <label key={field} className="block">
          <span className="block text-base leading-relaxed">
            {tQuestions(field)}
          </span>
          <textarea
            value={draft[field]}
            onChange={(event) => update(field, event.target.value)}
            rows={field === "summary" ? 2 : 3}
            className="mt-3 w-full resize-none rounded-3xl border border-line bg-paper px-5 py-4 text-foreground outline-none focus:border-accent"
          />
        </label>
      ))}

      <fieldset>
        <legend className="text-base leading-relaxed">{tQuestions("feeling")}</legend>
        <p className="mt-1 text-sm text-muted">{tQuestions("feelingHint")}</p>
        <div className="mt-4 flex gap-2">
          {[1, 2, 3, 4, 5].map((value) => {
            const selected = draft.feeling === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => update("feeling", value)}
                aria-pressed={selected}
                className={
                  selected
                    ? "h-12 w-12 rounded-full bg-accent text-paper"
                    : "h-12 w-12 rounded-full border border-line bg-paper text-muted"
                }
              >
                {value}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col items-start gap-3 pt-2">
        <button
          type="submit"
          className="rounded-full bg-accent px-6 py-3 text-paper"
        >
          {t("submit")}
        </button>
        <p className="text-sm text-muted">{t("draftHint")}</p>
      </div>
    </form>
  );
}
