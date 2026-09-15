import { getDb } from "./client";
import type { Review, ReviewAnswers } from "@/lib/review-types";

type ReviewRow = {
  id: string;
  guest_id: string;
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

export function listReviewsForGuest(guestId: string): Review[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM reviews WHERE guest_id = ? ORDER BY datetime(created_at) DESC`,
    )
    .all(guestId) as ReviewRow[];
  return rows.map(rowToReview);
}

export function getReviewForGuest(guestId: string, id: string): Review | undefined {
  const row = getDb()
    .prepare(`SELECT * FROM reviews WHERE id = ? AND guest_id = ?`)
    .get(id, guestId) as ReviewRow | undefined;
  return row ? rowToReview(row) : undefined;
}

function getReviewRow(id: string): ReviewRow | undefined {
  return getDb()
    .prepare(`SELECT * FROM reviews WHERE id = ?`)
    .get(id) as ReviewRow | undefined;
}

export function createReview(guestId: string, input: NewReview): Review {
  const id = input.id ?? crypto.randomUUID();
  const createdAt = input.createdAt ?? new Date().toISOString();
  const locale = input.locale ?? null;

  getDb()
    .prepare(
      `INSERT INTO reviews (
        id, guest_id, energy, drain, less_of, priorities, feeling, summary, locale, created_at
      ) VALUES (
        @id, @guest_id, @energy, @drain, @less_of, @priorities, @feeling, @summary, @locale, @created_at
      )`,
    )
    .run({
      id,
      guest_id: guestId,
      energy: input.energy,
      drain: input.drain,
      less_of: input.lessOf,
      priorities: input.priorities,
      feeling: input.feeling,
      summary: input.summary,
      locale,
      created_at: createdAt,
    });

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

export function importReviewsForGuest(
  guestId: string,
  reviews: Array<NewReview & { id: string; createdAt: string }>,
): ImportResult {
  const db = getDb();
  const insert = db.prepare(
    `INSERT INTO reviews (
      id, guest_id, energy, drain, less_of, priorities, feeling, summary, locale, created_at
    ) VALUES (
      @id, @guest_id, @energy, @drain, @less_of, @priorities, @feeling, @summary, @locale, @created_at
    )`,
  );

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
        guest_id: guestId,
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
