/** How many recent thank-yous Soft+ may see on the account strip. */
export const SOFT_THANKS_HISTORY_LIMIT = 5;

export type SoftThanksInput = {
  noteId: string;
  at: string;
  excerpt?: string | null;
  nickname?: string | null;
  hidden?: boolean;
};

export type SoftThanksEntry = {
  noteId: string;
  at: string;
  excerpt: string;
  nickname: string | null;
  hidden: boolean;
};

export function thanksHistoryLimit(limit = SOFT_THANKS_HISTORY_LIMIT) {
  if (!Number.isFinite(limit)) return SOFT_THANKS_HISTORY_LIMIT;
  return Math.min(12, Math.max(1, Math.floor(limit)));
}

/**
 * Newest first, one row per note, hidden notes keep no excerpt.
 * Free callers should not receive this list at all.
 */
export function shapeSoftThanksHistory(
  rows: SoftThanksInput[],
  limit = SOFT_THANKS_HISTORY_LIMIT,
): SoftThanksEntry[] {
  const cap = thanksHistoryLimit(limit);
  const seen = new Set<string>();
  const sorted = [...rows]
    .filter((row) => typeof row.noteId === "string" && row.noteId.trim().length > 0)
    .filter((row) => Number.isFinite(Date.parse(row.at)))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  const out: SoftThanksEntry[] = [];
  for (const row of sorted) {
    const noteId = row.noteId.trim();
    if (seen.has(noteId)) continue;
    seen.add(noteId);
    const hidden = row.hidden === true;
    out.push({
      noteId,
      at: row.at,
      excerpt: hidden ? "" : (row.excerpt ?? "").replace(/\s+/g, " ").trim(),
      nickname: row.nickname?.replace(/\s+/g, " ").trim() || null,
      hidden,
    });
    if (out.length >= cap) break;
  }
  return out;
}
