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
}

const wallTable = db
  .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'wall_notes'`)
  .get();
if (wallTable) {
  ensureColumn("wall_notes", "pinned", "INTEGER NOT NULL DEFAULT 0");
}

db.close();

console.log(`SQLite ready at ${sqlitePath}`);
