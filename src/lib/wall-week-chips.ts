import { isoWeekKeyInTimeZone } from "@/lib/plus-insights";

export const WALL_WEEK_CHIPS = ["all", "this-week", "earlier"] as const;

export type WallWeekChip = (typeof WALL_WEEK_CHIPS)[number];

export function isWallWeekChip(value: unknown): value is WallWeekChip {
  return typeof value === "string" && (WALL_WEEK_CHIPS as readonly string[]).includes(value);
}

/**
 * Soft+ corkboard chips. "This week" is the current ISO week in the account timezone.
 * Earlier weeks are strictly older. A future week stays on "all" only.
 * Invalid dates stay on "all" only, so a broken timestamp is not hidden by default.
 */
export function noteMatchesWeekChip(
  createdAt: string | null | undefined,
  chip: WallWeekChip,
  now: Date,
  timeZone?: string | null,
) {
  if (chip === "all") return true;
  const date = new Date(createdAt ?? "");
  if (Number.isNaN(date.getTime())) return false;
  const noteWeek = isoWeekKeyInTimeZone(date, timeZone);
  const current = isoWeekKeyInTimeZone(now, timeZone);
  if (chip === "this-week") return noteWeek === current;
  return noteWeek < current;
}
