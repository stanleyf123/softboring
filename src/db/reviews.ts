import { getDb } from "./client";
import type { Review, ReviewAnswers } from "@/lib/review-types";

type ReviewRow = {
  id: string;
  guest_id: string;
  user_id: string | null;
  energy: string;
  drain: string;
  less_of: string;
  priorities: string;
  feeling: number | null;
  summary: string;
  locale: string | null;
  created_at: string;
};

export type NewReview = ReviewAnswers & {
  id?: string;
  createdAt?: string;
  locale?: string | null;
};

export type ReviewOwner =
  | { kind: "user"; userId: string; guestId: string }
  | { kind: "guest"; guestId: string };

function rowToReview(row: ReviewRow): Review {
  return {
    id: row.id,
    energy: row.energy,
    drain: row.drain,
    lessOf: row.less_of,
    priorities: row.priorities,
    feeling: row.feeling,
    summary: row.summary,
    createdAt: row.created_at,
    ...(row.locale ? { locale: row.locale } : {}),
  };
}

export function listReviewsForOwner(owner: ReviewOwner): Review[] {
  const db = getDb();
  const rows =
    owner.kind === "user"
      ? (db
          .prepare(
            `SELECT * FROM reviews WHERE user_id = ? ORDER BY datetime(created_at) DESC`,
          )
          .all(owner.userId) as ReviewRow[])
      : (db
          .prepare(
            `SELECT * FROM reviews
             WHERE guest_id = ? AND user_id IS NULL
             ORDER BY datetime(created_at) DESC`,
          )
          .all(owner.guestId) as ReviewRow[]);
  return rows.map(rowToReview);
}

export function getReviewForOwner(
  owner: ReviewOwner,
  id: string,
): Review | undefined {
  const db = getDb();
  const row =
    owner.kind === "user"
      ? (db
          .prepare(`SELECT * FROM reviews WHERE id = ? AND user_id = ?`)
          .get(id, owner.userId) as ReviewRow | undefined)
      : (db
          .prepare(
            `SELECT * FROM reviews WHERE id = ? AND guest_id = ? AND user_id IS NULL`,
          )
          .get(id, owner.guestId) as ReviewRow | undefined);
  return row ? rowToReview(row) : undefined;
}

function getReviewRow(id: string): ReviewRow | undefined {
  return getDb()
    .prepare(`SELECT * FROM reviews WHERE id = ?`)
    .get(id) as ReviewRow | undefined;
}

function insertReview(
  guestId: string,
  userId: string | null,
  input: NewReview & { id: string; createdAt: string },
) {
  getDb()
    .prepare(
      `INSERT INTO reviews (
        id, guest_id, user_id, energy, drain, less_of, priorities, feeling, summary, locale, created_at
      ) VALUES (
        @id, @guest_id, @user_id, @energy, @drain, @less_of, @priorities, @feeling, @summary, @locale, @created_at
      )`,
    )
    .run({
      id: input.id,
      guest_id: guestId,
      user_id: userId,
      energy: input.energy,
      drain: input.drain,
      less_of: input.lessOf,
      priorities: input.priorities,
      feeling: input.feeling,
      summary: input.summary,
      locale: input.locale ?? null,
      created_at: input.createdAt,
    });
}

export function createReview(owner: ReviewOwner, input: NewReview): Review {
  const id = input.id ?? crypto.randomUUID();
  const createdAt = input.createdAt ?? new Date().toISOString();
  const locale = input.locale ?? null;
  const userId = owner.kind === "user" ? owner.userId : null;

  insertReview(owner.guestId, userId, { ...input, id, createdAt, locale });

  return {
    id,
    energy: input.energy,
    drain: input.drain,
    lessOf: input.lessOf,
    priorities: input.priorities,
    feeling: input.feeling,
    summary: input.summary,
    createdAt,
    ...(locale ? { locale } : {}),
  };
}

export type ImportResult = {
  imported: number;
  skipped: number;
};

export function importReviewsForOwner(
  owner: ReviewOwner,
  reviews: Array<NewReview & { id: string; createdAt: string }>,
): ImportResult {
  const db = getDb();
  const insert = db.prepare(
    `INSERT INTO reviews (
      id, guest_id, user_id, energy, drain, less_of, priorities, feeling, summary, locale, created_at
    ) VALUES (
      @id, @guest_id, @user_id, @energy, @drain, @less_of, @priorities, @feeling, @summary, @locale, @created_at
    )`,
  );
  const userId = owner.kind === "user" ? owner.userId : null;

  const run = db.transaction((items: typeof reviews) => {
    let imported = 0;
    let skipped = 0;
    for (const item of items) {
      if (getReviewRow(item.id)) {
        skipped += 1;
        continue;
      }
      insert.run({
        id: item.id,
        guest_id: owner.guestId,
        user_id: userId,
        energy: item.energy,
        drain: item.drain,
        less_of: item.lessOf,
        priorities: item.priorities,
        feeling: item.feeling,
        summary: item.summary,
        locale: item.locale ?? null,
        created_at: item.createdAt,
      });
      imported += 1;
    }
    return { imported, skipped };
  });

  return run(reviews);
}

export function claimGuestReviews(userId: string, guestId: string) {
  return getDb()
    .prepare(
      `UPDATE reviews SET user_id = ? WHERE guest_id = ? AND user_id IS NULL`,
    )
    .run(userId, guestId).changes;
}

export function countReviewsForUser(userId: string) {
  const row = getDb()
    .prepare(`SELECT COUNT(*) AS n FROM reviews WHERE user_id = ?`)
    .get(userId) as { n: number };
  return row.n;
}
