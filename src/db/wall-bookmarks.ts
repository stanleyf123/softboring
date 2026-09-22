import { getDb } from "./client";
import {
  getWallNote,
  type WallNoteDetail,
  type WallNoteListItem,
} from "./wall";

export type BookmarkedWallNote = WallNoteListItem & {
  bookmarkedAt: string;
  energy?: string;
  drain?: string;
  lessOf?: string;
  priorities?: string;
  locale?: string | null;
  reviewId?: string;
};

export function listBookmarkedNoteIds(userId: string): Set<string> {
  const rows = getDb()
    .prepare(
      `SELECT note_id AS noteId
       FROM wall_note_bookmarks
       WHERE user_id = ?`,
    )
    .all(userId) as Array<{ noteId: string }>;
  return new Set(rows.map((row) => row.noteId));
}

export function isWallNoteBookmarked(userId: string, noteId: string) {
  const row = getDb()
    .prepare(
      `SELECT 1 AS ok FROM wall_note_bookmarks WHERE user_id = ? AND note_id = ?`,
    )
    .get(userId, noteId) as { ok: number } | undefined;
  return Boolean(row);
}

export function bookmarkWallNote(userId: string, noteId: string) {
  const note = getWallNote(noteId, userId);
  if (!note) return false;
  const createdAt = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO wall_note_bookmarks (user_id, note_id, created_at)
       VALUES (?, ?, ?)`,
    )
    .run(userId, noteId, createdAt);
  return true;
}

export function unbookmarkWallNote(userId: string, noteId: string) {
  return getDb()
    .prepare(`DELETE FROM wall_note_bookmarks WHERE user_id = ? AND note_id = ?`)
    .run(userId, noteId).changes;
}

export function toggleWallNoteBookmark(userId: string, noteId: string) {
  if (isWallNoteBookmarked(userId, noteId)) {
    unbookmarkWallNote(userId, noteId);
    return { bookmarked: false as const };
  }
  const ok = bookmarkWallNote(userId, noteId);
  if (!ok) {
    const error = new Error("not_found");
    error.name = "BookmarkNotFoundError";
    throw error;
  }
  return { bookmarked: true as const };
}

export function listBookmarkedWallNotes(userId: string): BookmarkedWallNote[] {
  const rows = getDb()
    .prepare(
      `SELECT b.note_id AS noteId, b.created_at AS bookmarkedAt
       FROM wall_note_bookmarks b
       JOIN wall_notes n ON n.id = b.note_id
       WHERE b.user_id = ? AND n.hidden = 0
       ORDER BY datetime(b.created_at) DESC`,
    )
    .all(userId) as Array<{ noteId: string; bookmarkedAt: string }>;

  const notes: BookmarkedWallNote[] = [];
  for (const row of rows) {
    const note = getWallNote(row.noteId, userId);
    if (!note) continue;
    notes.push({
      ...note,
      bookmarkedAt: row.bookmarkedAt,
    });
  }
  return notes;
}

export function withBookmarkFlag<T extends { id: string }>(
  notes: T[],
  userId: string | null,
): Array<T & { bookmarked: boolean }> {
  if (!userId || notes.length === 0) {
    return notes.map((note) => ({ ...note, bookmarked: false }));
  }
  const ids = listBookmarkedNoteIds(userId);
  return notes.map((note) => ({
    ...note,
    bookmarked: ids.has(note.id),
  }));
}

export function attachBookmarkToDetail(
  note: WallNoteDetail,
  userId: string | null,
): WallNoteDetail & { bookmarked: boolean } {
  return {
    ...note,
    bookmarked: userId ? isWallNoteBookmarked(userId, note.id) : false,
  };
}
