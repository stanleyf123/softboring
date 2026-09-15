/**
 * Local-only weekly review store.
 * Swap this for Supabase (see .env.example) when auth + persistence are wired up.
 */

export type ReviewAnswers = {
  energy: string;
  drain: string;
  lessOf: string;
  priorities: string;
  feeling: number | null;
  summary: string;
};

export type Review = ReviewAnswers & {
  id: string;
  createdAt: string;
};

export const emptyDraft = (): ReviewAnswers => ({
  energy: "",
  drain: "",
  lessOf: "",
  priorities: "",
  feeling: null,
  summary: "",
});

const REVIEWS_KEY = "softboring.weekly.reviews.v1";
const DRAFT_KEY = "softboring.weekly.draft.v1";

function canUseStorage() {
  return typeof window !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function loadDraft(): ReviewAnswers {
  const draft = readJson<Partial<ReviewAnswers> | null>(DRAFT_KEY, null);
  return { ...emptyDraft(), ...draft };
}

export function saveDraft(draft: ReviewAnswers) {
  writeJson(DRAFT_KEY, draft);
}

export function clearDraft() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(DRAFT_KEY);
}

export function loadReviews(): Review[] {
  const reviews = readJson<Review[]>(REVIEWS_KEY, []);
  return [...reviews].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function loadReview(id: string): Review | undefined {
  return loadReviews().find((review) => review.id === id);
}

export function saveReview(answers: ReviewAnswers): Review {
  const review: Review = {
    ...answers,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const reviews = loadReviews();
  writeJson(REVIEWS_KEY, [review, ...reviews]);
  clearDraft();
  return review;
}
