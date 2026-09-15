import type Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function schemaSql() {
  return readFileSync(join(process.cwd(), "scripts/schema.sql"), "utf8");
}

export function ensureReviewUserId(db: Database.Database) {
  const cols = db.prepare("PRAGMA table_info(reviews)").all() as { name: string }[];
  if (!cols.some((col) => col.name === "user_id")) {
    db.exec("ALTER TABLE reviews ADD COLUMN user_id TEXT");
  }
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_reviews_user_created ON reviews (user_id, created_at DESC)`,
  );
}

export function migrateDb(db: Database.Database) {
  db.exec(schemaSql());
  ensureReviewUserId(db);
}
