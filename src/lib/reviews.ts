/**
 * Browser helpers for weekly reviews.
 * Submitted reviews live in SQLite via /api/reviews.
 * Drafts still stay in localStorage on this device.
 * A one-time import copies older localStorage reviews into the API.
 */

import {
  emptyDraft,
  type Review,
  type ReviewAnswers,
} from "@/lib/review-types";

export { emptyDraft, type Review, type ReviewAnswers };

export type HistoryReview = Review & { locked: boolean };

export type ReviewAccessInfo = {
  isGuest: boolean;
  softPlus: boolean;
  plan: "free" | "soft_plus";
  email: string | null;
  totalCount: number;
  lockedCount: number;
  visibleLimit: number | null;
};

const REVIEWS_KEY = "softboring.weekly.reviews.v1";
const DRAFT_KEY = "softboring.weekly.draft.v1";
const MIGRATED_KEY = "softboring.weekly.migrated-to-sqlite.v1";

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

function loadLocalReviews(): Review[] {
  const reviews = readJson<Review[]>(REVIEWS_KEY, []);
  return [...reviews].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }
  return data;
}

export async function fetchReviews(): Promise<{
  reviews: HistoryReview[];
  access: ReviewAccessInfo;
}> {
  const data = await readJsonResponse<{
    reviews: HistoryReview[];
    access: ReviewAccessInfo;
  }>(await fetch("/api/reviews", { cache: "no-store" }));
  return data;
}

export async function fetchReview(
  id: string,
): Promise<{ review: Review } | { locked: true; createdAt?: string } | undefined> {
  const response = await fetch(`/api/reviews/${encodeURIComponent(id)}`, {
    cache: "no-store",
  });
  if (response.status === 404) return undefined;
  if (response.status === 403) {
    const data = (await response.json().catch(() => ({}))) as {
      locked?: boolean;
      createdAt?: string;
    };
    if (data.locked) return { locked: true, createdAt: data.createdAt };
  }
  const data = await readJsonResponse<{ review: Review }>(response);
  return { review: data.review };
}

export async function createReview(
  answers: ReviewAnswers & { locale?: string },
): Promise<{ review: Review; access: ReviewAccessInfo }> {
  const data = await readJsonResponse<{ review: Review; access: ReviewAccessInfo }>(
    await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(answers),
    }),
  );
  clearDraft();
  return data;
}

export async function fetchTrendPoints(): Promise<
  | { ok: true; points: Array<{ id: string; createdAt: string; feeling: number }> }
  | { ok: false; locked: boolean }
> {
  const response = await fetch("/api/reviews/trends", { cache: "no-store" });
  if (response.status === 403) return { ok: false, locked: true };
  const data = await readJsonResponse<{
    points: Array<{ id: string; createdAt: string; feeling: number }>;
  }>(response);
  return { ok: true, points: data.points };
}

let migratePromise: Promise<void> | null = null;

export function ensureLocalReviewsMigrated() {
  if (!migratePromise) {
    migratePromise = migrateLocalReviewsOnce();
  }
  return migratePromise;
}

async function migrateLocalReviewsOnce() {
  if (!canUseStorage()) return;
  if (window.localStorage.getItem(MIGRATED_KEY)) return;

  const reviews = loadLocalReviews();
  if (reviews.length > 0) {
    await readJsonResponse(
      await fetch("/api/reviews/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviews }),
      }),
    );
  }

  window.localStorage.setItem(MIGRATED_KEY, "1");
}
