/** How long a lifted bookmark can be put back, on this page only. */
export const BOOKMARK_UNDO_MS = 6000;

export type BookmarkUndoWindow = {
  noteId: string;
  startedAt: number;
  expiresAt: number;
};

export function beginBookmarkUndo(
  noteId: string,
  now: number,
  duration = BOOKMARK_UNDO_MS,
): BookmarkUndoWindow | null {
  const id = noteId.trim();
  if (!id) return null;
  if (!Number.isFinite(now) || !Number.isFinite(duration) || duration <= 0) return null;
  return {
    noteId: id,
    startedAt: now,
    expiresAt: now + duration,
  };
}

export function bookmarkUndoOpen(
  undo: Pick<BookmarkUndoWindow, "expiresAt"> | null | undefined,
  now: number,
): boolean {
  if (!undo || !Number.isFinite(undo.expiresAt) || !Number.isFinite(now)) return false;
  return now < undo.expiresAt;
}

export function bookmarkUndoRemaining(
  undo: Pick<BookmarkUndoWindow, "expiresAt"> | null | undefined,
  now: number,
): number {
  if (!bookmarkUndoOpen(undo, now) || !undo) return 0;
  return undo.expiresAt - now;
}

/** A short label for the toast. Extra whitespace folds; the note itself stays where it was. */
export function bookmarkUndoLabel(value: string, fallback: string, max = 80): string {
  const trimmed = value.replace(/\s+/g, " ").trim();
  const text = trimmed || fallback.trim() || "…";
  const chars = Array.from(text);
  const limit = Math.max(1, Math.floor(max));
  if (chars.length <= limit) return text;
  if (limit === 1) return "…";
  return `${chars.slice(0, limit - 1).join("")}…`;
}
