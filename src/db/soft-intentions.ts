import { getDb } from "./client";
import { isoWeekKey, previousIsoWeekKey } from "@/lib/plus-insights";
import { SOFT_INTENTION_MAX } from "@/lib/soft-intention";

export { SOFT_INTENTION_MAX };

export type SoftIntention = {
  id: string;
  weekKey: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

type SoftIntentionRow = {
  id: string;
  user_id: string;
  week_key: string;
  body: string;
  created_at: string;
  updated_at: string;
};

function toIntention(row: SoftIntentionRow): SoftIntention {
  return {
    id: row.id,
    weekKey: row.week_key,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function parseSoftIntentionBody(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, SOFT_INTENTION_MAX);
  return trimmed.length > 0 ? trimmed : null;
}

export function currentWeekKey(now = new Date()) {
  return isoWeekKey(now);
}

export function getSoftIntentionForWeek(
  userId: string,
  weekKey: string,
): SoftIntention | null {
  const row = getDb()
    .prepare(
      `SELECT id, user_id, week_key, body, created_at, updated_at
       FROM soft_intentions
       WHERE user_id = ? AND week_key = ?`,
    )
    .get(userId, weekKey) as SoftIntentionRow | undefined;
  return row ? toIntention(row) : null;
}

export function getCurrentSoftIntention(
  userId: string,
  now = new Date(),
): SoftIntention | null {
  return getSoftIntentionForWeek(userId, currentWeekKey(now));
}

/** Most recent intention before the current ISO week (for next-review nudge). */
export function getLastSoftIntention(
  userId: string,
  now = new Date(),
): SoftIntention | null {
  const current = currentWeekKey(now);
  const previous = previousIsoWeekKey(current);
  const priorWeek = getSoftIntentionForWeek(userId, previous);
  if (priorWeek) return priorWeek;

  const row = getDb()
    .prepare(
      `SELECT id, user_id, week_key, body, created_at, updated_at
       FROM soft_intentions
       WHERE user_id = ? AND week_key < ?
       ORDER BY week_key DESC
       LIMIT 1`,
    )
    .get(userId, current) as SoftIntentionRow | undefined;
  return row ? toIntention(row) : null;
}

/** Upsert one soft intention for the ISO week. Empty body deletes. */
export function saveSoftIntentionForWeek(input: {
  userId: string;
  weekKey: string;
  body: string | null;
}): SoftIntention | null {
  const db = getDb();
  const existing = getSoftIntentionForWeek(input.userId, input.weekKey);
  const now = new Date().toISOString();

  if (!input.body) {
    if (existing) {
      db.prepare(`DELETE FROM soft_intentions WHERE id = ? AND user_id = ?`).run(
        existing.id,
        input.userId,
      );
    }
    return null;
  }

  if (existing) {
    db.prepare(
      `UPDATE soft_intentions SET body = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
    ).run(input.body, now, existing.id, input.userId);
    return {
      ...existing,
      body: input.body,
      updatedAt: now,
    };
  }

  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO soft_intentions (id, user_id, week_key, body, created_at, updated_at)
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

export function saveCurrentSoftIntention(
  userId: string,
  body: string | null,
  now = new Date(),
): SoftIntention | null {
  return saveSoftIntentionForWeek({
    userId,
    weekKey: currentWeekKey(now),
    body,
  });
}
