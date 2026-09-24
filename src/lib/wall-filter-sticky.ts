/** Mobile Soft Wall filter chips. They only describe filters already chosen. */

export const WALL_STICKY_QUERY_MAX = 28;

export const WALL_FILTER_CHIP_WRAP =
  "inline-flex min-h-11 max-w-full items-center whitespace-normal break-words text-left text-sm leading-snug";

export const WALL_FILTER_STICKY_CLASS =
  "sticky top-0 left-0 z-30 mb-3 flex w-max max-w-[calc(100vw-2.5rem)] flex-wrap items-center gap-2 rounded-[1.25rem] border border-line/80 bg-cream/95 px-3 py-2 shadow-card print:hidden sm:hidden";

export type WallStickyChipId = "week" | "query" | "feeling" | "demo";

export type WallStickyChip = {
  id: WallStickyChipId;
  label: string;
};

export function truncateStickyQuery(query: string, max = WALL_STICKY_QUERY_MAX) {
  const trimmed = query.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trimEnd()}…`;
}

/** Open ends stay a quiet dot so a one-sided feeling range still reads. */
export function stickyFeelingLabel(min: number | null, max: number | null) {
  if (min == null && max == null) return "";
  const left = min == null ? "·" : String(min);
  const right = max == null ? "·" : String(max);
  return `${left}–${right}`;
}

export function wallStickyFilterChips(input: {
  weekChip: "all" | "this-week" | "earlier";
  weekLabel: string;
  query: string;
  feelingMin: number | null;
  feelingMax: number | null;
  feelingLabel: string;
  hideDemo: boolean;
  demoLabel: string;
}): WallStickyChip[] {
  const chips: WallStickyChip[] = [];
  if (input.weekChip !== "all") {
    const week = input.weekLabel.trim();
    if (week) chips.push({ id: "week", label: week });
  }
  const query = truncateStickyQuery(input.query);
  if (query) chips.push({ id: "query", label: query });
  if ((input.feelingMin != null || input.feelingMax != null) && input.feelingLabel.trim()) {
    chips.push({ id: "feeling", label: input.feelingLabel.trim() });
  }
  if (input.hideDemo) {
    const demo = input.demoLabel.trim();
    if (demo) chips.push({ id: "demo", label: demo });
  }
  return chips;
}
