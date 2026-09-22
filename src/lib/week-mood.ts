export const WEEK_MOODS = ["peach", "mint", "blush", "cream", "lavender"] as const;

export type WeekMood = (typeof WEEK_MOODS)[number];

export const WEEK_MOOD_SWATCH: Record<WeekMood, string> = {
  peach: "bg-peach",
  mint: "bg-mint",
  blush: "bg-blush",
  cream: "bg-cream",
  lavender: "bg-lavender",
};

/** Subtle page wash. The week stays readable; the color is only a mood. */
export const WEEK_MOOD_TINT: Record<WeekMood, string> = {
  peach: "bg-peach/40",
  mint: "bg-mint/45",
  blush: "bg-blush/45",
  cream: "bg-cream/80",
  lavender: "bg-lavender/50",
};

export function isWeekMood(value: string): value is WeekMood {
  return (WEEK_MOODS as readonly string[]).includes(value);
}

export function parseWeekMood(value: unknown): WeekMood | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return isWeekMood(trimmed) ? trimmed : null;
}
