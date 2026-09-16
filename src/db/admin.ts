import { getDb } from "./client";
import { isoWeekKey, previousIsoWeekKey } from "@/lib/plus-insights";
import { displayPlan, type PlanId } from "@/lib/plan";
import { paymentRevenueSummary, type PaymentRevenueSummary } from "./payments";

const LAST_ACTIVE_SQL = `(
  SELECT MAX(ts) FROM (
    SELECT created_at AS ts FROM sessions WHERE user_id = u.id
    UNION ALL SELECT created_at FROM reviews WHERE user_id = u.id
    UNION ALL SELECT updated_at FROM wall_notes WHERE user_id = u.id
    UNION ALL SELECT created_at FROM wall_comments WHERE user_id = u.id
  )
)`;

export type AdminUserListItem = {
  id: string;
  email: string;
  createdAt: string;
  reviewCount: number;
  wallNoteCount: number;
  lastActive: string | null;
  plan: string;
  planStatus: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  displayPlan: PlanId;
};

export type AdminMemberDetail = AdminUserListItem & {
  stripePriceId: string | null;
  planUpdatedAt: string | null;
  displayPlan: "free" | "soft_plus";
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

export type AdminCounts = {
  users: number;
  reviews: number;
  paid: number;
  free: number;
  wallNotes: number;
  payments: PaymentRevenueSummary;
};

export function adminCounts(): AdminCounts {
  const db = getDb();
  const users = (db.prepare(`SELECT COUNT(*) AS n FROM users`).get() as { n: number }).n;
  const reviews = (db.prepare(`SELECT COUNT(*) AS n FROM reviews`).get() as { n: number }).n;
  const paid = (
    db
      .prepare(
        `SELECT COUNT(*) AS n FROM users
         WHERE plan = 'soft_plus'
           AND (plan_status IS NULL OR plan_status IN ('active', 'trialing', 'past_due'))`,
      )
      .get() as { n: number }
  ).n;
  const free = users - paid;
  const wallNotes = (
    db.prepare(`SELECT COUNT(*) AS n FROM wall_notes`).get() as { n: number }
  ).n;
  return { users, reviews, paid, free, wallNotes, payments: paymentRevenueSummary() };
}

export type AdminSignupWeek = {
  week: string;
  label: string;
  count: number;
};

export function adminSignupWeeks(now = new Date(), weekCount = 8): AdminSignupWeek[] {
  const buckets: AdminSignupWeek[] = [];
  let cursor = isoWeekKey(now);
  for (let i = 0; i < weekCount; i += 1) {
    buckets.unshift({ week: cursor, label: cursor.replace(/^\d{4}-/, ""), count: 0 });
    cursor = previousIsoWeekKey(cursor);
  }
  const counts = new Map(buckets.map((bucket) => [bucket.week, bucket]));
  const rows = getDb()
    .prepare(`SELECT created_at FROM users`)
    .all() as Array<{ created_at: string }>;
  for (const row of rows) {
    const date = new Date(row.created_at);
    if (Number.isNaN(date.getTime())) continue;
    const bucket = counts.get(isoWeekKey(date));
    if (bucket) bucket.count += 1;
  }
  return buckets;
}

type AdminUserRow = {
  id: string;
  email: string;
  created_at: string;
  plan: string;
  plan_status: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id?: string | null;
  plan_updated_at?: string | null;
  review_count: number;
  wall_note_count: number;
  last_active: string | null;
};

function toListItem(row: AdminUserRow): AdminUserListItem {
  return {
    id: row.id,
    email: row.email,
    createdAt: row.created_at,
    reviewCount: row.review_count,
    wallNoteCount: row.wall_note_count,
    lastActive: row.last_active,
    plan: row.plan,
    planStatus: row.plan_status,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    displayPlan: displayPlan(row.plan, row.plan_status),
  };
}

const ADMIN_USER_SELECT = `SELECT u.id, u.email, u.created_at, u.plan, u.plan_status,
              u.stripe_customer_id, u.stripe_subscription_id, u.stripe_price_id, u.plan_updated_at,
              (SELECT COUNT(*) FROM reviews r WHERE r.user_id = u.id) AS review_count,
              (SELECT COUNT(*) FROM wall_notes w WHERE w.user_id = u.id) AS wall_note_count,
              ${LAST_ACTIVE_SQL} AS last_active
       FROM users u`;

export function listAdminUsers(limit = 200): AdminUserListItem[] {
  const rows = getDb()
    .prepare(
      `${ADMIN_USER_SELECT}
       ORDER BY datetime(u.created_at) DESC
       LIMIT ?`,
    )
    .all(limit) as AdminUserRow[];

  return rows.map(toListItem);
}

export function getAdminMember(id: string): AdminMemberDetail | undefined {
  const row = getDb()
    .prepare(`${ADMIN_USER_SELECT} WHERE u.id = ?`)
    .get(id) as AdminUserRow | undefined;
  if (!row) return undefined;
  return {
    ...toListItem(row),
    stripePriceId: row.stripe_price_id ?? null,
    planUpdatedAt: row.plan_updated_at ?? null,
  };
}

export function listAdminReviewsForUser(
  userId: string,
  limit = 200,
): AdminReviewListItem[] {
  const rows = getDb()
    .prepare(
      `SELECT r.id, r.created_at, r.locale, r.summary, r.feeling, r.user_id, r.guest_id, u.email AS user_email
       FROM reviews r
       LEFT JOIN users u ON u.id = r.user_id
       WHERE r.user_id = ?
       ORDER BY datetime(r.created_at) DESC
       LIMIT ?`,
    )
    .all(userId, limit) as Array<{
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
