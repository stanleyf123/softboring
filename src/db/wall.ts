import { getDb } from "./client";
import { isDemoEmail } from "@/lib/demo";
import { emailLocalFallback, wallOwnerNickname } from "@/lib/nickname";
import { isSoftPlusPlan } from "@/lib/plan";
import {
  clampNotePosition,
  colorForIndex,
  isWallColor,
  noteExcerpt,
  notePositionForIndex,
  WALL_PIN_Z,
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
  pinned: number;
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
  owner_plan: string | null;
  owner_plan_status: string | null;
  owner_nickname: string | null;
  owner_email: string | null;
  owner_is_demo: number;
  invite_redeemed: number;
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
  pinned: boolean;
  ownerSoftPlus: boolean;
  ownerNickname: string | null;
  ownerFallback: string | null;
  ownerInviteBadge: boolean;
  ownerIsDemo: boolean;
  stickers: Array<{ stickerId: string; slug: string; emoji: string; count: number }>;
};

export type WallNoteDetail = WallNoteListItem & {
  energy: string;
  drain: string;
  lessOf: string;
  priorities: string;
  locale: string | null;
  reviewId: string;
  ownerUserId: string;
};

export type WallComment = {
  id: string;
  body: string;
  createdAt: string;
  mine: boolean;
  parentId: string | null;
};

export type WallCommentRow = {
  id: string;
  note_id: string;
  user_id: string;
  body: string;
  parent_id: string | null;
  created_at: string;
};

const NOTE_SELECT = `
  SELECT n.id, n.review_id, n.user_id, n.x, n.y, n.z, n.color, n.hidden, n.pinned,
         n.created_at, n.updated_at,
         r.energy, r.drain, r.less_of, r.priorities, r.feeling, r.summary, r.locale,
         r.created_at AS review_created_at,
         u.plan AS owner_plan, u.plan_status AS owner_plan_status,
         u.nickname AS owner_nickname, u.email AS owner_email,
         COALESCE(u.is_demo, 0) AS owner_is_demo,
         (SELECT COUNT(*) FROM wall_note_stickers s WHERE s.note_id = n.id) AS praise_count,
         (SELECT COUNT(*) FROM invites i WHERE i.inviter_id = n.user_id) AS invite_redeemed
  FROM wall_notes n
  JOIN reviews r ON r.id = n.review_id
  LEFT JOIN users u ON u.id = n.user_id
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
    pinned: Boolean(row.pinned),
    ownerSoftPlus: isSoftPlusPlan(row.owner_plan, row.owner_plan_status),
    ownerNickname: wallOwnerNickname(row.owner_nickname, row.owner_email, {
      allowEmailFallback: false,
    }),
    ownerFallback: emailLocalFallback(row.owner_email),
    ownerInviteBadge: row.invite_redeemed > 0,
    ownerIsDemo: Boolean(row.owner_is_demo) || isDemoEmail(row.owner_email),
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
    ownerUserId: row.user_id,
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
  color?: WallColor | null;
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
  const color =
    input.color && isWallColor(input.color) ? input.color : colorForIndex(countRow.n);

  db.prepare(
    `INSERT INTO wall_notes (
      id, review_id, user_id, x, y, z, color, hidden, pinned, created_at, updated_at
    ) VALUES (
      @id, @review_id, @user_id, @x, @y, @z, @color, 0, 0, @created_at, @updated_at
    )`,
  ).run({
    id,
    review_id: input.reviewId,
    user_id: input.userId,
    x: position.x,
    y: position.y,
    z: maxZ.z + 1,
    color,
    created_at: now,
    updated_at: now,
  });

  const created = db
    .prepare(`${NOTE_SELECT} WHERE n.id = ?`)
    .get(id) as WallNoteRow | undefined;
  if (!created) {
    const error = new Error("share_insert_failed");
    error.name = "WallShareError";
    throw error;
  }

  const item = attachStickers([toListItem(created, input.userId)])[0];
  const visible = listVisibleWallNotes(input.userId).some((note) => note.id === item.id);
  if (!visible) {
    const error = new Error("share_not_visible");
    error.name = "WallShareError";
    throw error;
  }
  return item;
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
    .prepare(`SELECT id, hidden, pinned FROM wall_notes WHERE id = ?`)
    .get(input.id) as { id: string; hidden: number; pinned: number } | undefined;
  if (!current || current.hidden) return 0;

  const next = clampNotePosition(input.x, input.y);
  const maxZ = getDb()
    .prepare(`SELECT COALESCE(MAX(z), 0) AS z FROM wall_notes`)
    .get() as { z: number };
  let z = input.z == null ? maxZ.z + 1 : Math.max(0, Math.round(input.z));
  if (current.pinned) {
    z = Math.max(WALL_PIN_Z, z);
  } else if (z >= WALL_PIN_Z) {
    z = WALL_PIN_Z - 1;
  }

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

export function pinWallNoteForUser(id: string, userId: string, pinned: boolean) {
  const db = getDb();
  const current = db
    .prepare(`SELECT id, user_id, hidden, pinned FROM wall_notes WHERE id = ?`)
    .get(id) as
    | { id: string; user_id: string; hidden: number; pinned: number }
    | undefined;
  if (!current || current.hidden || current.user_id !== userId) return 0;

  const now = new Date().toISOString();
  const run = db.transaction(() => {
    if (pinned) {
      db.prepare(
        `UPDATE wall_notes
         SET pinned = 0,
             z = CASE WHEN z >= @pin THEN z - @pin ELSE z END,
             updated_at = @now
         WHERE user_id = @userId AND pinned = 1 AND id != @id`,
      ).run({ pin: WALL_PIN_Z, now, userId, id });
      const maxZ = db
        .prepare(`SELECT COALESCE(MAX(z), 0) AS z FROM wall_notes`)
        .get() as { z: number };
      return db
        .prepare(
          `UPDATE wall_notes
           SET pinned = 1, z = @z, updated_at = @now
           WHERE id = @id AND user_id = @userId AND hidden = 0`,
        )
        .run({
          id,
          userId,
          now,
          z: Math.max(WALL_PIN_Z, maxZ.z + 1),
        }).changes;
    }
    return db
      .prepare(
        `UPDATE wall_notes
         SET pinned = 0,
             z = CASE WHEN z >= @pin THEN z - @pin ELSE z END,
             updated_at = @now
         WHERE id = @id AND user_id = @userId`,
      )
      .run({ pin: WALL_PIN_Z, now, id, userId }).changes;
  });
  return run();
}

function toComment(row: WallCommentRow, viewerId: string | null): WallComment {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    mine: viewerId === row.user_id,
    parentId: row.parent_id,
  };
}

export function getWallComment(id: string): WallCommentRow | undefined {
  return getDb()
    .prepare(
      `SELECT id, note_id, user_id, body, parent_id, created_at
       FROM wall_comments
       WHERE id = ?`,
    )
    .get(id) as WallCommentRow | undefined;
}

export function listWallComments(noteId: string, viewerId: string | null): WallComment[] {
  const rows = getDb()
    .prepare(
      `SELECT id, note_id, user_id, body, parent_id, created_at
       FROM wall_comments
       WHERE note_id = ?
       ORDER BY datetime(created_at) ASC`,
    )
    .all(noteId) as WallCommentRow[];

  return rows.map((row) => toComment(row, viewerId));
}

export function addWallComment(input: {
  noteId: string;
  userId: string;
  body: string;
  parentId?: string | null;
}) {
  const parentId = input.parentId ?? null;
  if (parentId) {
    const parent = getWallComment(parentId);
    if (!parent || parent.note_id !== input.noteId || parent.parent_id) {
      const error = new Error("invalid_parent");
      error.name = "WallCommentParentError";
      throw error;
    }
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO wall_comments (id, note_id, user_id, body, parent_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(id, input.noteId, input.userId, input.body, parentId, createdAt);
  return {
    id,
    body: input.body,
    createdAt,
    mine: true,
    parentId,
  } satisfies WallComment;
}

export function deleteWallCommentForUser(id: string, userId: string) {
  const db = getDb();
  const row = db
    .prepare(`SELECT id FROM wall_comments WHERE id = ? AND user_id = ?`)
    .get(id, userId) as { id: string } | undefined;
  if (!row) return 0;
  const run = db.transaction(() => {
    db.prepare(`DELETE FROM wall_comments WHERE parent_id = ?`).run(id);
    return db.prepare(`DELETE FROM wall_comments WHERE id = ? AND user_id = ?`).run(id, userId)
      .changes;
  });
  return run();
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
  flagCount: number;
};

function mapAdminWallNote(row: {
  id: string;
  created_at: string;
  hidden: number;
  summary: string;
  user_email: string | null;
  praise_count: number;
  flag_count: number;
}): AdminWallNote {
  return {
    id: row.id,
    createdAt: row.created_at,
    hidden: Boolean(row.hidden),
    summary: row.summary,
    userEmail: row.user_email,
    praiseCount: row.praise_count,
    flagCount: row.flag_count,
  };
}

const ADMIN_WALL_SELECT = `SELECT n.id, n.created_at, n.hidden, r.summary, u.email AS user_email,
              (SELECT COUNT(*) FROM wall_note_stickers s WHERE s.note_id = n.id) AS praise_count,
              (SELECT COUNT(*) FROM wall_note_flags f WHERE f.note_id = n.id) AS flag_count
       FROM wall_notes n
       JOIN reviews r ON r.id = n.review_id
       LEFT JOIN users u ON u.id = n.user_id`;

export function listAdminWallNotes(limit = 200): AdminWallNote[] {
  const rows = getDb()
    .prepare(
      `${ADMIN_WALL_SELECT}
       ORDER BY flag_count DESC, datetime(n.created_at) DESC
       LIMIT ?`,
    )
    .all(limit) as Array<{
    id: string;
    created_at: string;
    hidden: number;
    summary: string;
    user_email: string | null;
    praise_count: number;
    flag_count: number;
  }>;

  return rows.map(mapAdminWallNote);
}

export function listAdminWallNotesForUser(
  userId: string,
  limit = 200,
): AdminWallNote[] {
  const rows = getDb()
    .prepare(
      `${ADMIN_WALL_SELECT}
       WHERE n.user_id = ?
       ORDER BY flag_count DESC, datetime(n.created_at) DESC
       LIMIT ?`,
    )
    .all(userId, limit) as Array<{
    id: string;
    created_at: string;
    hidden: number;
    summary: string;
    user_email: string | null;
    praise_count: number;
    flag_count: number;
  }>;

  return rows.map(mapAdminWallNote);
}

export function countWallNotes() {
  const row = getDb()
    .prepare(`SELECT COUNT(*) AS n FROM wall_notes`)
    .get() as { n: number };
  return row.n;
}
