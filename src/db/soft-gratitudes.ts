import { getDb } from "./client";
import {
  GRATITUDE_JAR_CAP,
  GRATITUDE_MAX,
  gratitudePickIndex,
  parseGratitudeBody,
} from "@/lib/gratitude-jar";

export { GRATITUDE_JAR_CAP, GRATITUDE_MAX, parseGratitudeBody };

export type SoftGratitude = {
  id: string;
  body: string;
  createdAt: string;
};

type SoftGratitudeRow = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
};

function toGratitude(row: SoftGratitudeRow): SoftGratitude {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
  };
}

export function countGratitudes(userId: string): number {
  const row = getDb()
    .prepare(`SELECT COUNT(*) AS n FROM soft_gratitudes WHERE user_id = ?`)
    .get(userId) as { n: number };
  return row.n;
}

export function listGratitudes(userId: string): SoftGratitude[] {
  const rows = getDb()
    .prepare(
      `SELECT id, user_id, body, created_at
       FROM soft_gratitudes
       WHERE user_id = ?
       ORDER BY created_at ASC, id ASC`,
    )
    .all(userId) as SoftGratitudeRow[];
  return rows.map(toGratitude);
}

export type AddGratitudeResult =
  | { ok: true; gratitude: SoftGratitude; count: number }
  | { ok: false; reason: "invalid" | "full" };

export function addGratitude(userId: string, body: string): AddGratitudeResult {
  const parsed = parseGratitudeBody(body);
  if (!parsed) return { ok: false, reason: "invalid" };
  const existing = countGratitudes(userId);
  if (existing >= GRATITUDE_JAR_CAP) return { ok: false, reason: "full" };

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO soft_gratitudes (id, user_id, body, created_at)
       VALUES (?, ?, ?, ?)`,
    )
    .run(id, userId, parsed, createdAt);

  return {
    ok: true,
    gratitude: { id, body: parsed, createdAt },
    count: existing + 1,
  };
}

/** A random line from this member's jar. Order is stable; the index is the only chance. */
export function pickRandomGratitude(
  userId: string,
  randomUnit = Math.random(),
): SoftGratitude | null {
  const rows = listGratitudes(userId);
  const index = gratitudePickIndex(rows.length, randomUnit);
  if (index < 0) return null;
  return rows[index] ?? null;
}

export function deleteGratitude(userId: string, id: string): boolean {
  const result = getDb()
    .prepare(`DELETE FROM soft_gratitudes WHERE id = ? AND user_id = ?`)
    .run(id, userId);
  return result.changes > 0;
}
