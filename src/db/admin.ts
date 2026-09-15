import { getDb } from "./client";

export type AdminUserListItem = {
  id: string;
  email: string;
  createdAt: string;
  reviewCount: number;
};

export type AdminReviewListItem = {
  id: string;
  createdAt: string;
  locale: string | null;
  summary: string;
  feeling: number | null;
  userId: string | null;
  userEmail: string | null;
  guestId: string;
};

export type AdminReviewDetail = AdminReviewListItem & {
  energy: string;
  drain: string;
  lessOf: string;
  priorities: string;
};

export function adminCounts() {
  const db = getDb();
  const users = (db.prepare(`SELECT COUNT(*) AS n FROM users`).get() as { n: number }).n;
  const reviews = (db.prepare(`SELECT COUNT(*) AS n FROM reviews`).get() as { n: number }).n;
  return { users, reviews };
}

export function listAdminUsers(limit = 200): AdminUserListItem[] {
  const rows = getDb()
    .prepare(
      `SELECT u.id, u.email, u.created_at,
              (SELECT COUNT(*) FROM reviews r WHERE r.user_id = u.id) AS review_count
       FROM users u
       ORDER BY datetime(u.created_at) DESC
       LIMIT ?`,
    )
    .all(limit) as Array<{
    id: string;
    email: string;
    created_at: string;
    review_count: number;
  }>;

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    createdAt: row.created_at,
    reviewCount: row.review_count,
  }));
}

export function listAdminReviews(limit = 200): AdminReviewListItem[] {
  const rows = getDb()
    .prepare(
      `SELECT r.id, r.created_at, r.locale, r.summary, r.feeling, r.user_id, r.guest_id, u.email AS user_email
       FROM reviews r
       LEFT JOIN users u ON u.id = r.user_id
       ORDER BY datetime(r.created_at) DESC
       LIMIT ?`,
    )
    .all(limit) as Array<{
    id: string;
    created_at: string;
    locale: string | null;
    summary: string;
    feeling: number | null;
    user_id: string | null;
    guest_id: string;
    user_email: string | null;
  }>;

  return rows.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    locale: row.locale,
    summary: row.summary,
    feeling: row.feeling,
    userId: row.user_id,
    userEmail: row.user_email,
    guestId: row.guest_id,
  }));
}

export function getAdminReview(id: string): AdminReviewDetail | undefined {
  const row = getDb()
    .prepare(
      `SELECT r.id, r.created_at, r.locale, r.summary, r.feeling, r.user_id, r.guest_id,
              r.energy, r.drain, r.less_of, r.priorities, u.email AS user_email
       FROM reviews r
       LEFT JOIN users u ON u.id = r.user_id
       WHERE r.id = ?`,
    )
    .get(id) as
    | {
        id: string;
        created_at: string;
        locale: string | null;
        summary: string;
        feeling: number | null;
        user_id: string | null;
        guest_id: string;
        energy: string;
        drain: string;
        less_of: string;
        priorities: string;
        user_email: string | null;
      }
    | undefined;

  if (!row) return undefined;
  return {
    id: row.id,
    createdAt: row.created_at,
    locale: row.locale,
    summary: row.summary,
    feeling: row.feeling,
    userId: row.user_id,
    userEmail: row.user_email,
    guestId: row.guest_id,
    energy: row.energy,
    drain: row.drain,
    lessOf: row.less_of,
    priorities: row.priorities,
  };
}

export function deleteAdminReview(id: string) {
  return getDb().prepare(`DELETE FROM reviews WHERE id = ?`).run(id).changes;
}
