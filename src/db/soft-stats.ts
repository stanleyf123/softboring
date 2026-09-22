import { routing } from "@/i18n/routing";
import { getDb } from "./client";

export type PublicSoftStats = {
  /** Visible Soft Wall notes created in the last 7 days (hidden notes excluded). */
  wallNotesThisWeek: number;
  /** Public locales Soft Boring ships with. */
  languages: number;
};

/** Anonymous homepage strip — counts only, never note bodies or emails. */
export function publicSoftStats(): PublicSoftStats {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const wallNotesThisWeek = (
    getDb()
      .prepare(
        `SELECT COUNT(*) AS n FROM wall_notes
         WHERE hidden = 0 AND created_at >= ?`,
      )
      .get(since) as { n: number }
  ).n;

  return {
    wallNotesThisWeek,
    languages: routing.locales.length,
  };
}
