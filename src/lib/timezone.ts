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

function zonedClock(date: Date, timeZone: string) {
  const zone = normalizeTimeZone(timeZone);
  const bag: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)) {
    if (part.type !== "literal") bag[part.type] = part.value;
  }
  const hour = Number(bag.hour);
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour: hour === 24 ? 0 : hour,
    minute: Number(bag.minute),
  };
}

/** Local calendar midnight in `timeZone`, as a UTC instant. */
export function zonedMidnightToUtc(
  year: number,
  month: number,
  day: number,
  timeZone: string,
) {
  const zone = normalizeTimeZone(timeZone);
  let utc = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const seen = zonedClock(new Date(utc), zone);
    const seenUtc = Date.UTC(seen.year, seen.month - 1, seen.day, seen.hour, seen.minute);
    const wanted = Date.UTC(year, month - 1, day, 0, 0);
    const diff = wanted - seenUtc;
    if (diff === 0) break;
    utc += diff;
  }
  return new Date(utc);
}

/** Monday 00:00 in the member's timezone — the quiet start of this ISO week. */
export function startOfIsoWeek(now = new Date(), timeZone?: string | null) {
  const zone = normalizeTimeZone(timeZone);
  const cal = calendarInTimeZone(now, zone);
  const daysSinceMonday = (cal.weekday + 6) % 7;
  const monday = new Date(Date.UTC(cal.year, cal.month - 1, cal.day - daysSinceMonday));
  return zonedMidnightToUtc(
    monday.getUTCFullYear(),
    monday.getUTCMonth() + 1,
    monday.getUTCDate(),
    zone,
  );
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
