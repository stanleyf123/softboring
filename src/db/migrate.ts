import type Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { EXPANDED_STICKERS } from "../lib/wall-stickers.ts";

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
  ensureColumn(db, "reviews", "mood", "TEXT");
  ensureColumn(db, "reviews", "soft_tags", "TEXT NOT NULL DEFAULT '[]'");
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
  ensureColumn(db, "users", "plan_expires_at", "TEXT");
  ensureColumn(db, "users", "is_demo", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "users", "nickname", "TEXT");
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
  ensureColumn(db, "user_settings", "preferred_wall_color", "TEXT");
  ensureColumn(
    db,
    "user_settings",
    "timezone",
    "TEXT NOT NULL DEFAULT 'Asia/Taipei'",
  );
  ensureColumn(
    db,
    "user_settings",
    "onboarding_timezone_set",
    "INTEGER NOT NULL DEFAULT 0",
  );
  ensureColumn(db, "user_settings", "seasonal_frame", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "user_settings", "focus_minutes", "INTEGER NOT NULL DEFAULT 25");
  ensureColumn(db, "user_settings", "focus_chime", "INTEGER NOT NULL DEFAULT 1");
  ensureColumn(db, "user_settings", "night_mode", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "user_settings", "memory_lane", "INTEGER NOT NULL DEFAULT 1");
  ensureColumn(db, "user_settings", "custom_note_color", "TEXT");
  ensureColumn(db, "user_settings", "wall_larger_text", "INTEGER NOT NULL DEFAULT 0");
}

export function ensureExpandedStickers(db: Database.Database) {
  const table = db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'stickers'`)
    .get() as { name: string } | undefined;
  if (!table) return;
  const insert = db.prepare(
    `INSERT OR IGNORE INTO stickers (id, slug, name, price_cents, stripe_price_id, emoji, sort_order)
     VALUES (@id, @slug, @name, 99, NULL, @emoji, @sort_order)`,
  );
  for (const sticker of EXPANDED_STICKERS) {
    insert.run({
      id: sticker.id,
      slug: sticker.slug,
      name: sticker.name,
      emoji: sticker.emoji,
      sort_order: sticker.sortOrder,
    });
  }
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
          plan_updated_at TEXT,
          is_demo INTEGER NOT NULL DEFAULT 0,
          nickname TEXT
        );
      `);
      db.exec(`
        INSERT INTO users_oauth_mig (
          id, email, password_hash, created_at, plan, plan_status,
          stripe_customer_id, stripe_subscription_id, stripe_price_id, plan_updated_at,
          is_demo, nickname
        )
        SELECT
          id, email, password_hash, created_at, ${planExpr},
          ${colOr("plan_status", "NULL")},
          ${colOr("stripe_customer_id", "NULL")},
          ${colOr("stripe_subscription_id", "NULL")},
          ${colOr("stripe_price_id", "NULL")},
          ${colOr("plan_updated_at", "NULL")},
          ${names.has("is_demo") ? "COALESCE(is_demo, 0)" : "0"},
          ${colOr("nickname", "NULL")}
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

export function ensureUserNicknameColumn(db: Database.Database) {
  const tables = db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'`)
    .get() as { name: string } | undefined;
  if (!tables) return;
  ensureColumn(db, "users", "nickname", "TEXT");
}

export function ensureSoftNotes(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS soft_notes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      week_key TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE (user_id, week_key)
    );
  `);
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_soft_notes_user_week ON soft_notes (user_id, week_key)`,
  );
}

export function ensureSoftIntentions(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS soft_intentions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      week_key TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE (user_id, week_key)
    );
  `);
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_soft_intentions_user_week ON soft_intentions (user_id, week_key)`,
  );
}

export function ensureWallNoteCollections(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS wall_note_collections (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_wall_note_collections_user
     ON wall_note_collections (user_id, created_at DESC)`,
  );
  db.exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_wall_note_collections_user_name
     ON wall_note_collections (user_id, name COLLATE NOCASE)`,
  );
  db.exec(`
    CREATE TABLE IF NOT EXISTS wall_note_collection_items (
      collection_id TEXT NOT NULL,
      note_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (collection_id, note_id),
      FOREIGN KEY (collection_id) REFERENCES wall_note_collections(id) ON DELETE CASCADE,
      FOREIGN KEY (note_id) REFERENCES wall_notes(id) ON DELETE CASCADE
    );
  `);
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_wall_note_collection_items_note
     ON wall_note_collection_items (note_id)`,
  );
}

export function ensureWallNoteBookmarks(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS wall_note_bookmarks (
      user_id TEXT NOT NULL,
      note_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, note_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (note_id) REFERENCES wall_notes(id) ON DELETE CASCADE
    );
  `);
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_wall_note_bookmarks_user_created
     ON wall_note_bookmarks (user_id, created_at DESC)`,
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_wall_note_bookmarks_note ON wall_note_bookmarks (note_id)`,
  );
}

export function ensureWallNoteFlags(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS wall_note_flags (
      id TEXT PRIMARY KEY,
      note_id TEXT NOT NULL,
      reporter_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (note_id, reporter_id),
      FOREIGN KEY (note_id) REFERENCES wall_notes(id) ON DELETE CASCADE,
      FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_wall_note_flags_note ON wall_note_flags (note_id)`,
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_wall_note_flags_created ON wall_note_flags (created_at DESC)`,
  );
}

export function ensureWallNoteThanks(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS wall_note_thanks (
      user_id TEXT NOT NULL,
      note_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, note_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (note_id) REFERENCES wall_notes(id) ON DELETE CASCADE
    );
  `);
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_wall_note_thanks_note ON wall_note_thanks (note_id)`,
  );
}

export function ensureWallNoteEchoes(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS wall_note_echoes (
      user_id TEXT NOT NULL,
      note_id TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (user_id, note_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (note_id) REFERENCES wall_notes(id) ON DELETE CASCADE
    );
  `);
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_wall_note_echoes_note ON wall_note_echoes (note_id, created_at)`,
  );
}

export function ensureSoftLetters(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS soft_letters (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      week_key TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE (user_id, week_key)
    );
  `);
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_soft_letters_user_week ON soft_letters (user_id, week_key)`,
  );
}

export function ensureWeekPauses(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS week_pauses (
      user_id TEXT NOT NULL,
      week_key TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, week_key),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_week_pauses_user ON week_pauses (user_id)`);
}

export function ensureSoftGratitudeDraws(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS soft_gratitude_draws (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_soft_gratitude_draws_user_created
     ON soft_gratitude_draws (user_id, created_at)`,
  );
}

/** Anonymous hour buckets. No user id and no address. */
export function ensureWallPresenceHours(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS wall_presence_hours (
      hour_key TEXT PRIMARY KEY,
      hits INTEGER NOT NULL DEFAULT 0
    );
  `);
}

export function ensureSoftGratitudes(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS soft_gratitudes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_soft_gratitudes_user_created
     ON soft_gratitudes (user_id, created_at)`,
  );
}

export function ensureSoftPlusGiftCodes(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS soft_plus_gift_codes (
      code TEXT PRIMARY KEY,
      days INTEGER,
      permanent INTEGER NOT NULL DEFAULT 0,
      note TEXT,
      created_at TEXT NOT NULL,
      redeemed_at TEXT,
      redeemed_by TEXT,
      FOREIGN KEY (redeemed_by) REFERENCES users(id) ON DELETE SET NULL
    );
  `);
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_soft_plus_gift_codes_created
     ON soft_plus_gift_codes (created_at DESC)`,
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_soft_plus_gift_codes_redeemed
     ON soft_plus_gift_codes (redeemed_at)`,
  );
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
  // After oauth rebuild (which copies a fixed column list), re-add extras.
  ensureUserBillingColumns(db);
  ensureUserIsDemoColumn(db);
  ensureUserNicknameColumn(db);
  ensureSoftNotes(db);
  ensureSoftIntentions(db);
  ensureWallNoteBookmarks(db);
  ensureWallNoteCollections(db);
  ensureWallNoteFlags(db);
  ensureWallNoteThanks(db);
  ensureWallNoteEchoes(db);
  ensureWeekPauses(db);
  ensureSoftLetters(db);
  ensureSoftGratitudes(db);
  ensureSoftGratitudeDraws(db);
  ensureWallPresenceHours(db);
  ensureSoftPlusGiftCodes(db);
  ensureExpandedStickers(db);
}
