/** How many Soft Wall notes paint at once. The rest wait for a gentle next batch. */
export const WALL_NOTE_PAGE = 24;

function pageSize(page: number) {
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : WALL_NOTE_PAGE;
}

function safeTotal(total: number) {
  return Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
}

/** Notes actually on the corkboard. Never fewer than one page, never more than the list. */
export function wallShownCount(total: number, requested: number, page = WALL_NOTE_PAGE) {
  const size = pageSize(page);
  const cap = safeTotal(total);
  const asked = Number.isFinite(requested) ? Math.floor(requested) : size;
  return Math.min(cap, Math.max(Math.min(cap, size), asked));
}

export function wallHasMoreNotes(total: number, shown: number, page = WALL_NOTE_PAGE) {
  return wallShownCount(total, shown, page) < safeTotal(total);
}

export function wallNextShownCount(total: number, shown: number, page = WALL_NOTE_PAGE) {
  const size = pageSize(page);
  return wallShownCount(total, wallShownCount(total, shown, page) + size, page);
}

/** Deep links still land on their note, even when it sits past the first batch. */
export function wallRevealCount(ids: readonly string[], focusId: string | null | undefined, page = WALL_NOTE_PAGE) {
  const size = pageSize(page);
  if (!focusId) return size;
  const index = ids.indexOf(focusId);
  if (index < 0) return size;
  return Math.max(size, index + 1);
}
