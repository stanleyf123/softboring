import type { WallWeekChip } from "@/lib/wall-week-chips";

export type WallQuietEmptyKind = "filters" | "this-week" | "earlier";

/** The other week chip, when a single chip left the board empty. */
export function otherWallWeekChip(chip: WallWeekChip): WallWeekChip | null {
  if (chip === "this-week") return "earlier";
  if (chip === "earlier") return "this-week";
  return null;
}

/**
 * When the corkboard has notes but none are in view:
 * a week chip alone gets its own quiet empty.
 * Search, feeling, or demo-hide still use the wider filter empty.
 */
export function wallQuietEmptyKind(
  chip: WallWeekChip,
  otherFiltersOn: boolean,
): WallQuietEmptyKind {
  if (otherFiltersOn || chip === "all") return "filters";
  if (chip === "this-week") return "this-week";
  return "earlier";
}
