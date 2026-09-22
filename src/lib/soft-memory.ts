import { FREE_HISTORY_LIMIT } from "@/lib/plan";
import { noteExcerpt } from "@/lib/wall-canvas";

/** Four weeks in milliseconds — only resurface notes at least this old. */
export const SOFT_MEMORY_MIN_AGE_MS = 28 * 24 * 60 * 60 * 1000;

export type SoftMemoryCandidate = {
  id: string;
  createdAt: string;
  summary: string;
  energy: string;
};

export type SoftMemory = {
  id: string;
  createdAt: string;
  excerpt: string;
  locked: boolean;
};

function utcDayNumber(date: Date) {
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) /
      86_400_000,
  );
}

/**
 * About two of every three UTC days — a soft occasional card, not every visit.
 */
export function shouldSurfaceSoftMemory(date: Date = new Date()) {
  return utcDayNumber(date) % 3 !== 0;
}

export function isSoftMemoryAgeEligible(
  createdAt: string,
  now: Date = new Date(),
) {
  const at = Date.parse(createdAt);
  if (!Number.isFinite(at)) return false;
  return at <= now.getTime() - SOFT_MEMORY_MIN_AGE_MS;
}

/**
 * Pick one past review (newest-first list) from 4+ weeks ago.
 * Soft+ always gets the excerpt; free only if that week is still in the free window.
 */
export function pickSoftMemory(
  reviewsNewestFirst: SoftMemoryCandidate[],
  softPlus: boolean,
  now: Date = new Date(),
): SoftMemory | null {
  if (!shouldSurfaceSoftMemory(now)) return null;

  const eligible = reviewsNewestFirst
    .map((review, index) => ({ review, index }))
    .filter(({ review }) => isSoftMemoryAgeEligible(review.createdAt, now));
  if (eligible.length === 0) return null;

  const pick = eligible[utcDayNumber(now) % eligible.length];
  const unlocked = softPlus || pick.index < FREE_HISTORY_LIMIT;
  const excerpt = unlocked
    ? noteExcerpt(pick.review.summary, pick.review.energy)
    : "";

  return {
    id: pick.review.id,
    createdAt: pick.review.createdAt,
    excerpt,
    locked: !unlocked,
  };
}
