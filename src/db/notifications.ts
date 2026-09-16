import { getDb } from "./client";

export type NotificationKind = "wall_comment" | "wall_reply";

export type NotificationItem = {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

type NotificationRow = {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

function toItem(row: NotificationRow): NotificationItem {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    href: row.href,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export function createNotification(input: {
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href?: string | null;
}) {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO notifications (id, user_id, kind, title, body, href, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.userId,
      input.kind,
      input.title,
      input.body,
      input.href ?? null,
      createdAt,
    );
  return {
    id,
    kind: input.kind,
    title: input.title,
    body: input.body,
    href: input.href ?? null,
    readAt: null,
    createdAt,
  } satisfies NotificationItem;
}

export function listNotificationsForUser(userId: string, limit = 30): NotificationItem[] {
  const rows = getDb()
    .prepare(
      `SELECT id, kind, title, body, href, read_at, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY datetime(created_at) DESC
       LIMIT ?`,
    )
    .all(userId, limit) as NotificationRow[];
  return rows.map(toItem);
}

export function countUnreadNotifications(userId: string) {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL`,
    )
    .get(userId) as { n: number };
  return row.n;
}

export function markNotificationRead(id: string, userId: string) {
  return getDb()
    .prepare(
      `UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ? AND read_at IS NULL`,
    )
    .run(new Date().toISOString(), id, userId).changes;
}

export function markAllNotificationsRead(userId: string) {
  return getDb()
    .prepare(
      `UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL`,
    )
    .run(new Date().toISOString(), userId).changes;
}
