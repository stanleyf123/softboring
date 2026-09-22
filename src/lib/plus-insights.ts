import type { Review } from "@/lib/review-types";
import {
  calendarInTimeZone,
  DEFAULT_TIMEZONE,
  normalizeTimeZone,
  sameCalendarMonth,
} from "./timezone.ts";

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "the",
  "to",
  "of",
  "in",
  "on",
  "for",
  "with",
  "that",
  "this",
  "was",
  "were",
  "is",
  "it",
  "i",
  "me",
  "my",
  "we",
  "our",
  "you",
  "at",
  "as",
  "but",
  "or",
  "from",
  "not",
  "just",
  "very",
  "really",
  "too",
  "so",
  "be",
  "been",
  "had",
  "have",
  "has",
  "did",
  "do",
  "a",
  "the",
  "的",
  "了",
  "是",
  "我",
  "很",
  "也",
  "都",
  "在",
  "有",
  "不",
  "就",
  "這",
  "那",
  "與",
  "和",
  "一個",
  "什麼",
]);

export type KeywordChip = {
  word: string;
  count: number;
};

export function isoWeekKeyFromParts(year: number, month: number, day: number) {
  const utc = new Date(Date.UTC(year, month - 1, day));
  const weekday = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** ISO week from the runtime's local calendar date. Existing streak math uses this. */
export function isoWeekKey(date: Date) {
  return isoWeekKeyFromParts(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/** ISO week for a civil date in the member's timezone. */
export function isoWeekKeyInTimeZone(date: Date, timeZone?: string | null) {
  const cal = calendarInTimeZone(date, normalizeTimeZone(timeZone));
  return isoWeekKeyFromParts(cal.year, cal.month, cal.day);
}

export const STREAK_MILESTONES = [2, 4, 8, 12] as const;
export type StreakMilestone = (typeof STREAK_MILESTONES)[number];

export function streakMilestone(streak: number): StreakMilestone | null {
  return (STREAK_MILESTONES as readonly number[]).includes(streak)
    ? (streak as StreakMilestone)
    : null;
}

export function previousIsoWeekKey(key: string) {
  const match = /^(\d{4})-W(\d{2})$/.exec(key);
  if (!match) return key;
  const year = Number(match[1]);
  const week = Number(match[2]);
  if (week > 1) return `${year}-W${String(week - 1).padStart(2, "0")}`;
  return `${year - 1}-W52`;
}

export type WeeklyStreakOptions = {
  /** Pause weeks are skipped: they neither add to the streak nor break it. */
  pausedWeeks?: Iterable<string>;
  /** When set, review dates are bucketed in this timezone so pause keys match. */
  timeZone?: string | null;
};

const WEEK_KEY_PATTERN = /^\d{4}-W\d{2}$/;

export function weeklyStreak(
  createdAts: string[],
  now = new Date(),
  options?: WeeklyStreakOptions,
) {
  const keyFor = (date: Date) =>
    options?.timeZone ? isoWeekKeyInTimeZone(date, options.timeZone) : isoWeekKey(date);
  const weeks = new Set(
    createdAts
      .map((value) => new Date(value))
      .filter((date) => !Number.isNaN(date.getTime()))
      .map((date) => keyFor(date)),
  );
  const paused = new Set(
    [...(options?.pausedWeeks ?? [])].filter(
      (key) => typeof key === "string" && WEEK_KEY_PATTERN.test(key),
    ),
  );
  if (weeks.size === 0) return 0;

  let cursor = keyFor(now);
  if (!weeks.has(cursor) && !paused.has(cursor)) {
    cursor = previousIsoWeekKey(cursor);
  }
  let streak = 0;
  for (let guard = 0; guard < 104; guard += 1) {
    if (paused.has(cursor)) {
      cursor = previousIsoWeekKey(cursor);
      continue;
    }
    if (!weeks.has(cursor)) break;
    streak += 1;
    cursor = previousIsoWeekKey(cursor);
  }
  return streak;
}

function tokenize(text: string) {
  const tokens: string[] = [];
  const latin = text.toLowerCase().match(/[a-z0-9']{2,}/g) ?? [];
  tokens.push(...latin);
  const cjk = text.match(/[\u3400-\u9fff]{2,}/g) ?? [];
  for (const chunk of cjk) {
    if (chunk.length <= 6) {
      tokens.push(chunk);
      continue;
    }
    for (let i = 0; i < chunk.length - 1; i += 1) {
      tokens.push(chunk.slice(i, i + 2));
    }
  }
  return tokens.filter((token) => !STOPWORDS.has(token));
}

export function keywordChips(texts: string[], limit = 8): KeywordChip[] {
  const counts = new Map<string, number>();
  for (const text of texts) {
    for (const token of tokenize(text)) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}

export function reviewMatchesQuery(
  review: Review,
  query: string,
  moodLabel?: string | null,
) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const parts = [
    review.summary,
    review.energy,
    review.drain,
    review.lessOf,
    review.priorities,
    review.mood ?? "",
    moodLabel ?? "",
    ...(review.customAnswers ?? []).flatMap((item) => [item.prompt, item.answer]),
  ];
  return parts.join("\n").toLowerCase().includes(needle);
}

export function csvEscape(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function reviewsToCsv(reviews: Review[]) {
  const header = [
    "created_at",
    "summary",
    "feeling",
    "energy",
    "drain",
    "less_of",
    "priorities",
    "custom_1_prompt",
    "custom_1_answer",
    "custom_2_prompt",
    "custom_2_answer",
    "custom_3_prompt",
    "custom_3_answer",
  ];
  const rows = reviews.map((review) => {
    const custom = review.customAnswers ?? [];
    return [
      csvEscape(review.createdAt),
      csvEscape(review.summary),
      csvEscape(review.feeling),
      csvEscape(review.energy),
      csvEscape(review.drain),
      csvEscape(review.lessOf),
      csvEscape(review.priorities),
      csvEscape(custom[0]?.prompt),
      csvEscape(custom[0]?.answer),
      csvEscape(custom[1]?.prompt),
      csvEscape(custom[1]?.answer),
      csvEscape(custom[2]?.prompt),
      csvEscape(custom[2]?.answer),
    ].join(",");
  });
  return [header.join(","), ...rows].join("\n");
}

export type MonthlyDigest = {
  year: number;
  month: number;
  timeZone: string;
  count: number;
  avgFeeling: number | null;
  streak: number;
  energyKeywords: KeywordChip[];
  drainKeywords: KeywordChip[];
};

export function monthlyDigestFromReviews(
  reviews: Array<
    Pick<Review, "createdAt" | "feeling"> &
      Partial<Pick<Review, "energy" | "drain">>
  >,
  now = new Date(),
  timeZone: string = DEFAULT_TIMEZONE,
  options?: { pausedWeeks?: Iterable<string> },
): MonthlyDigest {
  const zone = normalizeTimeZone(timeZone);
  const today = calendarInTimeZone(now, zone);
  const inMonth = reviews.filter((review) => {
    const date = new Date(review.createdAt);
    if (Number.isNaN(date.getTime())) return false;
    return sameCalendarMonth(date, now, zone);
  });
  const feelings = inMonth
    .map((review) => review.feeling)
    .filter((value): value is number => typeof value === "number");
  const avgFeeling =
    feelings.length === 0
      ? null
      : Math.round((feelings.reduce((sum, value) => sum + value, 0) / feelings.length) * 10) /
        10;
  return {
    year: today.year,
    month: today.month,
    timeZone: zone,
    count: inMonth.length,
    avgFeeling,
    streak: weeklyStreak(
      reviews.map((review) => review.createdAt),
      now,
      options?.pausedWeeks && [...options.pausedWeeks].length > 0
        ? { pausedWeeks: options.pausedWeeks, timeZone: zone }
        : undefined,
    ),
    energyKeywords: keywordChips(
      inMonth.map((review) => review.energy ?? "").filter(Boolean),
      6,
    ),
    drainKeywords: keywordChips(
      inMonth.map((review) => review.drain ?? "").filter(Boolean),
      6,
    ),
  };
}
