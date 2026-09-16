"use client";

import { ShareToWall } from "@/components/share-to-wall";
import { StreakCelebration } from "@/components/streak-celebration";
import { Link } from "@/i18n/navigation";
import { answersForQuestions, type CustomQuestion } from "@/lib/custom-questions";
import type { StreakMilestone } from "@/lib/plus-insights";
import {
  clearDraft,
  createReview,
  emptyDraft,
  loadDraft,
  saveDraft,
  type ReviewAccessInfo,
  type ReviewAnswers,
} from "@/lib/reviews";
import { useHydrated } from "@/lib/use-hydrated";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

const TEXT_FIELDS = [
  "energy",
  "drain",
  "lessOf",
  "priorities",
  "summary",
] as const;

const STREAK_SEEN_KEY = "softboring.streak.celebrated.v1";

function celebratedKey(access: ReviewAccessInfo | null) {
  if (access?.email) return `user:${access.email}`;
  return "guest";
}

function hasCelebrated(ownerKey: string, streak: StreakMilestone) {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(STREAK_SEEN_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, number[]>) : {};
    return (parsed[ownerKey] ?? []).includes(streak);
  } catch {
    return false;
  }
}

function markCelebrated(ownerKey: string, streak: StreakMilestone) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STREAK_SEEN_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, number[]>) : {};
    const next = new Set(parsed[ownerKey] ?? []);
    next.add(streak);
    parsed[ownerKey] = [...next];
    window.localStorage.setItem(STREAK_SEEN_KEY, JSON.stringify(parsed));
  } catch {
    // Ignore quota / private mode.
  }
}

export function ReviewForm({
  signedIn,
  softPlus = false,
  customQuestions = [],
}: {
  signedIn: boolean;
  softPlus?: boolean;
  customQuestions?: CustomQuestion[];
}) {
  const hydrated = useHydrated();

  if (!hydrated) {
    return <div className="min-h-[28rem]" aria-hidden="true" />;
  }

  return (
    <ReviewFormFields
      signedIn={signedIn}
      softPlus={softPlus}
      customQuestions={customQuestions}
    />
  );
}

function ReviewFormFields({
  signedIn,
  softPlus,
  customQuestions,
}: {
  signedIn: boolean;
  softPlus: boolean;
  customQuestions: CustomQuestion[];
}) {
  const t = useTranslations("Review");
  const tQuestions = useTranslations("Questions");
  const locale = useLocale();
  const initial = useMemo(() => {
    const draft = loadDraft();
    if (!softPlus || customQuestions.length === 0) {
      return { ...draft, customAnswers: [] };
    }
    return {
      ...draft,
      customAnswers: answersForQuestions(customQuestions, draft.customAnswers ?? []),
    };
  }, [softPlus, customQuestions]);
  const [draft, setDraft] = useState<ReviewAnswers>(initial);
  const [saved, setSaved] = useState(false);
  const [savedReviewId, setSavedReviewId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [access, setAccess] = useState<ReviewAccessInfo | null>(null);
  const [milestone, setMilestone] = useState<StreakMilestone | null>(null);

  function update<K extends keyof ReviewAnswers>(key: K, value: ReviewAnswers[K]) {
    setDraft((current) => {
      const next = { ...current, [key]: value };
      saveDraft(next);
      return next;
    });
  }

  function updateCustom(id: string, answer: string) {
    setDraft((current) => {
      const nextAnswers = (current.customAnswers ?? []).map((item) =>
        item.id === id ? { ...item, answer } : item,
      );
      const next = { ...current, customAnswers: nextAnswers };
      saveDraft(next);
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(false);
    try {
      const payload = {
        ...draft,
        locale,
        customAnswers: softPlus ? draft.customAnswers : [],
      };
      const result = await createReview(payload);
      setAccess(result.access);
      setSavedReviewId(result.review.id);
      setSaved(true);
      if (
        result.milestone &&
        !hasCelebrated(celebratedKey(result.access), result.milestone)
      ) {
        markCelebrated(celebratedKey(result.access), result.milestone);
        setMilestone(result.milestone);
      }
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  function handleWriteAnother() {
    clearDraft();
    const next = emptyDraft();
    if (softPlus && customQuestions.length > 0) {
      next.customAnswers = answersForQuestions(customQuestions, []);
    }
    setDraft(next);
    setSaved(false);
    setSavedReviewId(null);
    setError(false);
    setAccess(null);
    setMilestone(null);
  }

  if (saved) {
    const guest = !signedIn;
    const manyWeeks = (access?.totalCount ?? 0) >= 4;
    return (
      <section className="space-y-6">
        {signedIn && savedReviewId ? (
          <ShareToWall reviewId={savedReviewId} initialNoteId={null} variant="hero" />
        ) : null}

        <div className="rounded-[2rem] bg-paper px-8 py-12 shadow-card">
          <h2 className="font-display text-3xl tracking-tight">{t("successTitle")}</h2>
          <p className="mt-4 max-w-md text-muted leading-relaxed">{t("successBody")}</p>
          <div className="mt-10 flex flex-wrap gap-4 text-sm">
            <Link
              href="/history"
              className={
                signedIn
                  ? "inline-flex min-h-11 items-center rounded-full border border-line px-5 py-2.5 text-muted"
                  : "inline-flex min-h-11 items-center rounded-full bg-accent px-5 py-2.5 text-paper shadow-card"
              }
            >
              {t("viewHistory")}
            </Link>
            <button
              type="button"
              onClick={handleWriteAnother}
              className="inline-flex min-h-11 items-center rounded-full px-5 py-2.5 text-muted hover:text-foreground"
            >
              {t("writeAnother")}
            </button>
          </div>
        </div>

        {guest ? (
          <div className="rounded-[1.75rem] bg-blush/80 px-6 py-6 shadow-card sm:px-8">
            <h3 className="font-display text-2xl tracking-tight">
              {manyWeeks ? t("guestNudgeTitleMany") : t("guestNudgeTitle")}
            </h3>
            <p className="mt-3 max-w-md leading-relaxed text-muted">
              {manyWeeks ? t("guestNudgeBodyMany") : t("guestNudgeBody")}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={{ pathname: "/register", query: { next: "/history" } }}
                className="rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card"
              >
                {t("guestNudgeCta")}
              </Link>
              <Link
                href={{ pathname: "/login", query: { next: "/history" } }}
                className="rounded-full border border-line px-5 py-2.5 text-sm text-muted"
              >
                {t("guestNudgeLogin")}
              </Link>
            </div>
          </div>
        ) : null}

        {signedIn && access && !access.softPlus && (access.lockedCount > 0 || manyWeeks) ? (
          <div className="rounded-[1.75rem] bg-peach/80 px-6 py-6 shadow-card sm:px-8">
            <h3 className="font-display text-2xl tracking-tight">{t("upgradeNudgeTitle")}</h3>
            <p className="mt-3 max-w-md leading-relaxed text-muted">{t("upgradeNudgeBody")}</p>
            <Link
              href="/pricing"
              className="mt-6 inline-flex min-h-11 items-center rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card"
            >
              {t("upgradeNudgeCta")}
            </Link>
          </div>
        ) : null}

        {milestone ? (
          <StreakCelebration
            streak={milestone}
            softPlus={Boolean(access?.softPlus)}
            onClose={() => setMilestone(null)}
          />
        ) : null}
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8" autoComplete="off">
      <div className="grid gap-8 lg:grid-cols-2">
        {TEXT_FIELDS.map((field) => (
          <label key={field} className={field === "summary" ? "block lg:col-span-2" : "block"}>
            <span className="block text-base leading-relaxed">
              {tQuestions(field)}
            </span>
            <textarea
              value={draft[field]}
              onChange={(event) => update(field, event.target.value)}
              rows={field === "summary" ? 2 : 3}
              className="mt-3 w-full resize-none rounded-3xl border border-line bg-paper px-5 py-4 text-foreground shadow-card outline-none focus:border-accent"
            />
          </label>
        ))}
      </div>

      {softPlus && draft.customAnswers.length > 0 ? (
        <fieldset className="rounded-[1.75rem] bg-mint/40 px-5 py-6">
          <legend className="font-display text-xl tracking-tight">{t("customHeading")}</legend>
          <p className="mt-2 text-sm text-muted">{t("customLead")}</p>
          <div className="mt-4 grid gap-5 lg:grid-cols-2">
            {draft.customAnswers.map((item) => (
              <label key={item.id} className="block">
                <span className="block text-base leading-relaxed">{item.prompt}</span>
                <textarea
                  value={item.answer}
                  onChange={(event) => updateCustom(item.id, event.target.value)}
                  rows={3}
                  className="mt-3 w-full resize-none rounded-3xl border border-line bg-paper px-5 py-4 text-foreground shadow-card outline-none focus:border-accent"
                />
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

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
                    ? "h-12 w-12 rounded-full bg-accent text-paper shadow-card"
                    : "h-12 w-12 rounded-full border border-line bg-peach/60 text-muted"
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
          disabled={saving}
          className="min-h-11 rounded-full bg-accent px-6 py-3 text-paper shadow-soft disabled:opacity-60"
        >
          {saving ? t("saving") : t("submit")}
        </button>
        {error ? <p className="text-sm text-muted">{t("saveError")}</p> : null}
        <p className="text-sm text-muted">{t("draftHint")}</p>
      </div>
    </form>
  );
}
