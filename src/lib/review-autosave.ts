import type { ReviewAnswers } from "@/lib/review-types";

/** Local draft timestamp. The review itself is still saved only when you submit. */
export const DRAFT_SAVED_AT_KEY = "softboring.weekly.draft.savedAt.v1";

export type AutosavePhase = "idle" | "saving" | "saved";

export type AutosaveMoment = "just" | "moment" | "minutes" | "later";

const JUST_MS = 10_000;
const MOMENT_MS = 120_000;
const LATER_MS = 60 * 60_000;

const EXCERPT_FIELDS = ["energy", "drain", "lessOf", "priorities", "summary"] as const;

/** A shallow copy so restoring a local draft does not share nested answers with the form. */
export function copyReviewAnswers(draft: ReviewAnswers): ReviewAnswers {
  return {
    ...draft,
    customAnswers: (draft.customAnswers ?? []).map((item) => ({ ...item })),
  };
}

/**
 * The first written line of a local review draft, clipped by Unicode code points.
 * A feeling number or mood id alone is not a line of writing.
 */
export function reviewDraftExcerpt(
  draft: Partial<ReviewAnswers> | null | undefined,
  max = 72,
): string {
  if (!draft) return "";
  const limit = Number.isFinite(max) && max > 0 ? Math.floor(max) : 72;
  const pieces: string[] = [];
  for (const field of EXCERPT_FIELDS) {
    const value = draft[field];
    if (typeof value === "string" && value.trim()) pieces.push(value.trim());
  }
  for (const item of draft.customAnswers ?? []) {
    if (typeof item?.answer === "string" && item.answer.trim()) pieces.push(item.answer.trim());
  }
  const first = pieces[0];
  if (!first) return "";
  const chars = Array.from(first);
  if (chars.length <= limit) return chars.join("");
  return chars.slice(0, limit).join("");
}

export function draftHasContent(
  draft: Partial<
    Pick<
      ReviewAnswers,
      "energy" | "drain" | "lessOf" | "priorities" | "summary" | "feeling" | "mood" | "customAnswers"
    >
  >,
): boolean {
  if (typeof draft.feeling === "number") return true;
  if (typeof draft.mood === "string" && draft.mood.trim().length > 0) return true;
  const fields = [draft.energy, draft.drain, draft.lessOf, draft.priorities, draft.summary];
  if (fields.some((value) => typeof value === "string" && value.trim().length > 0)) return true;
  return (draft.customAnswers ?? []).some(
    (item) => typeof item?.answer === "string" && item.answer.trim().length > 0,
  );
}

export function readDraftSavedAt(storage: Pick<Storage, "getItem"> | null): number | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(DRAFT_SAVED_AT_KEY);
    if (!raw) return null;
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) return null;
    return value;
  } catch {
    return null;
  }
}

export function writeDraftSavedAt(storage: Pick<Storage, "setItem"> | null, at: number) {
  if (!storage || !Number.isFinite(at) || at <= 0) return;
  try {
    storage.setItem(DRAFT_SAVED_AT_KEY, String(Math.floor(at)));
  } catch {
    // Private mode or a full disk can refuse the quiet timestamp.
  }
}

export function clearDraftSavedAt(storage: Pick<Storage, "removeItem"> | null) {
  try {
    storage?.removeItem(DRAFT_SAVED_AT_KEY);
  } catch {
    // Ignore storage that will not forget.
  }
}

/**
 * Quiet relative time for a local draft.
 * Under two minutes the line stays “a moment ago”; longer pauses become minutes, then “earlier”.
 */
export function autosaveMoment(savedAtMs: number, nowMs: number): AutosaveMoment {
  if (!Number.isFinite(savedAtMs) || !Number.isFinite(nowMs)) return "later";
  const delta = nowMs - savedAtMs;
  if (delta < JUST_MS) return "just";
  if (delta < MOMENT_MS) return "moment";
  if (delta < LATER_MS) return "minutes";
  return "later";
}

export function autosaveMinutesAgo(savedAtMs: number, nowMs: number): number {
  if (!Number.isFinite(savedAtMs) || !Number.isFinite(nowMs)) return 1;
  const delta = Math.max(0, nowMs - savedAtMs);
  return Math.min(59, Math.max(1, Math.floor(delta / 60_000)));
}

export function autosaveView(
  phase: AutosavePhase,
  savedAtMs: number | null,
  nowMs: number,
): { phase: AutosavePhase; moment: "none" | AutosaveMoment; minutes: number } {
  if (phase === "saving") return { phase: "saving", moment: "none", minutes: 0 };
  if (phase !== "saved") return { phase: "idle", moment: "none", minutes: 0 };
  if (savedAtMs == null) return { phase: "saved", moment: "later", minutes: 0 };
  const moment = autosaveMoment(savedAtMs, nowMs);
  return {
    phase: "saved",
    moment,
    minutes: moment === "minutes" ? autosaveMinutesAgo(savedAtMs, nowMs) : 0,
  };
}
