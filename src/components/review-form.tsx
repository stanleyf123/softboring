"use client";

import { ReviewProgressDots } from "@/components/review-progress-dots";
import { ShareToWall } from "@/components/share-to-wall";
import { SoftWordCount } from "@/components/soft-word-count";
import { WeekMoodPicker } from "@/components/week-mood-picker";
import {
  SeasonalPacksPanel,
  packPrompts,
} from "@/components/seasonal-packs-panel";
import { SoftSaveBloom } from "@/components/soft-save-bloom";
import { SoftTemplates } from "@/components/soft-templates";
import { StreakCelebration } from "@/components/streak-celebration";
import { Link } from "@/i18n/navigation";
import {
  answersForQuestions,
  type CustomQuestion,
} from "@/lib/custom-questions";
import type { StreakMilestone } from "@/lib/plus-insights";
import {
  autosaveView,
  clearDraftSavedAt,
  draftHasContent,
  readDraftSavedAt,
  writeDraftSavedAt,
  type AutosavePhase,
} from "@/lib/review-autosave";
import {
  clearDraft,
  createReview,
  emptyDraft,
  loadDraft,
  saveDraft,
  type ReviewAccessInfo,
  type ReviewAnswers,
} from "@/lib/reviews";
import type { SeasonalPackId } from "@/lib/seasonal-packs";
import { isWeekMood, WEEK_MOOD_TINT, type WeekMood } from "@/lib/week-mood";
import { useHydrated } from "@/lib/use-hydrated";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

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
  const tPacks = useTranslations("SeasonalPacks");
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
  const [autosavePhase, setAutosavePhase] = useState<AutosavePhase>(() =>
    draftHasContent(initial) ? "saved" : "idle",
  );
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(() =>
    draftHasContent(initial) ? readDraftSavedAt(window.localStorage) : null,
  );
  const [autosaveNow, setAutosaveNow] = useState(() => Date.now());
  const autosaveTimer = useRef<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [savedReviewId, setSavedReviewId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [access, setAccess] = useState<ReviewAccessInfo | null>(null);
  const [milestone, setMilestone] = useState<StreakMilestone | null>(null);
  const [activePackId, setActivePackId] = useState<SeasonalPackId | null>(null);
  const [liveCustomQuestions, setLiveCustomQuestions] =
    useState<CustomQuestion[]>(customQuestions);

  const questionLabel = (field: (typeof TEXT_FIELDS)[number] | "feeling") => {
    if (activePackId) {
      return packPrompts(tPacks, activePackId)[field];
    }
    return tQuestions(field);
  };

  useEffect(() => {
    if (autosavePhase !== "saved") return;
    const id = window.setInterval(() => setAutosaveNow(Date.now()), 10_000);
    return () => window.clearInterval(id);
  }, [autosavePhase]);

  useEffect(() => {
    return () => {
      if (autosaveTimer.current != null) window.clearTimeout(autosaveTimer.current);
    };
  }, []);

  function stopAutosaveTimer() {
    if (autosaveTimer.current != null) {
      window.clearTimeout(autosaveTimer.current);
      autosaveTimer.current = null;
    }
  }

  function persistDraft(next: ReviewAnswers, now: number) {
    saveDraft(next);
    const has = draftHasContent(next);
    if (has) {
      writeDraftSavedAt(window.localStorage, now);
      setDraftSavedAt(now);
    } else {
      clearDraftSavedAt(window.localStorage);
      setDraftSavedAt(null);
    }
    setAutosavePhase("saving");
    setAutosaveNow(now);
    stopAutosaveTimer();
    autosaveTimer.current = window.setTimeout(() => {
      setAutosavePhase(has ? "saved" : "idle");
      setAutosaveNow(Date.now());
    }, 420);
  }

  function update<K extends keyof ReviewAnswers>(key: K, value: ReviewAnswers[K], now: number) {
    const next = { ...draft, [key]: value };
    setDraft(next);
    persistDraft(next, now);
  }

  function updateCustom(id: string, answer: string, now: number) {
    const next = {
      ...draft,
      customAnswers: (draft.customAnswers ?? []).map((item) =>
        item.id === id ? { ...item, answer } : item,
      ),
    };
    setDraft(next);
    persistDraft(next, now);
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
      stopAutosaveTimer();
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
    if (softPlus && liveCustomQuestions.length > 0) {
      next.customAnswers = answersForQuestions(liveCustomQuestions, []);
    }
    stopAutosaveTimer();
    setDraft(next);
    setAutosavePhase("idle");
    setDraftSavedAt(null);
    setSaved(false);
    setSavedReviewId(null);
    setError(false);
    setAccess(null);
    setMilestone(null);
    setActivePackId(null);
  }

  function applyPackToCustom(questions: CustomQuestion[]) {
    setLiveCustomQuestions(questions);
    const next = {
      ...draft,
      customAnswers: answersForQuestions(questions, draft.customAnswers ?? []),
    };
    setDraft(next);
    window.setTimeout(() => persistDraft(next, Date.now()), 0);
  }

  if (saved) {
    const guest = !signedIn;
    const manyWeeks = (access?.totalCount ?? 0) >= 4;
    return (
      <section className="space-y-6">
        {signedIn && savedReviewId ? (
          <ShareToWall
            reviewId={savedReviewId}
            initialNoteId={null}
            variant="hero"
            softPlus={softPlus}
            mood={draft.mood && isWeekMood(draft.mood) ? draft.mood : null}
          />
        ) : null}

        <SoftSaveBloom>
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
        </SoftSaveBloom>

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

  const moodTint =
    signedIn && draft.mood && isWeekMood(draft.mood) ? WEEK_MOOD_TINT[draft.mood] : "";

  return (
    <form
      onSubmit={handleSubmit}
      className={`soft-review-sheet space-y-8 ${moodTint ? `rounded-[2rem] px-4 py-6 sm:px-6 ${moodTint}` : ""}`}
      autoComplete="off"
    >
      <SoftTemplates
        values={{
          energy: draft.energy,
          drain: draft.drain,
          lessOf: draft.lessOf,
          priorities: draft.priorities,
          summary: draft.summary,
        }}
        onInsert={(answers, now) => {
          const next = { ...draft, ...answers };
          setDraft(next);
          persistDraft(next, now);
        }}
      />

      {softPlus ? (
        <SeasonalPacksPanel
          mode="review"
          activePackId={activePackId}
          onUseThisWeek={setActivePackId}
          onClearThisWeek={() => setActivePackId(null)}
          onCustomApplied={applyPackToCustom}
        />
      ) : null}

      <ReviewProgressDots
        values={{
          energy: draft.energy,
          drain: draft.drain,
          lessOf: draft.lessOf,
          priorities: draft.priorities,
          summary: draft.summary,
        }}
        labels={{
          energy: questionLabel("energy"),
          drain: questionLabel("drain"),
          lessOf: questionLabel("lessOf"),
          priorities: questionLabel("priorities"),
          summary: questionLabel("summary"),
        }}
      />

      <div className="grid gap-8 lg:grid-cols-2">
        {TEXT_FIELDS.map((field) => (
          <label key={field} className={field === "summary" ? "block lg:col-span-2" : "block"}>
            <span className="block text-base leading-relaxed">
              {questionLabel(field)}
            </span>
            <textarea
              value={draft[field]}
              onChange={(event) => update(field, event.target.value, Date.now())}
              rows={field === "summary" ? 2 : 3}
              className="mt-3 w-full resize-none rounded-3xl border border-line bg-paper px-5 py-4 text-foreground shadow-card outline-none focus:border-accent"
            />
          </label>
        ))}
      </div>

      {softPlus && draft.customAnswers && draft.customAnswers.length > 0 ? (
        <fieldset className="rounded-[1.75rem] bg-mint/40 px-5 py-6">
          <legend className="font-display text-xl tracking-tight">{t("customHeading")}</legend>
          <p className="mt-2 text-sm text-muted">{t("customLead")}</p>
          <div className="mt-4 grid gap-5 lg:grid-cols-2">
            {draft.customAnswers.map((item) => (
              <label key={item.id} className="block">
                <span className="block text-base leading-relaxed">{item.prompt}</span>
                <textarea
                  value={item.answer}
                  onChange={(event) => updateCustom(item.id, event.target.value, Date.now())}
                  rows={3}
                  className="mt-3 w-full resize-none rounded-3xl border border-line bg-paper px-5 py-4 text-foreground shadow-card outline-none focus:border-accent"
                />
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {signedIn ? (
        <WeekMoodPicker
          mood={draft.mood && isWeekMood(draft.mood) ? draft.mood : null}
          onChange={(next: WeekMood | null) => update("mood", next, Date.now())}
        />
      ) : null}

      <fieldset>
        <legend className="text-base leading-relaxed">{questionLabel("feeling")}</legend>
        <p className="mt-1 text-sm text-muted">{tQuestions("feelingHint")}</p>
        <div className="mt-4 flex gap-2">
          {[1, 2, 3, 4, 5].map((value) => {
            const selected = draft.feeling === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => update("feeling", value, Date.now())}
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

      <div className="flex flex-col items-start gap-3 pt-2 print:hidden">
        <SoftWordCount
          parts={[
            ...TEXT_FIELDS.map((field) => draft[field]),
            ...(draft.customAnswers ?? []).map((item) => item.answer),
          ]}
        />
        <button
          type="submit"
          disabled={saving}
          className="min-h-11 rounded-full bg-accent px-6 py-3 text-paper shadow-soft disabled:opacity-60"
        >
          {saving ? t("saving") : t("submit")}
        </button>
        {error ? <p className="text-sm text-muted">{t("saveError")}</p> : null}
        <ReviewAutosaveStatus
          phase={autosavePhase}
          savedAt={draftSavedAt}
          now={autosaveNow}
        />
      </div>
    </form>
  );
}

function ReviewAutosaveStatus({
  phase,
  savedAt,
  now,
}: {
  phase: AutosavePhase;
  savedAt: number | null;
  now: number;
}) {
  const t = useTranslations("Review");
  const view = autosaveView(phase, savedAt, now);
  const label =
    view.phase === "saving"
      ? t("autosaveSaving")
      : view.moment === "just"
        ? t("autosaveJustNow")
        : view.moment === "moment"
          ? t("autosaveMoment")
          : view.moment === "minutes"
            ? t("autosaveMinutes", { minutes: view.minutes })
            : view.moment === "later"
              ? t("autosaveLater")
              : t("draftHint");

  return (
    <div className="space-y-1">
      <p
        className="text-sm text-muted"
        role="status"
        aria-live="polite"
        data-review-autosave={view.phase}
        data-review-autosave-moment={view.moment}
      >
        <span className={`soft-autosave-dot soft-autosave-dot-${view.phase}`} aria-hidden="true" />
        {label}
      </p>
      {view.phase === "idle" ? null : <p className="text-sm text-muted">{t("draftHint")}</p>}
    </div>
  );
}
