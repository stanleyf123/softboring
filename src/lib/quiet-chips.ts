import { isoWeekKeyInTimeZone } from "@/lib/plus-insights";
import { isPauseWeekKey } from "@/lib/pause-week";
import { FREE_HISTORY_LIMIT } from "@/lib/plan";
import { calendarInTimeZone, normalizeTimeZone } from "@/lib/timezone";
import { parseWeekMood, type WeekMood } from "@/lib/week-mood";

export type QuietChip = {
  id: string;
  kind: "mood" | "pause";
  weekKey: string;
  week: number;
  mood: WeekMood | null;
  reviewId: string | null;
};

export type QuietChipReview = {
  id: string;
  createdAt: string;
  mood?: string | null;
};

export type QuietChipBoard = {
  year: number;
  chips: QuietChip[];
  hiddenCount: number;
  softPlus: boolean;
};

function weekNumber(weekKey: string) {
  const match = /-W(\d{2})$/.exec(weekKey);
  return match ? Number(match[1]) : 0;
}

function reviewWeekKey(createdAt: string, timeZone: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  const key = isoWeekKeyInTimeZone(date, timeZone);
  return isPauseWeekKey(key) ? key : null;
}

/**
 * Read-only chips for pause weeks and stored mood colors.
 * Free accounts only see chips tied to the latest reviews; Soft+ sees the year.
 */
export function buildQuietYearChips(options: {
  reviews: QuietChipReview[];
  pauseWeekKeys: string[];
  softPlus: boolean;
  year?: number;
  now?: Date;
  timeZone?: string | null;
  freeLimit?: number;
}): QuietChipBoard {
  const timeZone = normalizeTimeZone(options.timeZone);
  const now = options.now ?? new Date();
  const year = options.year ?? calendarInTimeZone(now, timeZone).year;
  const yearPrefix = `${year}-W`;
  const limit = options.freeLimit ?? FREE_HISTORY_LIMIT;
  const newestFirst = [...options.reviews].sort((a, b) => {
    const aTime = Date.parse(a.createdAt);
    const bTime = Date.parse(b.createdAt);
    return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
  });
  const unlocked = options.softPlus ? newestFirst : newestFirst.slice(0, Math.max(0, limit));
  const unlockedIds = new Set(unlocked.map((review) => review.id));

  const unlockedWeeks = new Set<string>();
  for (const review of unlocked) {
    const weekKey = reviewWeekKey(review.createdAt, timeZone);
    if (weekKey?.startsWith(yearPrefix)) unlockedWeeks.add(weekKey);
  }

  const chips: QuietChip[] = [];
  let hiddenCount = 0;
  const seenMoodWeeks = new Set<string>();

  for (const review of newestFirst) {
    const weekKey = reviewWeekKey(review.createdAt, timeZone);
    if (!weekKey?.startsWith(yearPrefix)) continue;
    const mood = parseWeekMood(review.mood ?? null);
    if (!mood) continue;
    if (seenMoodWeeks.has(weekKey)) continue;
    seenMoodWeeks.add(weekKey);
    if (!options.softPlus && !unlockedIds.has(review.id)) {
      hiddenCount += 1;
      continue;
    }
    chips.push({
      id: `mood:${weekKey}`,
      kind: "mood",
      weekKey,
      week: weekNumber(weekKey),
      mood,
      reviewId: review.id,
    });
  }

  const seenPauses = new Set<string>();
  for (const raw of options.pauseWeekKeys) {
    if (!isPauseWeekKey(raw) || !raw.startsWith(yearPrefix) || seenPauses.has(raw)) continue;
    seenPauses.add(raw);
    if (!options.softPlus && !unlockedWeeks.has(raw)) {
      hiddenCount += 1;
      continue;
    }
    chips.push({
      id: `pause:${raw}`,
      kind: "pause",
      weekKey: raw,
      week: weekNumber(raw),
      mood: null,
      reviewId: null,
    });
  }

  chips.sort((a, b) => {
    if (a.weekKey !== b.weekKey) return a.weekKey < b.weekKey ? -1 : 1;
    if (a.kind === b.kind) return 0;
    return a.kind === "pause" ? -1 : 1;
  });

  return {
    year,
    chips,
    hiddenCount,
    softPlus: options.softPlus,
  };
}
