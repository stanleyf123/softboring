import type Database from "better-sqlite3";
import {
  assembleMonthlySoftReport,
  countInstantsInMonth,
  pauseWeeksTouchingMonth,
  type MonthlySoftReport,
} from "@/lib/soft-report";

type StampRow = { createdAt: string };
type PauseRow = { weekKey: string };

function stamps(db: Database.Database, sql: string, userId: string) {
  return (db.prepare(sql).all(userId) as StampRow[]).map((row) => row.createdAt);
}

/**
 * This member's month only. Counts never include another person's rows,
 * and the result has no note text or identities.
 */
export function readMonthlySoftReport(
  db: Database.Database,
  userId: string,
  now = new Date(),
  timeZone?: string | null,
): MonthlySoftReport {
  const thanks = stamps(
    db,
    `SELECT created_at AS createdAt FROM wall_note_thanks WHERE user_id = ?`,
    userId,
  );
  const echoes = stamps(
    db,
    `SELECT created_at AS createdAt FROM wall_note_echoes WHERE user_id = ?`,
    userId,
  );
  const draws = stamps(
    db,
    `SELECT created_at AS createdAt FROM soft_gratitude_draws WHERE user_id = ?`,
    userId,
  );
  const pauses = (
    db.prepare(`SELECT week_key AS weekKey FROM week_pauses WHERE user_id = ?`).all(userId) as PauseRow[]
  ).map((row) => row.weekKey);

  return assembleMonthlySoftReport(
    {
      thanksGiven: countInstantsInMonth(thanks, now, timeZone),
      echoes: countInstantsInMonth(echoes, now, timeZone),
      gratitudesDrawn: countInstantsInMonth(draws, now, timeZone),
      pauseWeeks: pauseWeeksTouchingMonth(pauses, now, timeZone),
    },
    now,
    timeZone,
  );
}
