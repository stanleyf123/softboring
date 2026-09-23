/** How many earlier weeks a Soft+ desk keeps in the quiet list. */
export const SOFT_INTENTION_HISTORY_LIMIT = 24;

export type SoftIntentionHistoryItem = {
  id: string;
  weekKey: string;
  body: string;
  updatedAt: string;
};

type IntentionHistorySource = {
  id: string;
  weekKey: string;
  body: string;
  updatedAt: string;
};

/**
 * Earlier ISO weeks only. The current week stays on the intention card.
 * Newest week first. Empty sentences are left out.
 */
export function pastSoftIntentions(
  rows: readonly IntentionHistorySource[],
  currentWeekKey: string,
  limit = SOFT_INTENTION_HISTORY_LIMIT,
): SoftIntentionHistoryItem[] {
  const cap = Number.isFinite(limit)
    ? Math.max(1, Math.min(52, Math.floor(limit)))
    : SOFT_INTENTION_HISTORY_LIMIT;
  const current = currentWeekKey.trim();

  return rows
    .map((row) => ({
      id: row.id,
      weekKey: row.weekKey.trim(),
      body: row.body.trim(),
      updatedAt: row.updatedAt,
    }))
    .filter((row) => row.body.length > 0 && row.weekKey.length > 0 && row.weekKey < current)
    .sort((a, b) => b.weekKey.localeCompare(a.weekKey) || a.id.localeCompare(b.id))
    .slice(0, cap);
}

/** Free never receives the sentences. Soft+ receives the quiet list, possibly empty. */
export function intentionHistoryView(
  rows: readonly IntentionHistorySource[],
  currentWeekKey: string,
  softPlus: boolean,
) {
  if (!softPlus) {
    return { history: null, historyLocked: true as const };
  }
  return {
    history: pastSoftIntentions(rows, currentWeekKey),
    historyLocked: false as const,
  };
}
