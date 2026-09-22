import { isoWeekKeyInTimeZone } from "@/lib/plus-insights";
import { DEFAULT_TIMEZONE, normalizeTimeZone } from "@/lib/timezone";

const WEEK_KEY_PATTERN = /^\d{4}-W\d{2}$/;

export function isPauseWeekKey(value: string) {
  return WEEK_KEY_PATTERN.test(value);
}

/** Current ISO week in the member timezone — the only week a pause can mark. */
export function currentPauseWeekKey(now = new Date(), timeZone?: string | null) {
  return isoWeekKeyInTimeZone(now, normalizeTimeZone(timeZone ?? DEFAULT_TIMEZONE));
}
