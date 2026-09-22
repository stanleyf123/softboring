import Database from "better-sqlite3";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fromEnv = process.env.SQLITE_PATH?.trim();
const configured =
  fromEnv && fromEnv.length > 0 ? fromEnv : "./data/softboring.sqlite";
const sqlitePath = isAbsolute(configured)
  ? configured
  : resolve(process.cwd(), configured);

mkdirSync(dirname(sqlitePath), { recursive: true });

const db = new Database(sqlitePath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(readFileSync(join(root, "scripts/schema.sql"), "utf8"));

function columnNames(table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map((col) => col.name);
}

function ensureColumn(table, name, definition) {
  if (!columnNames(table).includes(name)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
  }
}

const reviewCols = columnNames("reviews");
if (!reviewCols.includes("user_id")) {
  db.exec("ALTER TABLE reviews ADD COLUMN user_id TEXT");
}
ensureColumn("reviews", "custom_answers", "TEXT NOT NULL DEFAULT '[]'");
ensureColumn("reviews", "mood", "TEXT");
ensureColumn("reviews", "soft_tags", "TEXT NOT NULL DEFAULT '[]'");
db.exec(
  "CREATE INDEX IF NOT EXISTS idx_reviews_user_created ON reviews (user_id, created_at DESC)",
);

const userTable = db
  .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'`)
  .get();
if (userTable) {
  ensureColumn("users", "plan", "TEXT NOT NULL DEFAULT 'free'");
  ensureColumn("users", "plan_status", "TEXT");
  ensureColumn("users", "stripe_customer_id", "TEXT");
  ensureColumn("users", "stripe_subscription_id", "TEXT");
  ensureColumn("users", "stripe_price_id", "TEXT");
  ensureColumn("users", "plan_updated_at", "TEXT");
  ensureColumn("users", "plan_expires_at", "TEXT");
  ensureColumn("users", "is_demo", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn("users", "nickname", "TEXT");
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users (stripe_customer_id)",
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription ON users (stripe_subscription_id)",
  );
}

const settingsTable = db
  .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'user_settings'`)
  .get();
if (settingsTable) {
  ensureColumn("user_settings", "onboarding_dismissed", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn("user_settings", "onboarding_history_seen", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn("user_settings", "onboarding_wall_seen", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn("user_settings", "reminder_enabled", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn("user_settings", "reminder_weekday", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn("user_settings", "reminder_last_sent_at", "TEXT");
  ensureColumn("user_settings", "custom_questions", "TEXT NOT NULL DEFAULT '[]'");
  ensureColumn("user_settings", "preferred_wall_color", "TEXT");
  ensureColumn("user_settings", "timezone", "TEXT NOT NULL DEFAULT 'Asia/Taipei'");
  ensureColumn("user_settings", "onboarding_timezone_set", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn("user_settings", "seasonal_frame", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn("user_settings", "focus_minutes", "INTEGER NOT NULL DEFAULT 25");
  ensureColumn("user_settings", "focus_chime", "INTEGER NOT NULL DEFAULT 1");
  ensureColumn("user_settings", "night_mode", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn("user_settings", "memory_lane", "INTEGER NOT NULL DEFAULT 1");
}

const wallTable = db
  .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'wall_notes'`)
  .get();
if (wallTable) {
  ensureColumn("wall_notes", "pinned", "INTEGER NOT NULL DEFAULT 0");
}

const wallCommentsTable = db
  .prepare(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'wall_comments'`,
  )
  .get();
if (wallCommentsTable) {
  ensureColumn("wall_comments", "parent_id", "TEXT");
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_wall_comments_parent ON wall_comments (parent_id)",
  );
}

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
db.exec("CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user ON oauth_accounts (user_id)");

const usersTable = db
  .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'`)
  .get();
if (usersTable) {
  const userCols = db.prepare("PRAGMA table_info(users)").all();
  const passwordCol = userCols.find((col) => col.name === "password_hash");
  if (passwordCol && passwordCol.notnull === 1) {
    const names = new Set(userCols.map((col) => col.name));
    const colOr = (name, fallback) => (names.has(name) ? name : fallback);
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
        db.exec("DROP TABLE users");
        db.exec("ALTER TABLE users_oauth_mig RENAME TO users");
        db.exec(
          "CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users (stripe_customer_id)",
        );
        db.exec(
          "CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription ON users (stripe_subscription_id)",
        );
      });
      rebuild();
    } finally {
      db.pragma("foreign_keys = ON");
    }
  }
}

if (usersTable) {
  ensureColumn("users", "is_demo", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn("users", "nickname", "TEXT");
}

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
  "CREATE INDEX IF NOT EXISTS idx_soft_notes_user_week ON soft_notes (user_id, week_key)",
);

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
  "CREATE INDEX IF NOT EXISTS idx_soft_intentions_user_week ON soft_intentions (user_id, week_key)",
);

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
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_wall_note_bookmarks_user_created
  ON wall_note_bookmarks (user_id, created_at DESC)
`);
db.exec(
  "CREATE INDEX IF NOT EXISTS idx_wall_note_bookmarks_note ON wall_note_bookmarks (note_id)",
);

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
  "CREATE INDEX IF NOT EXISTS idx_wall_note_flags_note ON wall_note_flags (note_id)",
);
db.exec(
  "CREATE INDEX IF NOT EXISTS idx_wall_note_flags_created ON wall_note_flags (created_at DESC)",
);

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
  "CREATE INDEX IF NOT EXISTS idx_wall_note_thanks_note ON wall_note_thanks (note_id)",
);

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
  "CREATE INDEX IF NOT EXISTS idx_wall_note_echoes_note ON wall_note_echoes (note_id, created_at)",
);

if (usersTable) {
  ensureColumn("users", "plan_expires_at", "TEXT");
}

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
  "CREATE INDEX IF NOT EXISTS idx_soft_plus_gift_codes_created ON soft_plus_gift_codes (created_at DESC)",
);
db.exec(
  "CREATE INDEX IF NOT EXISTS idx_soft_plus_gift_codes_redeemed ON soft_plus_gift_codes (redeemed_at)",
);

db.exec(`
  CREATE TABLE IF NOT EXISTS week_pauses (
    user_id TEXT NOT NULL,
    week_key TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (user_id, week_key),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);
db.exec("CREATE INDEX IF NOT EXISTS idx_week_pauses_user ON week_pauses (user_id)");

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
  "CREATE INDEX IF NOT EXISTS idx_soft_letters_user_week ON soft_letters (user_id, week_key)",
);

db.close();

console.log(`SQLite ready at ${sqlitePath}`);
