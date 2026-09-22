import { monthlyDigestFromReviews } from "@/lib/plus-insights";
import { FREE_HISTORY_LIMIT } from "@/lib/plan";
import type { Review } from "@/lib/review-types";
import { calendarInTimeZone, normalizeTimeZone, sameCalendarMonth } from "@/lib/timezone";

export type SoftMonthCard = {
  id: string;
  createdAt: string;
  locked: boolean;
  summary: string;
  energy: string;
  drain: string;
  lessOf: string;
  priorities: string;
  feeling: number | null;
  customAnswers: Review["customAnswers"];
};

export type SoftMonthSnapshot = {
  year: number;
  month: number;
  timeZone: string;
  softPlus: boolean;
  monthCount: number;
  visibleCount: number;
  lockedCount: number;
  avgFeeling: number | null;
  streak: number;
  energyKeywords: Array<{ word: string; count: number }>;
  drainKeywords: Array<{ word: string; count: number }>;
  reviews: SoftMonthCard[];
};

function lockedCard(review: Review): SoftMonthCard {
  return {
    id: review.id,
    createdAt: review.createdAt,
    locked: true,
    summary: "",
    energy: "",
    drain: "",
    lessOf: "",
    priorities: "",
    feeling: null,
    customAnswers: [],
  };
}

function openCard(review: Review): SoftMonthCard {
  return {
    id: review.id,
    createdAt: review.createdAt,
    locked: false,
    summary: review.summary,
    energy: review.energy,
    drain: review.drain,
    lessOf: review.lessOf,
    priorities: review.priorities,
    feeling: review.feeling,
    customAnswers: review.customAnswers ?? [],
  };
}

/**
 * Current calendar month in the user's timezone.
 * Free desks keep wording from the latest four reviews only.
 */
export function buildSoftMonthSnapshot(
  reviewsNewestFirst: Review[],
  options: {
    now?: Date;
    timeZone?: string | null;
    softPlus: boolean;
    pausedWeeks?: Iterable<string>;
  },
): SoftMonthSnapshot {
  const timeZone = normalizeTimeZone(options.timeZone);
  const now = options.now ?? new Date();
  const { year, month } = calendarInTimeZone(now, timeZone);
  const inMonth = reviewsNewestFirst.filter((review) => {
    const date = new Date(review.createdAt);
    if (Number.isNaN(date.getTime())) return false;
    return sameCalendarMonth(date, now, timeZone);
  });
  const unlockedIds = new Set(
    (options.softPlus
      ? reviewsNewestFirst
      : reviewsNewestFirst.slice(0, FREE_HISTORY_LIMIT)
    ).map((review) => review.id),
  );
  const reviews = inMonth.map((review) =>
    unlockedIds.has(review.id) ? openCard(review) : lockedCard(review),
  );
  const visibleCount = reviews.filter((review) => !review.locked).length;
  const pausedWeeks = [...(options.pausedWeeks ?? [])];
  const digest = monthlyDigestFromReviews(
    options.softPlus
      ? reviewsNewestFirst
      : reviewsNewestFirst.slice(0, FREE_HISTORY_LIMIT),
    now,
    timeZone,
    pausedWeeks.length > 0 ? { pausedWeeks } : undefined,
  );

  return {
    year,
    month,
    timeZone,
    softPlus: options.softPlus,
    monthCount: inMonth.length,
    visibleCount,
    lockedCount: reviews.length - visibleCount,
    avgFeeling: digest.avgFeeling,
    streak: digest.streak,
    energyKeywords: digest.energyKeywords,
    drainKeywords: digest.drainKeywords,
    reviews,
  };
}
