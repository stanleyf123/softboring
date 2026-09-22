import type Database from "better-sqlite3";
import {
  presenceHourKey,
  presencePublicView,
  presenceWindowStart,
  shouldCountPresenceHit,
  type PresencePublic,
} from "@/lib/wall-presence";

const KEEP_HOURS = 48;

export function recordPresenceHit(db: Database.Database, now: Date) {
  const hourKey = presenceHourKey(now);
  if (!hourKey) return;
  db.prepare(
    `INSERT INTO wall_presence_hours (hour_key, hits) VALUES (?, 1)
     ON CONFLICT(hour_key) DO UPDATE SET hits = hits + 1`,
  ).run(hourKey);
  const cutoff = presenceHourKey(new Date(now.getTime() - KEEP_HOURS * 60 * 60 * 1000));
  if (cutoff) {
    db.prepare(`DELETE FROM wall_presence_hours WHERE hour_key < ?`).run(cutoff);
  }
}

export function sumPresenceHits(db: Database.Database, since: Date) {
  const start = presenceHourKey(since);
  if (!start) return 0;
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(hits), 0) AS n FROM wall_presence_hours WHERE hour_key >= ?`,
    )
    .get(start) as { n: number };
  return row.n;
}

/** Thanks plus echoes created in the window. Rows, not people. */
export function countRecentWarmth(db: Database.Database, since: Date) {
  const iso = since.toISOString();
  const row = db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM wall_note_thanks WHERE created_at >= ?) +
         (SELECT COUNT(*) FROM wall_note_echoes WHERE created_at >= ?) AS n`,
    )
    .get(iso, iso) as { n: number };
  return row.n;
}

export function applyPresenceVisit(
  db: Database.Database,
  now: Date,
  options: { cookieHour?: string | null; count: boolean },
): { view: PresencePublic; setCookieHour: string | null } {
  const hourKey = presenceHourKey(now);
  let setCookieHour: string | null = null;
  if (options.count && shouldCountPresenceHit(options.cookieHour, hourKey)) {
    recordPresenceHit(db, now);
    setCookieHour = hourKey;
  }
  const since = presenceWindowStart(now);
  const view = presencePublicView({
    readers: sumPresenceHits(db, since),
    warmth: countRecentWarmth(db, since),
  });
  return { view, setCookieHour };
}
