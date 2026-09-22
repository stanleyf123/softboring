import { isoWeekKeyInTimeZone } from "@/lib/plus-insights";

/** A short letter back to an earlier week. Longer than a whisper, shorter than a future-me letter. */
export const PAST_SELF_LETTER_MAX = 280;

const WEEK_KEY_RE = /^(\d{4})-W(\d{2})$/;

export function pastSelfWeekKey(date: Date, timeZone?: string | null) {
  return isoWeekKeyInTimeZone(date, timeZone);
}

function weekRank(weekKey: string) {
  const match = WEEK_KEY_RE.exec(weekKey);
  if (!match) return null;
  return Number(match[1]) * 100 + Number(match[2]);
}

/** True when the review's week is strictly before the current week in that timezone. */
export function isPastWeek(
  reviewCreatedAt: string,
  now: Date,
  timeZone?: string | null,
) {
  const reviewDate = new Date(reviewCreatedAt);
  if (Number.isNaN(reviewDate.getTime()) || Number.isNaN(now.getTime())) return false;
  const reviewRank = weekRank(pastSelfWeekKey(reviewDate, timeZone));
  const nowRank = weekRank(pastSelfWeekKey(now, timeZone));
  if (reviewRank === null || nowRank === null) return false;
  return reviewRank < nowRank;
}

/** Trim and cap by Unicode code points so a CJK letter is not split mid-character. */
export function parsePastSelfLetterBody(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = Array.from(value.trim()).slice(0, PAST_SELF_LETTER_MAX).join("").trim();
  return trimmed.length > 0 ? trimmed : null;
}
