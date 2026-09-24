import { isoWeekKeyFromParts } from "@/lib/plus-insights";

const ISO_WEEK_RE = /^(\d{4})-W(\d{2})$/;

/** Monday (UTC) of a real ISO week, or null when the key is not that week. */
export function isoWeekMondayUtc(key: string): Date | null {
  const match = ISO_WEEK_RE.exec(key.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const week = Number(match[2]);
  if (!Number.isInteger(year) || week < 1 || week > 53) return null;
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Dow = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - (jan4Dow - 1) + (week - 1) * 7);
  const canonical = `${year}-W${String(week).padStart(2, "0")}`;
  const back = isoWeekKeyFromParts(
    monday.getUTCFullYear(),
    monday.getUTCMonth() + 1,
    monday.getUTCDate(),
  );
  if (back !== canonical) return null;
  return monday;
}

/**
 * How many ISO weeks sit between a past intention and the current week.
 * Same week, future weeks, and broken keys stay null.
 */
export function intentionWeeksAgo(pastKey: string, currentKey: string): number | null {
  const past = isoWeekMondayUtc(pastKey);
  const current = isoWeekMondayUtc(currentKey);
  if (!past || !current) return null;
  const diff = Math.round((current.getTime() - past.getTime()) / (7 * 86_400_000));
  if (!Number.isFinite(diff) || diff < 1 || diff > 520) return null;
  return diff;
}
