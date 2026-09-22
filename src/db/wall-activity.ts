import { noteExcerpt } from "@/lib/wall-canvas";
import { emailLocalFallback, wallOwnerNickname } from "@/lib/nickname";
import { getDb } from "./client";

export type WallActivityKind = "comment" | "reply" | "sticker";

export type WallActivityItem = {
  id: string;
  kind: WallActivityKind;
  createdAt: string;
  noteId: string;
  noteExcerpt: string;
  actorNickname: string | null;
  actorFallback: string | null;
  /** Comment / reply text (truncated). Null for stickers. */
  body: string | null;
  stickerEmoji: string | null;
};

type ActivityRow = {
  id: string;
  kind: string;
  created_at: string;
  note_id: string;
  summary: string;
  energy: string;
  actor_nickname: string | null;
  actor_email: string | null;
  body: string | null;
  sticker_emoji: string | null;
};

function truncateBody(body: string | null, max = 80) {
  if (!body) return null;
  const trimmed = body.trim();
  if (!trimmed) return null;
  const chars = Array.from(trimmed);
  if (chars.length <= max) return trimmed;
  return `${chars.slice(0, max).join("")}…`;
}

function toItem(row: ActivityRow): WallActivityItem {
  const kind: WallActivityKind =
    row.kind === "sticker" ? "sticker" : row.kind === "reply" ? "reply" : "comment";
  return {
    id: row.id,
    kind,
    createdAt: row.created_at,
    noteId: row.note_id,
    noteExcerpt: noteExcerpt(row.summary, row.energy),
    actorNickname: wallOwnerNickname(row.actor_nickname, row.actor_email, {
      allowEmailFallback: false,
    }),
    actorFallback: emailLocalFallback(row.actor_email),
    body: kind === "sticker" ? null : truncateBody(row.body),
    stickerEmoji: kind === "sticker" ? row.sticker_emoji : null,
  };
}

/**
 * Recent gentle compliments across Soft Wall — comments, one-level replies,
 * and stickers on visible notes. Soft+ surfaces only; no emails in payload.
 */
export function listWallActivity(limit = 24): WallActivityItem[] {
  const safeLimit = Math.max(1, Math.min(60, Math.floor(limit)));
  const rows = getDb()
    .prepare(
      `SELECT * FROM (
         SELECT
           c.id AS id,
           CASE WHEN c.parent_id IS NULL THEN 'comment' ELSE 'reply' END AS kind,
           c.created_at AS created_at,
           c.note_id AS note_id,
           r.summary AS summary,
           r.energy AS energy,
           u.nickname AS actor_nickname,
           u.email AS actor_email,
           c.body AS body,
           NULL AS sticker_emoji
         FROM wall_comments c
         JOIN wall_notes n ON n.id = c.note_id AND n.hidden = 0
         JOIN reviews r ON r.id = n.review_id
         LEFT JOIN users u ON u.id = c.user_id

         UNION ALL

         SELECT
           s.id AS id,
           'sticker' AS kind,
           s.created_at AS created_at,
           s.note_id AS note_id,
           r.summary AS summary,
           r.energy AS energy,
           u.nickname AS actor_nickname,
           u.email AS actor_email,
           NULL AS body,
           st.emoji AS sticker_emoji
         FROM wall_note_stickers s
         JOIN wall_notes n ON n.id = s.note_id AND n.hidden = 0
         JOIN reviews r ON r.id = n.review_id
         LEFT JOIN users u ON u.id = s.user_id
         LEFT JOIN stickers st ON st.id = s.sticker_id
       )
       ORDER BY datetime(created_at) DESC
       LIMIT ?`,
    )
    .all(safeLimit) as ActivityRow[];

  return rows.map(toItem);
}
