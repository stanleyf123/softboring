import { calendarInTimeZone, normalizeTimeZone, sameCalendarMonth } from "@/lib/timezone";

const WEEK_KEY = /^(\d{4})-W(\d{2})$/;

export type MonthlySoftReport = {
  year: number;
  month: number;
  timeZone: string;
  thanksGiven: number;
  echoes: number;
  gratitudesDrawn: number;
  pauseWeeks: number;
};

export function sanitizeReportCount(value: number) {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(9999, Math.floor(value));
}

export function instantInCalendarMonth(
  iso: string,
  now: Date,
  timeZone?: string | null,
) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  return sameCalendarMonth(date, now, normalizeTimeZone(timeZone));
}

export function countInstantsInMonth(
  instants: string[],
  now: Date,
  timeZone?: string | null,
) {
  const zone = normalizeTimeZone(timeZone);
  return instants.reduce(
    (sum, iso) => sum + (instantInCalendarMonth(iso, now, zone) ? 1 : 0),
    0,
  );
}

/** Monday (UTC civil date) of an ISO week, or null when the key is not a week. */
export function isoWeekMonday(weekKey: string) {
  const match = WEEK_KEY.exec(weekKey);
  if (!match) return null;
  const weekYear = Number(match[1]);
  const week = Number(match[2]);
  if (week < 1 || week > 53) return null;
  const jan4 = new Date(Date.UTC(weekYear, 0, 4));
  const jan4Weekday = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - (jan4Weekday - 1) + (week - 1) * 7);
  return monday;
}

/** True when any of the week's seven civil days falls in the given month. */
export function isoWeekTouchesMonth(weekKey: string, year: number, month: number) {
  const monday = isoWeekMonday(weekKey);
  if (!monday) return false;
  for (let offset = 0; offset < 7; offset += 1) {
    const day = new Date(monday);
    day.setUTCDate(monday.getUTCDate() + offset);
    if (day.getUTCFullYear() === year && day.getUTCMonth() + 1 === month) return true;
  }
  return false;
}

/**
 * Pause keys are timezone ISO weeks. A week counts for this month when it
 * overlaps the member's current calendar month — including a week that
 * starts in the previous month.
 */
export function pauseWeeksTouchingMonth(
  weekKeys: string[],
  now: Date,
  timeZone?: string | null,
) {
  const zone = normalizeTimeZone(timeZone);
  const { year, month } = calendarInTimeZone(now, zone);
  const unique = new Set(weekKeys.filter((key) => typeof key === "string" && WEEK_KEY.test(key)));
  let count = 0;
  for (const key of unique) {
    if (isoWeekTouchesMonth(key, year, month)) count += 1;
  }
  return count;
}

export function assembleMonthlySoftReport(
  counts: {
    thanksGiven: number;
    echoes: number;
    gratitudesDrawn: number;
    pauseWeeks: number;
  },
  now: Date,
  timeZone?: string | null,
): MonthlySoftReport {
  const zone = normalizeTimeZone(timeZone);
  const { year, month } = calendarInTimeZone(now, zone);
  return {
    year,
    month,
    timeZone: zone,
    thanksGiven: sanitizeReportCount(counts.thanksGiven),
    echoes: sanitizeReportCount(counts.echoes),
    gratitudesDrawn: sanitizeReportCount(counts.gratitudesDrawn),
    pauseWeeks: sanitizeReportCount(counts.pauseWeeks),
  };
}
