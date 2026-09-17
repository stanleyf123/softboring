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
  ensureColumn(db, "reviews", "custom_answers", "TEXT NOT NULL DEFAULT '[]'");
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
  ensureColumn(db, "users", "is_demo", "INTEGER NOT NULL DEFAULT 0");
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
  ensureColumn(db, "user_settings", "custom_questions", "TEXT NOT NULL DEFAULT '[]'");
}

export function ensureWallNotePinned(db: Database.Database) {
  const tables = db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'wall_notes'`)
    .get() as { name: string } | undefined;
  if (!tables) return;
  ensureColumn(db, "wall_notes", "pinned", "INTEGER NOT NULL DEFAULT 0");
}

export function ensureWallCommentParent(db: Database.Database) {
  const tables = db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'wall_comments'`)
    .get() as { name: string } | undefined;
  if (!tables) return;
  ensureColumn(db, "wall_comments", "parent_id", "TEXT");
  db.exec(`CREATE INDEX IF NOT EXISTS idx_wall_comments_parent ON wall_comments (parent_id)`);
}

export function ensureOauthAccounts(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS oauth_accounts (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      provider_user_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      email TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE (provider, provider_user_id)
    );
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user ON oauth_accounts (user_id)`);
}

/**
 * OAuth-only members have no password. SQLite cannot drop NOT NULL with ALTER,
 * so existing installs rebuild `users` once, keeping emails and hashes.
 */
export function ensureNullablePasswordHash(db: Database.Database) {
  const tables = db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'`)
    .get() as { name: string } | undefined;
  if (!tables) return;

  const cols = db.prepare(`PRAGMA table_info(users)`).all() as {
    name: string;
    notnull: number;
  }[];
  const passwordCol = cols.find((col) => col.name === "password_hash");
  if (!passwordCol || passwordCol.notnull === 0) return;

  const names = new Set(cols.map((col) => col.name));
  const colOr = (name: string, fallback: string) =>
    names.has(name) ? name : fallback;
  const planExpr = names.has("plan") ? "COALESCE(plan, 'free')" : "'free'";

  db.pragma("foreign_keys = OFF");
  try {
    const rebuild = db.transaction(() => {
      db.exec(`
        CREATE TABLE users_oauth_mig (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE COLLATE NOCASE,
          password_hash TEXT,
          created_at TEXT NOT NULL,
          plan TEXT NOT NULL DEFAULT 'free',
          plan_status TEXT,
          stripe_customer_id TEXT,
          stripe_subscription_id TEXT,
          stripe_price_id TEXT,
          plan_updated_at TEXT
        );
      `);
      db.exec(`
        INSERT INTO users_oauth_mig (
          id, email, password_hash, created_at, plan, plan_status,
          stripe_customer_id, stripe_subscription_id, stripe_price_id, plan_updated_at
        )
        SELECT
          id, email, password_hash, created_at, ${planExpr},
          ${colOr("plan_status", "NULL")},
          ${colOr("stripe_customer_id", "NULL")},
          ${colOr("stripe_subscription_id", "NULL")},
          ${colOr("stripe_price_id", "NULL")},
          ${colOr("plan_updated_at", "NULL")}
        FROM users
      `);
      db.exec(`DROP TABLE users`);
      db.exec(`ALTER TABLE users_oauth_mig RENAME TO users`);
      db.exec(
        `CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users (stripe_customer_id)`,
      );
      db.exec(
        `CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription ON users (stripe_subscription_id)`,
      );
    });
    rebuild();
  } finally {
    db.pragma("foreign_keys = ON");
  }
}

export function ensureUserIsDemoColumn(db: Database.Database) {
  const tables = db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'`)
    .get() as { name: string } | undefined;
  if (!tables) return;
  ensureColumn(db, "users", "is_demo", "INTEGER NOT NULL DEFAULT 0");
}

export function migrateDb(db: Database.Database) {
  db.exec(schemaSql());
  ensureReviewUserId(db);
  ensureUserBillingColumns(db);
  ensureUserSettingsColumns(db);
  ensureWallNotePinned(db);
  ensureWallCommentParent(db);
  ensureOauthAccounts(db);
  ensureNullablePasswordHash(db);
  // After oauth rebuild (which copies a fixed column list), re-add is_demo.
  ensureUserIsDemoColumn(db);
}
