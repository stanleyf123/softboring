import { routing } from "@/i18n/routing";
import {
  nextPublicWallCount,
  type PublicWallCountCache,
} from "@/lib/public-wall-count";
import { getDb } from "./client";

export type PublicSoftStats = {
  /** Visible Soft Wall notes created in the last 7 days (hidden notes excluded). */
  wallNotesThisWeek: number;
  /** All visible Soft Wall notes (hidden notes excluded). Cached briefly. */
  publicWallNotes: number;
  /** Public locales Soft Boring ships with. */
  languages: number;
};

let publicWallCountCache: PublicWallCountCache | null = null;

function countVisibleWallNotes(since?: string) {
  if (since) {
    return (
      getDb()
        .prepare(
          `SELECT COUNT(*) AS n FROM wall_notes
           WHERE hidden = 0 AND created_at >= ?`,
        )
        .get(since) as { n: number }
    ).n;
  }
  return (
    getDb()
      .prepare(`SELECT COUNT(*) AS n FROM wall_notes WHERE hidden = 0`)
      .get() as { n: number }
  ).n;
}

/** Anonymous homepage strip — counts only, never note bodies or emails. */
export function publicSoftStats(now = Date.now()): PublicSoftStats {
  const since = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const wallNotesThisWeek = countVisibleWallNotes(since);
  const counted = nextPublicWallCount({
    cache: publicWallCountCache,
    now,
    load: () => countVisibleWallNotes(),
  });
  publicWallCountCache = counted.cache;

  return {
    wallNotesThisWeek,
    publicWallNotes: counted.value,
    languages: routing.locales.length,
  };
}
