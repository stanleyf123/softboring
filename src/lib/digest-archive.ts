import { calendarInTimeZone, normalizeTimeZone, zonedMidnightToUtc } from "@/lib/timezone";

export type DigestArchiveMonth = {
  year: number;
  month: number;
  count: number;
  avgFeeling: number | null;
};

export type DigestArchiveSource = {
  createdAt: string;
  feeling?: number | null;
};

const MONTH_KEY = /^(\d{4})-(\d{2})$/;

export function digestMonthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function parseDigestMonthKey(value: unknown): { year: number; month: number } | null {
  if (typeof value !== "string") return null;
  const match = MONTH_KEY.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (year < 2000 || year > 2100 || month < 1 || month > 12) return null;
  return { year, month };
}

/**
 * Noon on the last calendar day of that month, in the member's timezone.
 * `Date.UTC(year, month, 0)` uses a 1-based month and lands on its last day.
 */
export function instantForDigestMonth(year: number, month: number, timeZone?: string | null) {
  const zone = normalizeTimeZone(timeZone);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const midnight = zonedMidnightToUtc(year, month, lastDay, zone);
  return new Date(midnight.getTime() + 12 * 60 * 60 * 1000);
}

function averageFeeling(values: number[]) {
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

/**
 * Past months only. The current month already has its own digest.
 * Counts and feelings — never review text, ids, or emails.
 */
export function listPastDigestMonths(
  reviews: readonly DigestArchiveSource[],
  now = new Date(),
  timeZone?: string | null,
): DigestArchiveMonth[] {
  const zone = normalizeTimeZone(timeZone);
  const today = calendarInTimeZone(now, zone);
  const buckets = new Map<string, { year: number; month: number; count: number; feelings: number[] }>();

  for (const review of reviews) {
    const date = new Date(review.createdAt);
    if (Number.isNaN(date.getTime())) continue;
    const seen = calendarInTimeZone(date, zone);
    if (seen.year === today.year && seen.month === today.month) continue;
    const key = digestMonthKey(seen.year, seen.month);
    const bucket = buckets.get(key) ?? {
      year: seen.year,
      month: seen.month,
      count: 0,
      feelings: [],
    };
    bucket.count += 1;
    if (typeof review.feeling === "number" && Number.isFinite(review.feeling)) {
      bucket.feelings.push(review.feeling);
    }
    buckets.set(key, bucket);
  }

  return [...buckets.values()]
    .sort((a, b) => b.year - a.year || b.month - a.month)
    .map((bucket) => ({
      year: bucket.year,
      month: bucket.month,
      count: bucket.count,
      avgFeeling: averageFeeling(bucket.feelings),
    }));
}
