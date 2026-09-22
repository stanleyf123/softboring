import { isSeasonalPackId, type SeasonalPackId } from "@/lib/seasonal-packs";

export type { SeasonalPackId };
import { calendarInTimeZone } from "@/lib/timezone";

/** Visual seasons for the Soft Wall frame. Packs are reused when one exists. */
export const SEASON_IDS = ["spring", "rain", "autumn", "year-end"] as const;

export type SeasonId = (typeof SEASON_IDS)[number];

/**
 * Spring and the rainy months borrow the question packs already in the app.
 * Autumn has a frame of its own. Year-end reuses the gratitude pack.
 */
const PACK_BY_SEASON: Record<SeasonId, string | null> = {
  spring: "spring-soft-reset",
  rain: "rainy-week-comfort",
  autumn: null,
  "year-end": "year-end-gratitude",
};

export const SEASONAL_FRAME_STORAGE_KEY = "softboring-seasonal-frame";

export function isSeasonId(value: unknown): value is SeasonId {
  return typeof value === "string" && (SEASON_IDS as readonly string[]).includes(value);
}

/** Calendar month 1–12. Anything outside that range falls back to year-end. */
export function seasonForMonth(month: number): SeasonId {
  const value = Math.trunc(month);
  if (value >= 3 && value <= 5) return "spring";
  if (value >= 6 && value <= 8) return "rain";
  if (value >= 9 && value <= 11) return "autumn";
  return "year-end";
}

/** Returns the seasonal question pack for this frame, when that pack still exists. */
export function packForSeason(season: SeasonId): SeasonalPackId | null {
  const candidate = PACK_BY_SEASON[season];
  return candidate && isSeasonalPackId(candidate) ? candidate : null;
}

export type SeasonFrame = {
  season: SeasonId;
  packId: SeasonalPackId | null;
  className: string;
};

export function seasonFrameClass(season: SeasonId) {
  return `season-frame season-frame--${season}`;
}

/**
 * Current decorative frame. Without a timezone, the calendar month is the
 * runtime's local month (the browser, on the wall).
 */
export function seasonFrameForDate(now = new Date(), timeZone?: string | null): SeasonFrame {
  let month = now.getMonth() + 1;
  if (timeZone) {
    month = calendarInTimeZone(now, timeZone).month;
  }
  const season = seasonForMonth(month);
  return {
    season,
    packId: packForSeason(season),
    className: seasonFrameClass(season),
  };
}
