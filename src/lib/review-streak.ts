import { listPauseWeekKeys } from "@/db/week-pauses";
import { ensureUserSettings } from "@/db/user-settings";
import { weeklyStreak } from "@/lib/plus-insights";

/**
 * Signed-in streak. Pause weeks are skipped only when the member has any,
 * and then dates are read in their timezone so the pause key lines up.
 */
export function streakForUser(userId: string, createdAts: string[], now = new Date()) {
  const pausedWeeks = listPauseWeekKeys(userId);
  if (pausedWeeks.length === 0) return weeklyStreak(createdAts, now);
  return weeklyStreak(createdAts, now, {
    pausedWeeks,
    timeZone: ensureUserSettings(userId).timezone,
  });
}
