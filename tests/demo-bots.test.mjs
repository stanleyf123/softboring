import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import Database from "better-sqlite3";
import { DAILY_POOL, SEED_REVIEW_PAIRS } from "../scripts/lib/demo-content.mjs";
import {
  DEMO_USER_COUNT,
  addTaipeiDays,
  dailyPosterCount,
  demoEmail,
  ensureDemoColumn,
  isDemoEmail,
  isProtectedEmail,
  listDemoEmails,
  pickDailyContent,
  pickDailyDemoIndexes,
  postDailyDemoNotes,
  purgeDemoAccounts,
  seedDemoAccounts,
  seedReviewId,
  taipeiDateKey,
  wallLayoutForIndex,
} from "../scripts/lib/demo-bots.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const REAL_EMAIL = "stanleys1225@gmail.com";
const OTHER_EMAIL = "friend@example.com";

function migrate(db) {
  db.exec(readFileSync(join(root, "scripts/schema.sql"), "utf8"));
}

function openTempDb() {
  const dir = mkdtempSync(join(tmpdir(), "softboring-demo-"));
  const db = new Database(join(dir, "test.sqlite"));
  db.pragma("foreign_keys = ON");
  migrate(db);
  return { dir, db };
}

function insertRealUser(db, { id, email, reviewId, noteId }) {
  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at, plan, plan_status)
     VALUES (?, ?, 'hash', '2026-01-01T00:00:00.000Z', 'soft_plus', 'active')`,
  ).run(id, email);
  db.prepare(
    `INSERT INTO reviews (
      id, guest_id, user_id, energy, drain, less_of, priorities, feeling, summary, locale, created_at
    ) VALUES (?, ?, ?, 'real energy', '', '', '', 4, 'real summary keep me', 'en', ?)`,
  ).run(reviewId, "11111111-1111-4111-8111-111111111111", id, "2026-01-02T00:00:00.000Z");
  db.prepare(
    `INSERT INTO wall_notes (
      id, review_id, user_id, x, y, z, color, hidden, pinned, created_at, updated_at
    ) VALUES (?, ?, ?, 40, 40, 1, 'peach', 0, 0, ?, ?)`,
  ).run(noteId, reviewId, id, "2026-01-02T00:00:00.000Z", "2026-01-02T00:00:00.000Z");
}

test("demo email detection uses the reserved domain", () => {
  assert.equal(isDemoEmail("demo01@softboring.demo"), true);
  assert.equal(isDemoEmail("DEMO10@SoftBoring.Demo"), true);
  assert.equal(isDemoEmail("extra@softboring.demo"), true);
  assert.equal(isDemoEmail("demo01@softboring.com"), false);
  assert.equal(isDemoEmail(REAL_EMAIL), false);
  assert.equal(isDemoEmail("user@example.com"), false);
  assert.equal(isDemoEmail(""), false);
  assert.equal(isProtectedEmail(REAL_EMAIL), true);
  assert.equal(isProtectedEmail("DEMO01@softboring.demo"), false);
  assert.deepEqual(listDemoEmails(), [
    "demo01@softboring.demo",
    "demo02@softboring.demo",
    "demo03@softboring.demo",
    "demo04@softboring.demo",
    "demo05@softboring.demo",
    "demo06@softboring.demo",
    "demo07@softboring.demo",
    "demo08@softboring.demo",
    "demo09@softboring.demo",
    "demo10@softboring.demo",
  ]);
});

test("Taipei date key and daily subset are stable for a calendar day", () => {
  assert.equal(taipeiDateKey(new Date("2026-09-16T16:30:00.000Z")), "2026-09-17");
  assert.equal(taipeiDateKey(new Date("2026-09-17T15:59:59.000Z")), "2026-09-17");
  assert.equal(taipeiDateKey(new Date("2026-09-17T16:00:00.000Z")), "2026-09-18");
  assert.equal(addTaipeiDays("2026-09-17", -1), "2026-09-16");

  const a = pickDailyDemoIndexes("2026-09-17");
  const b = pickDailyDemoIndexes("2026-09-17");
  assert.deepEqual(a, b);
  assert.ok(a.length >= 3 && a.length <= 5);
  assert.equal(new Set(a).size, a.length);
  for (const index of a) {
    assert.ok(index >= 0 && index < DEMO_USER_COUNT);
  }
  assert.ok(dailyPosterCount("2026-09-17") >= 3);
  assert.ok(dailyPosterCount("2026-09-17") <= 5);

  const first = pickDailyContent(1, "2026-09-17");
  const second = pickDailyContent(1, "2026-09-18");
  assert.notEqual(first.summary, second.summary);
});

test("seed is idempotent and does not touch real users or their wall notes", () => {
  const { dir, db } = openTempDb();
  insertRealUser(db, {
    id: "user-stanley",
    email: REAL_EMAIL,
    reviewId: "rev-stanley",
    noteId: "note-stanley",
  });
  insertRealUser(db, {
    id: "user-friend",
    email: OTHER_EMAIL,
    reviewId: "rev-friend",
    noteId: "note-friend",
  });

  const first = seedDemoAccounts(db, { now: new Date("2026-09-17T01:00:00.000Z") });
  assert.equal(first.usersCreated, 10);
  assert.equal(first.reviewsInserted, 20);
  assert.equal(first.wallNotesInserted, 20);

  const second = seedDemoAccounts(db, { now: new Date("2026-09-17T02:00:00.000Z") });
  assert.equal(second.usersCreated, 0);
  assert.equal(second.usersUpdated, 10);
  assert.equal(second.reviewsInserted, 0);
  assert.equal(second.wallNotesInserted, 0);

  const demoUsers = db
    .prepare(
      `SELECT email, plan, plan_status, is_demo FROM users WHERE email LIKE '%@softboring.demo' COLLATE NOCASE ORDER BY email`,
    )
    .all();
  assert.equal(demoUsers.length, 10);
  for (const row of demoUsers) {
    assert.equal(row.plan, "soft_plus");
    assert.equal(row.plan_status, "active");
    assert.equal(row.is_demo, 1);
  }

  const demoReviewCount = db
    .prepare(`SELECT COUNT(*) AS n FROM reviews WHERE id LIKE 'demo-seed-%'`)
    .get();
  const demoNoteCount = db
    .prepare(`SELECT COUNT(*) AS n FROM wall_notes WHERE id LIKE 'demo-wall-seed-%'`)
    .get();
  assert.equal(demoReviewCount.n, 20);
  assert.equal(demoNoteCount.n, 20);

  const stanley = db.prepare(`SELECT email, plan FROM users WHERE id = ?`).get("user-stanley");
  assert.equal(stanley.email, REAL_EMAIL);
  const realReview = db.prepare(`SELECT summary FROM reviews WHERE id = ?`).get("rev-stanley");
  assert.equal(realReview.summary, "real summary keep me");
  const realNote = db.prepare(`SELECT id FROM wall_notes WHERE id = ?`).get("note-stanley");
  assert.equal(realNote.id, "note-stanley");
  const friendNote = db.prepare(`SELECT id FROM wall_notes WHERE id = ?`).get("note-friend");
  assert.equal(friendNote.id, "note-friend");

  const locales = db
    .prepare(`SELECT DISTINCT locale FROM reviews WHERE id LIKE 'demo-seed-%'`)
    .all();
  assert.deepEqual(
    locales.map((row) => row.locale),
    ["zh-tw"],
  );

  const colors = db
    .prepare(`SELECT DISTINCT color FROM wall_notes WHERE id LIKE 'demo-wall-seed-%'`)
    .all()
    .map((row) => row.color);
  assert.ok(colors.length >= 4);

  db.close();
  rmSync(dir, { recursive: true, force: true });
});

test("daily poster is once per user per Asia/Taipei day", () => {
  const { dir, db } = openTempDb();
  insertRealUser(db, {
    id: "user-stanley",
    email: REAL_EMAIL,
    reviewId: "rev-stanley",
    noteId: "note-stanley",
  });
  seedDemoAccounts(db, { now: new Date("2026-09-10T00:00:00.000Z") });

  const morning = new Date("2026-09-16T16:05:00.000Z"); // 2026-09-17 00:05 Taipei
  const first = postDailyDemoNotes(db, { now: morning });
  assert.equal(first.dateKey, "2026-09-17");
  assert.ok(first.posted >= 3 && first.posted <= 5);
  assert.equal(first.skipped, 0);

  const evening = new Date("2026-09-17T15:50:00.000Z"); // still 2026-09-17 Taipei
  const second = postDailyDemoNotes(db, { now: evening });
  assert.equal(second.dateKey, "2026-09-17");
  assert.equal(second.posted, 0);
  assert.equal(second.skipped, first.posted);

  const nextMorning = new Date("2026-09-17T16:05:00.000Z"); // 2026-09-18 Taipei
  const third = postDailyDemoNotes(db, { now: nextMorning });
  assert.equal(third.dateKey, "2026-09-18");
  assert.ok(third.posted >= 3 && third.posted <= 5);

  const dailyReviews = db
    .prepare(`SELECT id, user_id, summary FROM reviews WHERE id LIKE 'demo-daily-%' ORDER BY id`)
    .all();
  assert.equal(dailyReviews.length, first.posted + third.posted);

  const overlapUsers = first.selected.filter((email) => third.selected.includes(email));
  for (const email of overlapUsers) {
    const index = Number(email.slice(4, 6));
    const day1 = pickDailyContent(index, "2026-09-17");
    const day2 = pickDailyContent(index, "2026-09-18");
    assert.notEqual(day1.summary, day2.summary);
  }

  const stanleyNotes = db
    .prepare(`SELECT COUNT(*) AS n FROM wall_notes WHERE user_id = 'user-stanley'`)
    .get();
  assert.equal(stanleyNotes.n, 1);

  db.close();
  rmSync(dir, { recursive: true, force: true });
});

test("daily poster does nothing when demo users are missing", () => {
  const { dir, db } = openTempDb();
  insertRealUser(db, {
    id: "user-stanley",
    email: REAL_EMAIL,
    reviewId: "rev-stanley",
    noteId: "note-stanley",
  });
  const result = postDailyDemoNotes(db, { now: new Date("2026-09-17T01:00:00.000Z") });
  assert.equal(result.posted, 0);
  assert.ok(result.missing >= 3);
  const users = db.prepare(`SELECT email FROM users`).all();
  assert.deepEqual(
    users.map((row) => row.email),
    [REAL_EMAIL],
  );
  assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM reviews`).get().n, 1);
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

test("purge removes only demo accounts", () => {
  const { dir, db } = openTempDb();
  insertRealUser(db, {
    id: "user-stanley",
    email: REAL_EMAIL,
    reviewId: "rev-stanley",
    noteId: "note-stanley",
  });
  seedDemoAccounts(db, { now: new Date("2026-09-17T01:00:00.000Z") });
  const purged = purgeDemoAccounts(db);
  assert.equal(purged.deleted, 10);
  const remaining = db.prepare(`SELECT email FROM users ORDER BY email`).all();
  assert.deepEqual(
    remaining.map((row) => row.email),
    [REAL_EMAIL],
  );
  assert.equal(
    db.prepare(`SELECT COUNT(*) AS n FROM reviews WHERE id = ?`).get(seedReviewId(1, 1)).n,
    0,
  );
  assert.equal(
    db.prepare(`SELECT summary FROM reviews WHERE id = 'rev-stanley'`).get().summary,
    "real summary keep me",
  );
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

test("ensureDemoColumn upgrades older users tables", () => {
  const dir = mkdtempSync(join(tmpdir(), "softboring-demo-col-"));
  const db = new Database(join(dir, "test.sqlite"));
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT,
      created_at TEXT NOT NULL,
      plan TEXT NOT NULL DEFAULT 'free',
      plan_status TEXT
    );
    CREATE TABLE reviews (
      id TEXT PRIMARY KEY,
      guest_id TEXT NOT NULL,
      user_id TEXT,
      energy TEXT NOT NULL DEFAULT '',
      drain TEXT NOT NULL DEFAULT '',
      less_of TEXT NOT NULL DEFAULT '',
      priorities TEXT NOT NULL DEFAULT '',
      feeling INTEGER,
      summary TEXT NOT NULL DEFAULT '',
      locale TEXT,
      custom_answers TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL
    );
    CREATE TABLE wall_notes (
      id TEXT PRIMARY KEY,
      review_id TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL,
      x REAL NOT NULL DEFAULT 80,
      y REAL NOT NULL DEFAULT 80,
      z INTEGER NOT NULL DEFAULT 0,
      color TEXT NOT NULL DEFAULT 'peach',
      hidden INTEGER NOT NULL DEFAULT 0,
      pinned INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE user_settings (
      user_id TEXT PRIMARY KEY
    );
  `);
  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, 'hash', ?)`,
  ).run("user-old", REAL_EMAIL, "2026-01-01T00:00:00.000Z");
  ensureDemoColumn(db);
  const cols = db.prepare(`PRAGMA table_info(users)`).all().map((col) => col.name);
  assert.ok(cols.includes("is_demo"));
  seedDemoAccounts(db, { now: new Date("2026-09-17T00:00:00.000Z") });
  const kept = db.prepare(`SELECT email, is_demo FROM users WHERE id = 'user-old'`).get();
  assert.equal(kept.email, REAL_EMAIL);
  assert.equal(kept.is_demo, 0);
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

test("demo copy pool is zh-TW, unique, and wall layout stays on canvas", () => {
  assert.equal(SEED_REVIEW_PAIRS.length, 10);
  const summaries = new Set();
  for (const pair of SEED_REVIEW_PAIRS) {
    assert.equal(pair.length, 2);
    for (const review of pair) {
      assert.ok(review.feeling >= 1 && review.feeling <= 5);
      assert.match(review.summary, /[\u4e00-\u9fff]/);
      assert.equal(summaries.has(review.summary), false);
      summaries.add(review.summary);
    }
  }
  assert.ok(DAILY_POOL.length >= 30);
  for (const review of DAILY_POOL) {
    assert.match(review.summary, /[\u4e00-\u9fff]/);
    assert.equal(summaries.has(review.summary), false);
    summaries.add(review.summary);
  }
  const layout = wallLayoutForIndex(19);
  assert.ok(layout.x >= 24);
  assert.ok(layout.y >= 24);
  assert.match(demoEmail(3), /demo03@softboring\.demo/);
});
