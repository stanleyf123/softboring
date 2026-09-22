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

export const PAST_LETTER_INBOX_LIMIT = 24;

export type PastLetterInboxSource = {
  id: string;
  reviewId: string;
  body: string;
  summary?: string | null;
  reviewCreatedAt: string;
  updatedAt: string;
};

export type PastLetterInboxItem = {
  id: string;
  reviewId: string;
  body: string;
  summary: string;
  weekKey: string;
  updatedAt: string;
  past: boolean;
};

/** Full short letter for the in-app inbox, capped the same way as a saved letter. */
export function pastLetterInboxBody(body: string) {
  return Array.from(body.trim()).slice(0, PAST_SELF_LETTER_MAX).join("").trim();
}

/**
 * Newest-first letters already kept on past weeks.
 * The caller supplies order. Empty bodies stay out. No account fields are copied in.
 */
export function presentPastLetterInbox(
  letters: PastLetterInboxSource[],
  timeZone: string | null | undefined,
  now: Date,
  limit = PAST_LETTER_INBOX_LIMIT,
): PastLetterInboxItem[] {
  const cap =
    Number.isFinite(limit) && limit > 0
      ? Math.min(100, Math.floor(limit))
      : PAST_LETTER_INBOX_LIMIT;
  const items: PastLetterInboxItem[] = [];
  for (const letter of letters) {
    if (items.length >= cap) break;
    const body = pastLetterInboxBody(letter.body);
    if (!body) continue;
    const created = new Date(letter.reviewCreatedAt);
    const weekKey = Number.isNaN(created.getTime()) ? "" : pastSelfWeekKey(created, timeZone);
    items.push({
      id: letter.id,
      reviewId: letter.reviewId,
      body,
      summary: (letter.summary ?? "").trim(),
      weekKey,
      updatedAt: letter.updatedAt,
      past: isPastWeek(letter.reviewCreatedAt, now, timeZone),
    });
  }
  return items;
}

/** Trim and cap by Unicode code points so a CJK letter is not split mid-character. */
export function parsePastSelfLetterBody(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = Array.from(value.trim()).slice(0, PAST_SELF_LETTER_MAX).join("").trim();
  return trimmed.length > 0 ? trimmed : null;
}
