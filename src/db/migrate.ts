import type Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function schemaSql() {
  return readFileSync(join(process.cwd(), "scripts/schema.sql"), "utf8");
}

function columnNames(db: Database.Database, table: string) {
  return (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map(
    (col) => col.name,
  );
}

function ensureColumn(
  db: Database.Database,
  table: string,
  name: string,
  definition: string,
) {
  if (!columnNames(db, table).includes(name)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
  }
}

export function ensureReviewUserId(db: Database.Database) {
  ensureColumn(db, "reviews", "user_id", "TEXT");
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_reviews_user_created ON reviews (user_id, created_at DESC)`,
  );
}

export function ensureUserBillingColumns(db: Database.Database) {
  const tables = db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'`)
    .get() as { name: string } | undefined;
  if (!tables) return;

  ensureColumn(db, "users", "plan", "TEXT NOT NULL DEFAULT 'free'");
  ensureColumn(db, "users", "plan_status", "TEXT");
  ensureColumn(db, "users", "stripe_customer_id", "TEXT");
  ensureColumn(db, "users", "stripe_subscription_id", "TEXT");
  ensureColumn(db, "users", "stripe_price_id", "TEXT");
  ensureColumn(db, "users", "plan_updated_at", "TEXT");
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users (stripe_customer_id)`,
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription ON users (stripe_subscription_id)`,
  );
}

export function ensureUserSettingsColumns(db: Database.Database) {
  const tables = db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'user_settings'`)
    .get() as { name: string } | undefined;
  if (!tables) return;

  ensureColumn(db, "user_settings", "onboarding_dismissed", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "user_settings", "onboarding_history_seen", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "user_settings", "onboarding_wall_seen", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "user_settings", "reminder_enabled", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "user_settings", "reminder_weekday", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "user_settings", "reminder_last_sent_at", "TEXT");
}

export function migrateDb(db: Database.Database) {
  db.exec(schemaSql());
  ensureReviewUserId(db);
  ensureUserBillingColumns(db);
  ensureUserSettingsColumns(db);
}
