import { wallOwnerNickname } from "@/lib/nickname";
import { noteExcerpt } from "@/lib/wall-canvas";

export const NEIGHBOR_HIGHLIGHTS_LIMIT = 8;

export type NeighborHighlight = {
  noteId: string;
  nickname: string | null;
  thankCount: number;
  excerpt: string;
};

export type NeighborHighlightRow = {
  note_id: string;
  thank_count: number;
  nickname: string | null;
  email: string | null;
  summary: string | null;
  energy: string | null;
};

export const NEIGHBOR_HIGHLIGHTS_SQL = `
  SELECT
    n.id AS note_id,
    COUNT(*) AS thank_count,
    MAX(u.nickname) AS nickname,
    MAX(u.email) AS email,
    MAX(r.summary) AS summary,
    MAX(r.energy) AS energy
  FROM wall_note_thanks t
  JOIN wall_notes n ON n.id = t.note_id
  JOIN reviews r ON r.id = n.review_id
  LEFT JOIN users u ON u.id = n.user_id
  WHERE n.hidden = 0
    AND t.created_at >= ?
  GROUP BY n.id
  ORDER BY thank_count DESC, MAX(t.created_at) DESC
  LIMIT ?
`;

export function toNeighborHighlight(row: NeighborHighlightRow): NeighborHighlight {
  const thankCount = Number(row.thank_count);
  return {
    noteId: row.note_id,
    nickname: wallOwnerNickname(row.nickname, row.email, { allowEmailFallback: true }),
    thankCount: Number.isFinite(thankCount) ? Math.max(0, Math.floor(thankCount)) : 0,
    excerpt: noteExcerpt(row.summary ?? "", row.energy ?? ""),
  };
}
