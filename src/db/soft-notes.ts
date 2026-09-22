import { getDb } from "./client";
import { isoWeekKey } from "@/lib/plus-insights";
import { SOFT_NOTE_MAX } from "@/lib/soft-note";

export { SOFT_NOTE_MAX };

export type SoftNote = {
  id: string;
  weekKey: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

type SoftNoteRow = {
  id: string;
  user_id: string;
  week_key: string;
  body: string;
  created_at: string;
  updated_at: string;
};

function toNote(row: SoftNoteRow): SoftNote {
  return {
    id: row.id,
    weekKey: row.week_key,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function parseSoftNoteBody(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, SOFT_NOTE_MAX);
  return trimmed.length > 0 ? trimmed : null;
}

export function currentWeekKey(now = new Date()) {
  return isoWeekKey(now);
}

export function getSoftNoteForWeek(userId: string, weekKey: string): SoftNote | null {
  const row = getDb()
    .prepare(
      `SELECT id, user_id, week_key, body, created_at, updated_at
       FROM soft_notes
       WHERE user_id = ? AND week_key = ?`,
    )
    .get(userId, weekKey) as SoftNoteRow | undefined;
  return row ? toNote(row) : null;
}

export function getCurrentSoftNote(userId: string, now = new Date()): SoftNote | null {
  return getSoftNoteForWeek(userId, currentWeekKey(now));
}

/** Upsert one private mid-week note for the ISO week. Empty body deletes. */
export function saveSoftNoteForWeek(input: {
  userId: string;
  weekKey: string;
  body: string | null;
}): SoftNote | null {
  const db = getDb();
  const existing = getSoftNoteForWeek(input.userId, input.weekKey);
  const now = new Date().toISOString();

  if (!input.body) {
    if (existing) {
      db.prepare(`DELETE FROM soft_notes WHERE id = ? AND user_id = ?`).run(
        existing.id,
        input.userId,
      );
    }
    return null;
  }

  if (existing) {
    db.prepare(
      `UPDATE soft_notes SET body = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
    ).run(input.body, now, existing.id, input.userId);
    return {
      ...existing,
      body: input.body,
      updatedAt: now,
    };
  }

  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO soft_notes (id, user_id, week_key, body, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, input.userId, input.weekKey, input.body, now, now);

  return {
    id,
    weekKey: input.weekKey,
    body: input.body,
    createdAt: now,
    updatedAt: now,
  };
}

export function saveCurrentSoftNote(
  userId: string,
  body: string | null,
  now = new Date(),
): SoftNote | null {
  return saveSoftNoteForWeek({
    userId,
    weekKey: currentWeekKey(now),
    body,
  });
}
