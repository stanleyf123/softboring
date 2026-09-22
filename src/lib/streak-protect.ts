import { currentPauseWeekKey, isPauseWeekKey } from "@/lib/pause-week";
import { isoWeekKeyInTimeZone, weeklyStreak } from "@/lib/plus-insights";
import { calendarInTimeZone, normalizeTimeZone } from "@/lib/timezone";

/** One gentle pause per calendar month, in the member's timezone. */
export const STREAK_PROTECT_PER_MONTH = 1;

const MONTH_KEY_PATTERN = /^\d{4}-\d{2}$/;

export function isMonthKey(value: string) {
  return MONTH_KEY_PATTERN.test(value);
}

export function monthKeyInTimeZone(now = new Date(), timeZone?: string | null) {
  const calendar = calendarInTimeZone(now, normalizeTimeZone(timeZone));
  return `${calendar.year}-${String(calendar.month).padStart(2, "0")}`;
}

export function weekHasReview(
  createdAts: readonly string[],
  weekKey: string,
  timeZone?: string | null,
) {
  if (!isPauseWeekKey(weekKey)) return false;
  return createdAts.some((value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    return isoWeekKeyInTimeZone(date, timeZone) === weekKey;
  });
}

export type StreakRisk = {
  weekKey: string;
  monthKey: string;
  streak: number;
  atRisk: boolean;
  currentWeekWritten: boolean;
  currentWeekPaused: boolean;
};

/**
 * A streak is at risk when this week is still empty and not paused,
 * and earlier weeks would keep a count if this one does not break it.
 */
export function describeStreakRisk(input: {
  createdAts: readonly string[];
  pausedWeeks?: Iterable<string>;
  now?: Date;
  timeZone?: string | null;
}): StreakRisk {
  const timeZone = normalizeTimeZone(input.timeZone);
  const now = input.now ?? new Date();
  const weekKey = currentPauseWeekKey(now, timeZone);
  const monthKey = monthKeyInTimeZone(now, timeZone);
  const paused = new Set(
    [...(input.pausedWeeks ?? [])].filter(
      (key) => typeof key === "string" && isPauseWeekKey(key),
    ),
  );
  const currentWeekPaused = paused.has(weekKey);
  const currentWeekWritten = weekHasReview(input.createdAts, weekKey, timeZone);
  const streak = weeklyStreak([...input.createdAts], now, {
    pausedWeeks: paused,
    timeZone,
  });
  const atRisk = streak > 0 && !currentWeekWritten && !currentWeekPaused;
  return {
    weekKey,
    monthKey,
    streak,
    atRisk,
    currentWeekWritten,
    currentWeekPaused,
  };
}

export type StreakProtectView = {
  softPlus: boolean;
  atRisk: boolean;
  available: boolean;
  usedThisMonth: boolean;
  weekKey: string;
  monthKey: string;
  streak: number;
  paused: boolean;
};

export function streakProtectView(input: {
  softPlus: boolean;
  risk: StreakRisk;
  usedThisMonth: boolean;
}): StreakProtectView {
  const usedThisMonth = input.usedThisMonth === true;
  const available =
    input.softPlus && input.risk.atRisk && !usedThisMonth && !input.risk.currentWeekPaused;
  return {
    softPlus: input.softPlus,
    atRisk: input.risk.atRisk,
    available,
    usedThisMonth,
    weekKey: input.risk.weekKey,
    monthKey: input.risk.monthKey,
    streak: input.risk.streak,
    paused: input.risk.currentWeekPaused,
  };
}

export function shouldShowStreakProtectChip(view: Pick<StreakProtectView, "atRisk">) {
  return view.atRisk === true;
}
