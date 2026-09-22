import { getDb } from "@/db/client";
import { isShareId } from "@/lib/soft-copy-link";
import { toPublicWallNoteOg, type WallNoteOgSource } from "@/lib/wall-note-og";

type OgRow = {
  id: string;
  summary: string | null;
  energy: string | null;
  color: string | null;
  owner_nickname: string | null;
  hidden: number;
};

/**
 * Public fields for a share image.
 * The query does not select email, user id, or review id.
 */
export function getPublicWallNoteOg(id: string) {
  if (!isShareId(id)) return null;
  const row = getDb()
    .prepare(
      `SELECT n.id AS id,
              n.color AS color,
              n.hidden AS hidden,
              r.summary AS summary,
              r.energy AS energy,
              u.nickname AS owner_nickname
       FROM wall_notes n
       JOIN reviews r ON r.id = n.review_id
       LEFT JOIN users u ON u.id = n.user_id
       WHERE n.id = ?`,
    )
    .get(id) as OgRow | undefined;
  if (!row) return null;
  const source: WallNoteOgSource = {
    id: row.id,
    summary: row.summary ?? "",
    energy: row.energy ?? "",
    color: row.color,
    ownerNickname: row.owner_nickname,
    hidden: Boolean(row.hidden),
  };
  return toPublicWallNoteOg(source);
}
