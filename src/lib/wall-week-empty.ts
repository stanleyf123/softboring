import type { WallWeekChip } from "@/lib/wall-week-chips";

export type WallQuietEmptyKind = "filters" | "this-week" | "earlier";

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
