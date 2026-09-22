import type { Database } from "better-sqlite3";
import { getDb } from "./client";

export type PastSelfLetter = {
  id: string;
  reviewId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type PastSelfLetterListItem = PastSelfLetter & {
  reviewCreatedAt: string;
  summary: string;
};

type LetterRow = {
  id: string;
  review_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  review_created_at?: string;
  summary?: string;
};

function toLetter(row: LetterRow): PastSelfLetter {
  return {
    id: row.id,
    reviewId: row.review_id,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getPastSelfLetter(
  db: Database,
  userId: string,
  reviewId: string,
): PastSelfLetter | null {
  const row = db
    .prepare(
      `SELECT id, review_id, body, created_at, updated_at
       FROM past_self_letters
       WHERE user_id = ? AND review_id = ?`,
    )
    .get(userId, reviewId) as LetterRow | undefined;
  return row ? toLetter(row) : null;
}

export function listPastSelfLetters(
  db: Database,
  userId: string,
): PastSelfLetterListItem[] {
  const rows = db
    .prepare(
      `SELECT l.id, l.review_id, l.body, l.created_at, l.updated_at,
              r.created_at AS review_created_at, r.summary AS summary
       FROM past_self_letters l
       JOIN reviews r ON r.id = l.review_id
       WHERE l.user_id = ?
       ORDER BY l.updated_at DESC`,
    )
    .all(userId) as LetterRow[];
  return rows.map((row) => ({
    ...toLetter(row),
    reviewCreatedAt: row.review_created_at ?? "",
    summary: row.summary ?? "",
  }));
}

/** Upsert the private letter for one owned review. Empty body deletes it. */
export function savePastSelfLetter(
  db: Database,
  input: { userId: string; reviewId: string; body: string | null },
): PastSelfLetter | null {
  const existing = getPastSelfLetter(db, input.userId, input.reviewId);
  const now = new Date().toISOString();

  if (!input.body) {
    if (existing) {
      db.prepare(`DELETE FROM past_self_letters WHERE id = ? AND user_id = ?`).run(
        existing.id,
        input.userId,
      );
    }
    return null;
  }

  if (existing) {
    db.prepare(
      `UPDATE past_self_letters SET body = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
    ).run(input.body, now, existing.id, input.userId);
    return { ...existing, body: input.body, updatedAt: now };
  }

  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO past_self_letters (id, user_id, review_id, body, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, input.userId, input.reviewId, input.body, now, now);

  return {
    id,
    reviewId: input.reviewId,
    body: input.body,
    createdAt: now,
    updatedAt: now,
  };
}

export function getPastSelfLetterForUser(userId: string, reviewId: string) {
  return getPastSelfLetter(getDb(), userId, reviewId);
}

export function listPastSelfLettersForUser(userId: string) {
  return listPastSelfLetters(getDb(), userId);
}

export function savePastSelfLetterForUser(input: {
  userId: string;
  reviewId: string;
  body: string | null;
}) {
  return savePastSelfLetter(getDb(), input);
}
