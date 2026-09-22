import { getDb } from "./client";
import { getWallNote, type WallNoteDetail } from "./wall";

export function countWallNoteThanks(noteId: string) {
  const row = getDb()
    .prepare(`SELECT COUNT(*) AS n FROM wall_note_thanks WHERE note_id = ?`)
    .get(noteId) as { n: number };
  return row.n;
}

export function thankCountsByNoteIds(noteIds: string[]) {
  const map = new Map<string, number>();
  if (noteIds.length === 0) return map;
  const placeholders = noteIds.map(() => "?").join(", ");
  const rows = getDb()
    .prepare(
      `SELECT note_id AS noteId, COUNT(*) AS n
       FROM wall_note_thanks
       WHERE note_id IN (${placeholders})
       GROUP BY note_id`,
    )
    .all(...noteIds) as Array<{ noteId: string; n: number }>;
  for (const row of rows) map.set(row.noteId, row.n);
  return map;
}

export function thankedNoteIdsForUser(userId: string, noteIds: string[]) {
  const set = new Set<string>();
  if (noteIds.length === 0) return set;
  const placeholders = noteIds.map(() => "?").join(", ");
  const rows = getDb()
    .prepare(
      `SELECT note_id AS noteId
       FROM wall_note_thanks
       WHERE user_id = ? AND note_id IN (${placeholders})`,
    )
    .all(userId, ...noteIds) as Array<{ noteId: string }>;
  for (const row of rows) set.add(row.noteId);
  return set;
}

export function hasWallNoteThanks(userId: string, noteId: string) {
  const row = getDb()
    .prepare(
      `SELECT 1 AS ok FROM wall_note_thanks WHERE user_id = ? AND note_id = ?`,
    )
    .get(userId, noteId) as { ok: number } | undefined;
  return Boolean(row);
}

/**
 * One quiet thank-you per person per neighbor note. No inbox, no email.
 */
export function thankWallNote(userId: string, noteId: string) {
  const note = getWallNote(noteId, userId);
  if (!note) {
    const error = new Error("not_found");
    error.name = "ThanksNotFoundError";
    throw error;
  }
  if (note.mine) {
    const error = new Error("own_note");
    error.name = "ThanksOwnNoteError";
    throw error;
  }

  const already = hasWallNoteThanks(userId, noteId);
  if (!already) {
    getDb()
      .prepare(
        `INSERT OR IGNORE INTO wall_note_thanks (user_id, note_id, created_at)
         VALUES (?, ?, ?)`,
      )
      .run(userId, noteId, new Date().toISOString());
  }

  return {
    thanked: true as const,
    already,
    thankCount: countWallNoteThanks(noteId),
    thankedByMe: true as const,
  };
}

export function withThanks<T extends { id: string }>(
  notes: T[],
  userId: string | null,
): Array<T & { thankCount: number; thankedByMe: boolean }> {
  const ids = notes.map((note) => note.id);
  const counts = thankCountsByNoteIds(ids);
  const mine = userId ? thankedNoteIdsForUser(userId, ids) : new Set<string>();
  return notes.map((note) => ({
    ...note,
    thankCount: counts.get(note.id) ?? 0,
    thankedByMe: mine.has(note.id),
  }));
}

export function attachThanksToDetail(note: WallNoteDetail, viewerId: string | null) {
  return {
    ...note,
    thankedByMe: viewerId ? hasWallNoteThanks(viewerId, note.id) : false,
    thankCount: countWallNoteThanks(note.id),
  };
}
