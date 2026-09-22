import { getDb } from "./client";
import { pickSoftWallSpotlight, type SoftSpotlightPick } from "@/lib/wall-spotlight";

type SpotlightRow = {
  id: string;
  summary: string;
  energy: string;
  praise_count: number;
  pinned: number;
  feeling: number | null;
  created_at: string;
  updated_at: string;
  owner_nickname: string | null;
  owner_email: string | null;
};

/**
 * Soft Wall “this week’s soft picks”: currently pinned notes plus
 * high-praise visible notes. Soft+ surfaces only; no emails in payload.
 */
export function listWallSpotlight(limit = 5): SoftSpotlightPick[] {
  const rows = getDb()
    .prepare(
      `SELECT
         n.id AS id,
         r.summary AS summary,
         r.energy AS energy,
         (SELECT COUNT(*) FROM wall_note_stickers s WHERE s.note_id = n.id) AS praise_count,
         n.pinned AS pinned,
         r.feeling AS feeling,
         n.created_at AS created_at,
         n.updated_at AS updated_at,
         u.nickname AS owner_nickname,
         u.email AS owner_email
       FROM wall_notes n
       JOIN reviews r ON r.id = n.review_id
       LEFT JOIN users u ON u.id = n.user_id
       WHERE n.hidden = 0
         AND (
           n.pinned = 1
           OR EXISTS (SELECT 1 FROM wall_note_stickers s WHERE s.note_id = n.id)
         )
       ORDER BY n.pinned DESC, praise_count DESC, datetime(n.updated_at) DESC`,
    )
    .all() as SpotlightRow[];

  return pickSoftWallSpotlight(
    rows.map((row) => ({
      id: row.id,
      summary: row.summary,
      energy: row.energy,
      praiseCount: row.praise_count,
      pinned: Boolean(row.pinned),
      feeling: row.feeling,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      ownerNickname: row.owner_nickname,
      ownerEmail: row.owner_email,
    })),
    { limit },
  );
}
