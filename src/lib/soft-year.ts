import { isoWeekKey } from "@/lib/plus-insights";
import type { Review } from "@/lib/review-types";

export type SoftYearCell = {
  weekKey: string;
  week: number;
  reviewId: string | null;
  feeling: number | null;
  createdAt: string | null;
};

export type SoftYearTimeline = {
  year: number;
  cells: SoftYearCell[];
  filledCount: number;
  avgFeeling: number | null;
};

/** Monday UTC of ISO week `week` in `year` (ISO week-year). */
export function mondayOfIsoWeek(year: number, week: number) {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));
  const monday = new Date(mondayWeek1);
  monday.setUTCDate(mondayWeek1.getUTCDate() + (week - 1) * 7);
  return monday;
}

export function isoWeekCount(year: number) {
  // Dec 28 is always in the last ISO week of its year.
  const key = isoWeekKey(new Date(Date.UTC(year, 11, 28)));
  const match = /^(\d{4})-W(\d{2})$/.exec(key);
  if (!match || Number(match[1]) !== year) return 52;
  return Number(match[2]);
}

export function feelingDotClass(feeling: number | null) {
  if (feeling == null) return "bg-line/70";
  if (feeling <= 1) return "bg-blush";
  if (feeling === 2) return "bg-peach";
  if (feeling === 3) return "bg-lemon";
  if (feeling === 4) return "bg-mint";
  return "bg-accent";
}

/**
 * One cell per ISO week in `year`. When a week has several reviews,
 * keep the newest (by createdAt).
 */
export function softYearFromReviews(
  reviews: Array<Pick<Review, "id" | "createdAt" | "feeling">>,
  year: number,
): SoftYearTimeline {
  const byWeek = new Map<string, SoftYearCell>();

  for (const review of reviews) {
    const date = new Date(review.createdAt);
    if (Number.isNaN(date.getTime())) continue;
    const weekKey = isoWeekKey(date);
    const match = /^(\d{4})-W(\d{2})$/.exec(weekKey);
    if (!match || Number(match[1]) !== year) continue;
    const week = Number(match[2]);
    const existing = byWeek.get(weekKey);
    const nextTime = date.getTime();
    const existingTime = existing?.createdAt
      ? new Date(existing.createdAt).getTime()
      : Number.NEGATIVE_INFINITY;
    if (!existing || nextTime >= existingTime) {
      byWeek.set(weekKey, {
        weekKey,
        week,
        reviewId: review.id,
        feeling: review.feeling,
        createdAt: review.createdAt,
      });
    }
  }

  const weeks = isoWeekCount(year);
  const cells: SoftYearCell[] = [];
  for (let week = 1; week <= weeks; week += 1) {
    const weekKey = `${year}-W${String(week).padStart(2, "0")}`;
    cells.push(
      byWeek.get(weekKey) ?? {
        weekKey,
        week,
        reviewId: null,
        feeling: null,
        createdAt: null,
      },
    );
  }

  const filled = cells.filter((cell) => cell.reviewId);
  const feelings = filled
    .map((cell) => cell.feeling)
    .filter((value): value is number => typeof value === "number");
  const avgFeeling =
    feelings.length === 0
      ? null
      : Math.round((feelings.reduce((sum, value) => sum + value, 0) / feelings.length) * 10) /
        10;

  return {
    year,
    cells,
    filledCount: filled.length,
    avgFeeling,
  };
}

export function softYearForDate(
  reviews: Array<Pick<Review, "id" | "createdAt" | "feeling">>,
  now = new Date(),
) {
  return softYearFromReviews(reviews, now.getFullYear());
}
