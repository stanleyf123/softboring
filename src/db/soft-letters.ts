import { getDb } from "./client";
import { ensureUserSettings } from "./user-settings";
import {
  letterWeekKey,
  parseSoftLetterBody,
  SOFT_LETTER_MAX,
  softLetterWeekYear,
} from "@/lib/soft-letter";

export { SOFT_LETTER_MAX, parseSoftLetterBody };

export type SoftLetter = {
  id: string;
  weekKey: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

type SoftLetterRow = {
  id: string;
  user_id: string;
  week_key: string;
  body: string;
  created_at: string;
  updated_at: string;
};

function toLetter(row: SoftLetterRow): SoftLetter {
  return {
    id: row.id,
    weekKey: row.week_key,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function currentLetterWeekKey(userId: string, now = new Date()) {
  return letterWeekKey(now, ensureUserSettings(userId).timezone);
}

export function getSoftLetterForWeek(userId: string, weekKey: string): SoftLetter | null {
  const row = getDb()
    .prepare(
      `SELECT id, user_id, week_key, body, created_at, updated_at
       FROM soft_letters
       WHERE user_id = ? AND week_key = ?`,
    )
    .get(userId, weekKey) as SoftLetterRow | undefined;
  return row ? toLetter(row) : null;
}

export function getCurrentSoftLetter(userId: string, now = new Date()): SoftLetter | null {
  return getSoftLetterForWeek(userId, currentLetterWeekKey(userId, now));
}

export function listSoftLetters(userId: string): SoftLetter[] {
  const rows = getDb()
    .prepare(
      `SELECT id, user_id, week_key, body, created_at, updated_at
       FROM soft_letters
       WHERE user_id = ?
       ORDER BY week_key DESC`,
    )
    .all(userId) as SoftLetterRow[];
  return rows.map(toLetter);
}

export function listSoftLettersForYear(userId: string, year: number): SoftLetter[] {
  return listSoftLetters(userId).filter((letter) => softLetterWeekYear(letter.weekKey) === year);
}

/** Upsert the private letter for one ISO week. Empty body deletes it. */
export function saveSoftLetterForWeek(input: {
  userId: string;
  weekKey: string;
  body: string | null;
}): SoftLetter | null {
  const db = getDb();
  const existing = getSoftLetterForWeek(input.userId, input.weekKey);
  const now = new Date().toISOString();

  if (!input.body) {
    if (existing) {
      db.prepare(`DELETE FROM soft_letters WHERE id = ? AND user_id = ?`).run(
        existing.id,
        input.userId,
      );
    }
    return null;
  }

  if (existing) {
    db.prepare(
      `UPDATE soft_letters SET body = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
    ).run(input.body, now, existing.id, input.userId);
    return {
      ...existing,
      body: input.body,
      updatedAt: now,
    };
  }

  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO soft_letters (id, user_id, week_key, body, created_at, updated_at)
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

export function saveCurrentSoftLetter(
  userId: string,
  body: string | null,
  now = new Date(),
): SoftLetter | null {
  return saveSoftLetterForWeek({
    userId,
    weekKey: currentLetterWeekKey(userId, now),
    body,
  });
}
