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

const cols = db.prepare("PRAGMA table_info(reviews)").all();
if (!cols.some((col) => col.name === "user_id")) {
  db.exec("ALTER TABLE reviews ADD COLUMN user_id TEXT");
}
db.exec(
  "CREATE INDEX IF NOT EXISTS idx_reviews_user_created ON reviews (user_id, created_at DESC)",
);

db.close();

console.log(`SQLite ready at ${sqlitePath}`);
