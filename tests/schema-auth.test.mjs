import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import Database from "better-sqlite3";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function migrate(db) {
  db.exec(readFileSync(join(root, "scripts/schema.sql"), "utf8"));
  const cols = db.prepare("PRAGMA table_info(reviews)").all();
  if (!cols.some((col) => col.name === "user_id")) {
    db.exec("ALTER TABLE reviews ADD COLUMN user_id TEXT");
  }
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_reviews_user_created ON reviews (user_id, created_at DESC)",
  );
}

test("users, sessions, and review ownership", () => {
  const dir = mkdtempSync(join(tmpdir(), "softboring-auth-"));
  const sqlitePath = join(dir, "test.sqlite");
  mkdirSync(dirname(sqlitePath), { recursive: true });
  const db = new Database(sqlitePath);
  db.pragma("foreign_keys = ON");
  migrate(db);

  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at)
     VALUES (?, ?, ?, ?)`,
  ).run("user-a", "a@example.com", "hash-a", "2026-01-01T00:00:00.000Z");
  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at)
     VALUES (?, ?, ?, ?)`,
  ).run("user-b", "b@example.com", "hash-b", "2026-01-01T00:00:00.000Z");

  const insertReview = db.prepare(
    `INSERT INTO reviews (
      id, guest_id, user_id, energy, drain, less_of, priorities, feeling, summary, locale, created_at
    ) VALUES (?, ?, ?, '', '', '', '', NULL, ?, NULL, ?)`,
  );
  insertReview.run(
    "rev-a",
    "11111111-1111-1111-1111-111111111111",
    "user-a",
    "A week",
    "2026-01-02T00:00:00.000Z",
  );
  insertReview.run(
    "rev-guest",
    "22222222-2222-2222-2222-222222222222",
    null,
    "Guest week",
    "2026-01-03T00:00:00.000Z",
  );

  const forA = db
    .prepare(`SELECT id FROM reviews WHERE user_id = ?`)
    .all("user-a");
  assert.deepEqual(
    forA.map((row) => row.id),
    ["rev-a"],
  );

  const forB = db
    .prepare(`SELECT id FROM reviews WHERE user_id = ?`)
    .all("user-b");
  assert.equal(forB.length, 0);

  const guestOnly = db
    .prepare(`SELECT id FROM reviews WHERE guest_id = ? AND user_id IS NULL`)
    .all("22222222-2222-2222-2222-222222222222");
  assert.deepEqual(
    guestOnly.map((row) => row.id),
    ["rev-guest"],
  );

  db.prepare(
    `UPDATE reviews SET user_id = ? WHERE guest_id = ? AND user_id IS NULL`,
  ).run("user-b", "22222222-2222-2222-2222-222222222222");

  const claimed = db
    .prepare(`SELECT id FROM reviews WHERE user_id = ?`)
    .all("user-b");
  assert.deepEqual(
    claimed.map((row) => row.id),
    ["rev-guest"],
  );

  const guestAfterClaim = db
    .prepare(`SELECT id FROM reviews WHERE guest_id = ? AND user_id IS NULL`)
    .all("22222222-2222-2222-2222-222222222222");
  assert.equal(guestAfterClaim.length, 0);

  db.close();
  rmSync(dir, { recursive: true, force: true });
});

test("existing reviews table gains user_id via ALTER", () => {
  const dir = mkdtempSync(join(tmpdir(), "softboring-alter-"));
  const sqlitePath = join(dir, "test.sqlite");
  const db = new Database(sqlitePath);
  db.exec(`
    CREATE TABLE reviews (
      id TEXT PRIMARY KEY,
      guest_id TEXT NOT NULL,
      energy TEXT NOT NULL DEFAULT '',
      drain TEXT NOT NULL DEFAULT '',
      less_of TEXT NOT NULL DEFAULT '',
      priorities TEXT NOT NULL DEFAULT '',
      feeling INTEGER,
      summary TEXT NOT NULL DEFAULT '',
      locale TEXT,
      created_at TEXT NOT NULL
    );
  `);
  migrate(db);
  const cols = db.prepare("PRAGMA table_info(reviews)").all().map((col) => col.name);
  assert.ok(cols.includes("user_id"));
  assert.ok(cols.includes("guest_id"));
  const tables = db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`)
    .all()
    .map((row) => row.name);
  assert.ok(tables.includes("users"));
  assert.ok(tables.includes("sessions"));
  db.close();
  rmSync(dir, { recursive: true, force: true });
});
