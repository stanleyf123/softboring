import { isoWeekKeyInTimeZone } from "@/lib/plus-insights";
import { isPauseWeekKey } from "@/lib/pause-week";
import { parseWeekMood, type WeekMood } from "@/lib/week-mood";

/** Decorative skies. Not a forecast. */
export const SOFT_WEATHER_KINDS = [
  "sky",
  "open",
  "rest",
  "sun",
  "breeze",
  "blush",
  "cream",
  "mist",
] as const;

export type SoftWeatherKind = (typeof SOFT_WEATHER_KINDS)[number];

const MOOD_WEATHER: Record<WeekMood, Exclude<SoftWeatherKind, "sky" | "open" | "rest">> = {
  peach: "sun",
  mint: "breeze",
  blush: "blush",
  cream: "cream",
  lavender: "mist",
};

export function isSoftWeatherKind(value: string): value is SoftWeatherKind {
  return (SOFT_WEATHER_KINDS as readonly string[]).includes(value);
}

/**
 * Guests always get the same still sky.
 * A pause week rests the air, even when a mood color is saved.
 * Otherwise the signed-in sky follows this week's mood, or waits.
 */
export function softWeekWeather(input: {
  signedIn: boolean;
  paused: boolean;
  mood: WeekMood | null;
}): SoftWeatherKind {
  if (!input.signedIn) return "sky";
  if (input.paused) return "rest";
  if (input.mood) return MOOD_WEATHER[input.mood];
  return "open";
}

export function moodForCurrentWeek(input: {
  reviews: Array<{ createdAt: string; mood?: string | null }>;
  weekKey: string;
  timeZone: string;
}): WeekMood | null {
  if (!isPauseWeekKey(input.weekKey)) return null;
  for (const review of input.reviews) {
    const created = new Date(review.createdAt);
    if (Number.isNaN(created.getTime())) continue;
    if (isoWeekKeyInTimeZone(created, input.timeZone) !== input.weekKey) continue;
    const mood = parseWeekMood(review.mood ?? null);
    if (mood) return mood;
  }
  return null;
}
