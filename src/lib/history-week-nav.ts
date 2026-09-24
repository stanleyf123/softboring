export type HistoryWeekNavItem = {
  id: string;
  locked?: boolean;
  summary?: string | null;
};

export type HistoryWeekNeighbors = {
  earlier: HistoryWeekNavItem | null;
  later: HistoryWeekNavItem | null;
  /** 1-based place among open weeks. Newest open week is 1. */
  openIndex: number;
  openCount: number;
  lockedCount: number;
};

const EMPTY_NEIGHBORS: HistoryWeekNeighbors = {
  earlier: null,
  later: null,
  openIndex: 0,
  openCount: 0,
  lockedCount: 0,
};

function isOpenWeek(item: HistoryWeekNavItem | null | undefined): item is HistoryWeekNavItem {
  return Boolean(item && item.locked !== true && typeof item.id === "string" && item.id.trim());
}

/**
 * History lists are newest-first.
 * Later is the newer open week; earlier is the older open week.
 * Locked rows are skipped, so a free desk never links into a tucked week.
 */
export function historyWeekNeighbors(
  reviews: readonly HistoryWeekNavItem[],
  currentId: string,
): HistoryWeekNeighbors {
  const id = currentId.trim();
  const open = reviews.filter(isOpenWeek);
  const lockedCount = reviews.filter(
    (item) => item && item.locked === true && typeof item.id === "string" && item.id.trim(),
  ).length;
  if (!id) return { ...EMPTY_NEIGHBORS, openCount: open.length, lockedCount };
  const index = open.findIndex((item) => item.id === id);
  if (index < 0) {
    return { ...EMPTY_NEIGHBORS, openCount: open.length, lockedCount };
  }
  return {
    later: index > 0 ? open[index - 1] : null,
    earlier: index < open.length - 1 ? open[index + 1] : null,
    openIndex: index + 1,
    openCount: open.length,
    lockedCount,
  };
}

/** A short neighbor title. Blank summaries stay unnamed. */
export function historyNeighborLabel(summary: string | null | undefined, untitled: string) {
  const text = (summary ?? "").trim().replace(/\s+/g, " ");
  if (!text) return untitled;
  if (text.length <= 72) return text;
  return `${text.slice(0, 71)}…`;
}
