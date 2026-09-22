export const DEFAULT_TIMEZONE = "Asia/Taipei";

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const ZONE_PATTERN = /^[A-Za-z0-9_+\/-]{1,64}$/;

export function isIanaTimeZone(value: string) {
  if (!ZONE_PATTERN.test(value)) return false;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}

export function normalizeTimeZone(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (isIanaTimeZone(trimmed)) return trimmed;
  }
  return DEFAULT_TIMEZONE;
}

export type ZonedCalendar = {
  year: number;
  month: number;
  day: number;
  weekday: number;
};

export function calendarInTimeZone(date: Date, timeZone: string): ZonedCalendar {
  const zone = normalizeTimeZone(timeZone);
  const bag: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date)) {
    if (part.type !== "literal") bag[part.type] = part.value;
  }
  const weekday = WEEKDAY_INDEX[bag.weekday ?? ""];
  if (weekday === undefined || !bag.year || !bag.month || !bag.day) {
    throw new Error(`Could not read calendar in ${zone}`);
  }
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    weekday,
  };
}

export function sameCalendarDay(a: Date, b: Date, timeZone: string) {
  const left = calendarInTimeZone(a, timeZone);
  const right = calendarInTimeZone(b, timeZone);
  return left.year === right.year && left.month === right.month && left.day === right.day;
}

export function sameCalendarMonth(a: Date, b: Date, timeZone: string) {
  const left = calendarInTimeZone(a, timeZone);
  const right = calendarInTimeZone(b, timeZone);
  return left.year === right.year && left.month === right.month;
}

export type ReminderCandidate = {
  weekday: number;
  lastSentAt: string | null;
  timeZone: string | null;
};

/**
 * Cron still wakes on the server clock. Due means "this instant is the
 * chosen weekday in the member's timezone, and we have not already sent
 * during that timezone's calendar day."
 */
export function reminderIsDue(candidate: ReminderCandidate, now = new Date()) {
  const zone = normalizeTimeZone(candidate.timeZone);
  const today = calendarInTimeZone(now, zone);
  const wanted =
    Number.isInteger(candidate.weekday) && candidate.weekday >= 0 && candidate.weekday <= 6
      ? candidate.weekday
      : 0;
  if (today.weekday !== wanted) return false;
  if (!candidate.lastSentAt) return true;
  const sent = new Date(candidate.lastSentAt);
  if (Number.isNaN(sent.getTime())) return true;
  return !sameCalendarDay(sent, now, zone);
}
