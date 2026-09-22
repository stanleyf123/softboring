import { getDb } from "./client";
import { isPauseWeekKey } from "@/lib/pause-week";

export { currentPauseWeekKey, isPauseWeekKey } from "@/lib/pause-week";

export function listPauseWeekKeys(userId: string): string[] {
  const rows = getDb()
    .prepare(`SELECT week_key FROM week_pauses WHERE user_id = ? ORDER BY week_key ASC`)
    .all(userId) as { week_key: string }[];
  return rows.map((row) => row.week_key).filter(isPauseWeekKey);
}

export function isWeekPaused(userId: string, weekKey: string) {
  if (!isPauseWeekKey(weekKey)) return false;
  const row = getDb()
    .prepare(`SELECT 1 AS ok FROM week_pauses WHERE user_id = ? AND week_key = ?`)
    .get(userId, weekKey) as { ok: number } | undefined;
  return Boolean(row);
}

/** Mark or clear one ISO week. Empty pause is just the absence of a row. */
export function setWeekPaused(userId: string, weekKey: string, paused: boolean) {
  if (!isPauseWeekKey(weekKey)) return false;
  const db = getDb();
  if (!paused) {
    db.prepare(`DELETE FROM week_pauses WHERE user_id = ? AND week_key = ?`).run(userId, weekKey);
    return false;
  }
  db.prepare(
    `INSERT INTO week_pauses (user_id, week_key, created_at) VALUES (?, ?, ?)
     ON CONFLICT(user_id, week_key) DO NOTHING`,
  ).run(userId, weekKey, new Date().toISOString());
  return true;
}
