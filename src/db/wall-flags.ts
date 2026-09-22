import { randomUUID } from "node:crypto";
import { getDb } from "./client";
import { getWallNote, type WallNoteDetail } from "./wall";

export function countWallNoteFlags(noteId: string) {
  const row = getDb()
    .prepare(`SELECT COUNT(*) AS n FROM wall_note_flags WHERE note_id = ?`)
    .get(noteId) as { n: number };
  return row.n;
}

export function flagCountsByNoteIds(noteIds: string[]) {
  const map = new Map<string, number>();
  if (noteIds.length === 0) return map;
  const placeholders = noteIds.map(() => "?").join(", ");
  const rows = getDb()
    .prepare(
      `SELECT note_id AS noteId, COUNT(*) AS n
       FROM wall_note_flags
       WHERE note_id IN (${placeholders})
       GROUP BY note_id`,
    )
    .all(...noteIds) as Array<{ noteId: string; n: number }>;
  for (const row of rows) map.set(row.noteId, row.n);
  return map;
}

export function hasWallNoteFlag(userId: string, noteId: string) {
  const row = getDb()
    .prepare(
      `SELECT 1 AS ok FROM wall_note_flags WHERE reporter_id = ? AND note_id = ?`,
    )
    .get(userId, noteId) as { ok: number } | undefined;
  return Boolean(row);
}

/**
 * Soft+ neighbor flag — quiet, once per person per note. Own notes cannot be flagged.
 */
export function flagWallNote(userId: string, noteId: string) {
  const note = getWallNote(noteId, userId);
  if (!note) {
    const error = new Error("not_found");
    error.name = "FlagNotFoundError";
    throw error;
  }
  if (note.mine) {
    const error = new Error("own_note");
    error.name = "FlagOwnNoteError";
    throw error;
  }
  if (hasWallNoteFlag(userId, noteId)) {
    return { flagged: true as const, already: true as const };
  }
  getDb()
    .prepare(
      `INSERT INTO wall_note_flags (id, note_id, reporter_id, created_at)
       VALUES (?, ?, ?, ?)`,
    )
    .run(randomUUID(), noteId, userId, new Date().toISOString());
  return { flagged: true as const, already: false as const };
}

export function attachFlagToDetail(note: WallNoteDetail, viewerId: string | null) {
  return {
    ...note,
    flaggedByMe: viewerId ? hasWallNoteFlag(viewerId, note.id) : false,
    flagCount: countWallNoteFlags(note.id),
  };
}
