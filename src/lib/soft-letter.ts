import { isoWeekKeyInTimeZone } from "@/lib/plus-insights";

/** Private letter to future me — longer than a mid-week note, still one breath. */
export const SOFT_LETTER_MAX = 800;

const WEEK_KEY_RE = /^(\d{4})-W(0[1-9]|[1-4]\d|5[0-3])$/;

export function isSoftLetterWeekKey(value: unknown): value is string {
  return typeof value === "string" && WEEK_KEY_RE.test(value);
}

export function softLetterWeekYear(weekKey: string): number | null {
  const match = WEEK_KEY_RE.exec(weekKey);
  return match ? Number(match[1]) : null;
}

export function letterWeekKey(date: Date, timeZone?: string | null) {
  return isoWeekKeyInTimeZone(date, timeZone);
}

/** Trim and cap by Unicode code points so CJK letters are not split mid-character. */
export function parseSoftLetterBody(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = Array.from(value.trim()).slice(0, SOFT_LETTER_MAX).join("").trim();
  return trimmed.length > 0 ? trimmed : null;
}

export type LetterReviewLink = {
  weekKey: string;
  body: string;
  reviewId: string | null;
};

/** Newest review in each ISO week (caller should pass newest-first reviews). */
export function matchLettersToReviews<T extends { weekKey: string; body: string }>(
  letters: T[],
  reviews: Array<{ id: string; createdAt: string }>,
  timeZone?: string | null,
): Array<T & { reviewId: string | null }> {
  const reviewByWeek = new Map<string, string>();
  for (const review of reviews) {
    const date = new Date(review.createdAt);
    if (Number.isNaN(date.getTime())) continue;
    const key = letterWeekKey(date, timeZone);
    if (!reviewByWeek.has(key)) reviewByWeek.set(key, review.id);
  }
  return letters.map((letter) => ({
    ...letter,
    reviewId: reviewByWeek.get(letter.weekKey) ?? null,
  }));
}
