import { getDb } from "./client";
import {
  clampNotePosition,
  colorForIndex,
  isWallColor,
  noteExcerpt,
  notePositionForIndex,
  type WallColor,
} from "@/lib/wall-canvas";
import { stickerCountsByNote } from "./stickers";

export type WallNoteRow = {
  id: string;
  review_id: string;
  user_id: string;
  x: number;
  y: number;
  z: number;
  color: string;
  hidden: number;
  created_at: string;
  updated_at: string;
  energy: string;
  drain: string;
  less_of: string;
  priorities: string;
  feeling: number | null;
  summary: string;
  locale: string | null;
  review_created_at: string;
  praise_count: number;
};

export type WallNoteListItem = {
  id: string;
  x: number;
  y: number;
  z: number;
  color: WallColor;
  praiseCount: number;
  createdAt: string;
  mine: boolean;
  excerpt: string;
  feeling: number | null;
  summary: string;
  stickers: Array<{ stickerId: string; slug: string; emoji: string; count: number }>;
};

export type WallNoteDetail = WallNoteListItem & {
  energy: string;
  drain: string;
  lessOf: string;
  priorities: string;
  locale: string | null;
  reviewId: string;
};

export type WallComment = {
  id: string;
  body: string;
  createdAt: string;
  mine: boolean;
};

const NOTE_SELECT = `
  SELECT n.id, n.review_id, n.user_id, n.x, n.y, n.z, n.color, n.hidden,
         n.created_at, n.updated_at,
         r.energy, r.drain, r.less_of, r.priorities, r.feeling, r.summary, r.locale,
         r.created_at AS review_created_at,
         (SELECT COUNT(*) FROM wall_note_stickers s WHERE s.note_id = n.id) AS praise_count
  FROM wall_notes n
  JOIN reviews r ON r.id = n.review_id
`;

function toListItem(row: WallNoteRow, viewerId: string | null): WallNoteListItem {
  const color = isWallColor(row.color) ? row.color : "peach";
  return {
    id: row.id,
    x: row.x,
    y: row.y,
    z: row.z,
    color,
    praiseCount: row.praise_count,
    createdAt: row.created_at,
    mine: viewerId === row.user_id,
    excerpt: noteExcerpt(row.summary, row.energy),
    feeling: row.feeling,
    summary: row.summary,
    stickers: [],
  };
}

function attachStickers<T extends { id: string; stickers: WallNoteListItem["stickers"] }>(
  notes: T[],
): T[] {
  const counts = stickerCountsByNote(notes.map((note) => note.id));
  return notes.map((note) => ({
    ...note,
    stickers: counts.get(note.id) ?? [],
  }));
}

export function listVisibleWallNotes(viewerId: string | null): WallNoteListItem[] {
  const rows = getDb()
    .prepare(`${NOTE_SELECT} WHERE n.hidden = 0 ORDER BY n.z ASC, datetime(n.created_at) ASC`)
    .all() as WallNoteRow[];
  return attachStickers(rows.map((row) => toListItem(row, viewerId)));
}

export function countVisibleWallNotes() {
  const row = getDb()
    .prepare(`SELECT COUNT(*) AS n FROM wall_notes WHERE hidden = 0`)
    .get() as { n: number };
  return row.n;
}

export function getWallNote(id: string, viewerId: string | null): WallNoteDetail | undefined {
  const row = getDb()
    .prepare(`${NOTE_SELECT} WHERE n.id = ?`)
    .get(id) as WallNoteRow | undefined;
  if (!row || row.hidden) return undefined;
  const item = toListItem(row, viewerId);
  return {
    ...item,
    stickers: stickerCountsByNote([row.id]).get(row.id) ?? [],
    energy: row.energy,
    drain: row.drain,
    lessOf: row.less_of,
    priorities: row.priorities,
    locale: row.locale,
    reviewId: row.review_id,
  };
}

export function getWallNoteIncludingHidden(id: string): WallNoteRow | undefined {
  return getDb()
    .prepare(`${NOTE_SELECT} WHERE n.id = ?`)
    .get(id) as WallNoteRow | undefined;
}

export function getWallNoteIdForReview(reviewId: string): string | null {
  const row = getDb()
    .prepare(`SELECT id FROM wall_notes WHERE review_id = ?`)
    .get(reviewId) as { id: string } | undefined;
  return row?.id ?? null;
}

export function shareWallNote(input: {
  reviewId: string;
  userId: string;
}): WallNoteListItem {
  const db = getDb();
  const existing = db
    .prepare(`${NOTE_SELECT} WHERE n.review_id = ?`)
    .get(input.reviewId) as WallNoteRow | undefined;
  if (existing) {
    if (existing.user_id !== input.userId) {
      const error = new Error("forbidden");
      error.name = "WallForbiddenError";
      throw error;
    }
    return attachStickers([toListItem(existing, input.userId)])[0];
  }

  const countRow = db
    .prepare(`SELECT COUNT(*) AS n FROM wall_notes`)
    .get() as { n: number };
  const maxZ = db
    .prepare(`SELECT COALESCE(MAX(z), 0) AS z FROM wall_notes`)
    .get() as { z: number };
  const position = notePositionForIndex(countRow.n);
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  db.prepare(
    `INSERT INTO wall_notes (
      id, review_id, user_id, x, y, z, color, hidden, created_at, updated_at
    ) VALUES (
      @id, @review_id, @user_id, @x, @y, @z, @color, 0, @created_at, @updated_at
    )`,
  ).run({
    id,
    review_id: input.reviewId,
    user_id: input.userId,
    x: position.x,
    y: position.y,
    z: maxZ.z + 1,
    color: colorForIndex(countRow.n),
    created_at: now,
    updated_at: now,
  });

  const created = db
    .prepare(`${NOTE_SELECT} WHERE n.id = ?`)
    .get(id) as WallNoteRow;
  return toListItem(created, input.userId);
}

export function deleteWallNoteForUser(id: string, userId: string) {
  return getDb()
    .prepare(`DELETE FROM wall_notes WHERE id = ? AND user_id = ?`)
    .run(id, userId).changes;
}

export function deleteWallNoteForReview(reviewId: string, userId: string) {
  return getDb()
    .prepare(`DELETE FROM wall_notes WHERE review_id = ? AND user_id = ?`)
    .run(reviewId, userId).changes;
}

export function updateWallNotePosition(input: {
  id: string;
  x: number;
  y: number;
  z?: number;
}) {
  const current = getDb()
    .prepare(`SELECT id, hidden FROM wall_notes WHERE id = ?`)
    .get(input.id) as { id: string; hidden: number } | undefined;
  if (!current || current.hidden) return 0;

  const next = clampNotePosition(input.x, input.y);
  const maxZ = getDb()
    .prepare(`SELECT COALESCE(MAX(z), 0) AS z FROM wall_notes`)
    .get() as { z: number };
  const z = input.z == null ? maxZ.z + 1 : Math.max(0, Math.round(input.z));

  return getDb()
    .prepare(
      `UPDATE wall_notes
       SET x = @x, y = @y, z = @z, updated_at = @updated_at
       WHERE id = @id AND hidden = 0`,
    )
    .run({
      id: input.id,
      x: next.x,
      y: next.y,
      z,
      updated_at: new Date().toISOString(),
    }).changes;
}

export function listWallComments(noteId: string, viewerId: string | null): WallComment[] {
  const rows = getDb()
    .prepare(
      `SELECT id, user_id, body, created_at
       FROM wall_comments
       WHERE note_id = ?
       ORDER BY datetime(created_at) ASC`,
    )
    .all(noteId) as Array<{
    id: string;
    user_id: string;
    body: string;
    created_at: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    mine: viewerId === row.user_id,
  }));
}

export function addWallComment(input: { noteId: string; userId: string; body: string }) {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO wall_comments (id, note_id, user_id, body, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(id, input.noteId, input.userId, input.body, createdAt);
  return {
    id,
    body: input.body,
    createdAt,
    mine: true,
  } satisfies WallComment;
}

export function deleteWallCommentForUser(id: string, userId: string) {
  return getDb()
    .prepare(`DELETE FROM wall_comments WHERE id = ? AND user_id = ?`)
    .run(id, userId).changes;
}

export function setWallNoteHidden(id: string, hidden: boolean) {
  return getDb()
    .prepare(
      `UPDATE wall_notes SET hidden = ?, updated_at = ? WHERE id = ?`,
    )
    .run(hidden ? 1 : 0, new Date().toISOString(), id).changes;
}

export type AdminWallNote = {
  id: string;
  createdAt: string;
  hidden: boolean;
  summary: string;
  userEmail: string | null;
  praiseCount: number;
};

export function listAdminWallNotes(limit = 200): AdminWallNote[] {
  const rows = getDb()
    .prepare(
      `SELECT n.id, n.created_at, n.hidden, r.summary, u.email AS user_email,
              (SELECT COUNT(*) FROM wall_note_stickers s WHERE s.note_id = n.id) AS praise_count
       FROM wall_notes n
       JOIN reviews r ON r.id = n.review_id
       LEFT JOIN users u ON u.id = n.user_id
       ORDER BY datetime(n.created_at) DESC
       LIMIT ?`,
    )
    .all(limit) as Array<{
    id: string;
    created_at: string;
    hidden: number;
    summary: string;
    user_email: string | null;
    praise_count: number;
  }>;

  return rows.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    hidden: Boolean(row.hidden),
    summary: row.summary,
    userEmail: row.user_email,
    praiseCount: row.praise_count,
  }));
}

export function countWallNotes() {
  const row = getDb()
    .prepare(`SELECT COUNT(*) AS n FROM wall_notes`)
    .get() as { n: number };
  return row.n;
}
