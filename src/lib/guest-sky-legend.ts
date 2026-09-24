import { PLUS_NOTE_COLORS, WALL_COLORS, type WallColor } from "@/lib/wall-canvas";
import { WEEK_MOODS, type WeekMood } from "@/lib/week-mood";

/** Mood colors that can tint a signed-in sky. Guests only see the key. */
export function guestSkyMoods(): readonly WeekMood[] {
  return WEEK_MOODS;
}

/** Shared paper already on the corkboard. Personal Soft+ washes stay out. */
export function guestPaperColors(): readonly WallColor[] {
  return WALL_COLORS;
}

export function guestLegendOmitsPersonalColors(colors: readonly string[]) {
  return colors.every((color) => !(PLUS_NOTE_COLORS as readonly string[]).includes(color));
}
