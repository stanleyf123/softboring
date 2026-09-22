import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { register } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import Database from "better-sqlite3";

register("./alias-hook.mjs", import.meta.url);

const { buildSoftMonthSnapshot } = await import("../src/lib/soft-month.ts");
const { monthlyDigestFromReviews } = await import("../src/lib/plus-insights.ts");
const { calendarInTimeZone, DEFAULT_TIMEZONE, normalizeTimeZone } = await import(
  "../src/lib/timezone.ts"
);

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

function review(id, createdAt, summary = `week ${id}`) {
  return {
    id,
    createdAt,
    summary,
    energy: `${summary} tea`,
    drain: "meetings",
    lessOf: "",
    priorities: "",
    feeling: 4,
    customAnswers: [],
  };
}

test("account timezone defaults to Asia/Taipei and month follows that zone", () => {
  assert.equal(DEFAULT_TIMEZONE, "Asia/Taipei");
  assert.equal(normalizeTimeZone(null), "Asia/Taipei");
  assert.equal(normalizeTimeZone("   "), "Asia/Taipei");
  assert.equal(normalizeTimeZone("Not/AZone"), "Asia/Taipei");
  assert.equal(normalizeTimeZone("Asia/Tokyo"), "Asia/Tokyo");

  const boundary = new Date("2026-08-31T16:30:00.000Z");
  const taipeiBoundary = calendarInTimeZone(boundary, "Asia/Taipei");
  const utcBoundary = calendarInTimeZone(boundary, "UTC");
  assert.equal(taipeiBoundary.year, 2026);
  assert.equal(taipeiBoundary.month, 9);
  assert.equal(utcBoundary.year, 2026);
  assert.equal(utcBoundary.month, 8);

  const now = new Date("2026-09-15T04:00:00.000Z");
  const taipei = buildSoftMonthSnapshot(
    [
      review("boundary", "2026-08-31T16:30:00.000Z", "first of September"),
      review("august", "2026-08-15T04:00:00.000Z", "still August"),
    ],
    { now, timeZone: "Asia/Taipei", softPlus: true },
  );
  assert.equal(taipei.timeZone, "Asia/Taipei");
  assert.equal(taipei.year, 2026);
  assert.equal(taipei.month, 9);
  assert.equal(taipei.monthCount, 1);
  assert.equal(taipei.reviews[0].id, "boundary");
  assert.equal(taipei.reviews[0].locked, false);
  assert.equal(taipei.reviews[0].summary, "first of September");

  const digest = monthlyDigestFromReviews(
    [{ createdAt: "2026-08-31T16:30:00.000Z", feeling: 5, energy: "tea", drain: "x" }],
    now,
    "Asia/Taipei",
  );
  assert.equal(digest.month, 9);
  assert.equal(digest.count, 1);
  assert.equal(digest.avgFeeling, 5);

  const local = monthlyDigestFromReviews(
    [{ createdAt: "2026-09-01T12:00:00.000Z", feeling: 4, energy: "tea", drain: "meetings" }],
    new Date(2026, 8, 15),
  );
  assert.equal(local.month, 9);
  assert.equal(local.count, 1);
});

test("free soft month keeps wording from the latest four reviews only", () => {
  const reviews = [5, 4, 3, 2, 1, 0].map((index) =>
    review(
      `r${index}`,
      `2026-09-${String(10 + index).padStart(2, "0")}T02:00:00.000Z`,
      `secret-${index}`,
    ),
  );
  const free = buildSoftMonthSnapshot(reviews, {
    now: new Date("2026-09-20T04:00:00.000Z"),
    timeZone: "Asia/Taipei",
    softPlus: false,
  });
  assert.equal(free.softPlus, false);
  assert.equal(free.monthCount, 6);
  assert.equal(free.visibleCount, 4);
  assert.equal(free.lockedCount, 2);
  const newest = free.reviews.find((item) => item.id === "r5");
  const oldest = free.reviews.find((item) => item.id === "r0");
  assert.equal(newest.locked, false);
  assert.equal(newest.summary, "secret-5");
  assert.equal(oldest.locked, true);
  assert.equal(oldest.summary, "");
  assert.equal(oldest.energy, "");
  assert.equal(oldest.feeling, null);

  const plus = buildSoftMonthSnapshot(reviews, {
    now: new Date("2026-09-20T04:00:00.000Z"),
    timeZone: null,
    softPlus: true,
  });
  assert.equal(plus.timeZone, "Asia/Taipei");
  assert.equal(plus.visibleCount, 6);
  assert.equal(plus.lockedCount, 0);
  assert.equal(plus.reviews.find((item) => item.id === "r0").summary, "secret-0");
});

test("wall_note_thanks is unique per user and note, with no mail", () => {
  const schema = read("scripts/schema.sql");
  const migrate = read("src/db/migrate.ts");
  const cli = read("scripts/migrate.mjs");
  assert.match(schema, /CREATE TABLE IF NOT EXISTS wall_note_thanks/);
  assert.match(schema, /PRIMARY KEY \(user_id, note_id\)/);
  assert.match(schema, /timezone TEXT NOT NULL DEFAULT 'Asia\/Taipei'/);
  assert.match(migrate, /ensureWallNoteThanks/);
  assert.match(migrate, /timezone/);
  assert.match(cli, /wall_note_thanks/);
  assert.match(cli, /Asia\/Taipei/);

  const dir = mkdtempSync(join(tmpdir(), "softboring-thanks-"));
  const db = new Database(join(dir, "test.sqlite"));
  db.pragma("foreign_keys = ON");
  db.exec(schema);
  const now = "2026-09-22T00:00:00.000Z";
  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at, plan) VALUES (?, ?, ?, ?, ?)`,
  ).run("owner", "owner@example.com", "hash", now, "soft_plus");
  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at, plan) VALUES (?, ?, ?, ?, ?)`,
  ).run("neighbor", "neighbor@example.com", "hash", now, "soft_plus");
  db.prepare(
    `INSERT INTO reviews (
      id, guest_id, user_id, energy, drain, less_of, priorities, feeling, summary, created_at
    ) VALUES (?, ?, ?, '', '', '', '', 4, ?, ?)`,
  ).run("rev", "11111111-1111-1111-1111-111111111111", "owner", "a soft week", now);
  db.prepare(
    `INSERT INTO wall_notes (
      id, review_id, user_id, x, y, z, color, hidden, created_at, updated_at
    ) VALUES (?, ?, ?, 10, 10, 1, 'peach', 0, ?, ?)`,
  ).run("note", "rev", "owner", now, now);

  db.prepare(
    `INSERT INTO wall_note_thanks (user_id, note_id, created_at) VALUES (?, ?, ?)`,
  ).run("neighbor", "note", now);
  assert.throws(() => {
    db.prepare(
      `INSERT INTO wall_note_thanks (user_id, note_id, created_at) VALUES (?, ?, ?)`,
    ).run("neighbor", "note", now);
  });
  const count = db
    .prepare(`SELECT COUNT(*) AS n FROM wall_note_thanks WHERE note_id = ?`)
    .get("note");
  assert.equal(count.n, 1);

  const settingsCols = db
    .prepare(`PRAGMA table_info(user_settings)`)
    .all()
    .map((col) => col.name);
  assert.ok(settingsCols.includes("timezone"));

  db.close();
  mkdirSync(dir, { recursive: true });
  rmSync(dir, { recursive: true, force: true });
});

test("rhythm, thanks, and snapshot stay local and localized", () => {
  const home = read("src/app/[locale]/page.tsx");
  const review = read("src/app/[locale]/review/page.tsx");
  const rhythm = read("src/components/soft-rhythm-card.tsx");
  const board = read("src/components/wall-board.tsx");
  const thanksRoute = read("src/app/api/wall/notes/[id]/thanks/route.ts");
  const thanksDb = read("src/db/wall-thanks.ts");
  const snapshotPage = read("src/app/[locale]/account/snapshot/page.tsx");
  const snapshotApi = read("src/app/api/account/snapshot/route.ts");
  const notesRoute = read("src/app/api/wall/notes/route.ts");
  const canvas = read("src/lib/wall-canvas.ts");

  assert.match(home, /SoftRhythmCard/);
  assert.match(home, /settings\.timezone/);
  assert.match(review, /SoftRhythmCard/);
  assert.match(rhythm, /href="\/account"/);
  assert.match(rhythm, /nudgeOn/);
  assert.match(rhythm, /nudgeOff/);
  assert.doesNotMatch(rhythm, /sendMail|resend|stripe/i);

  assert.match(board, /thankCta/);
  assert.match(board, /\/thanks/);
  assert.match(board, /!full\.mine/);
  assert.match(thanksRoute, /requireSoftPlus/);
  assert.match(thanksRoute, /own_note/);
  assert.match(thanksDb, /INSERT OR IGNORE INTO wall_note_thanks/);
  assert.doesNotMatch(thanksDb, /notifications|sendMail|resend|stripe/i);
  assert.match(notesRoute, /withThanks/);
  assert.match(canvas, /thankCount/);

  assert.match(snapshotPage, /buildSoftMonthSnapshot/);
  assert.match(snapshotPage, /userIsSoftPlus/);
  assert.match(snapshotPage, /path: "\/account\/snapshot"/);
  assert.match(snapshotApi, /soft-month\.json/);
  assert.doesNotMatch(snapshotPage, /stripe|sendMail|resend/i);
  assert.match(read("src/i18n/routing.ts"), /locales:\s*\["en", "zh-tw", "ja"\]/);
  assert.doesNotMatch(snapshotPage, /zh-TW/);

  for (const locale of ["en", "zh-tw", "ja"]) {
    const messages = readJson(`messages/${locale}.json`);
    assert.equal(messages.SoftRhythm.title.length > 0, true);
    assert.equal(messages.SoftRhythm.nudgeOn.includes("{weekday}"), true);
    assert.equal(messages.SoftRhythm.nudgeOn.includes("{timezone}"), true);
    assert.equal(messages.SoftMonth.title.length > 0, true);
    assert.equal(messages.SoftMonth.freeHint.length > 0, true);
    assert.equal(messages.Wall.thankCta.length > 0, true);
    assert.equal(messages.Account.timezoneLabel.length > 0, true);
    assert.equal(messages.Metadata.snapshotTitle.length > 0, true);
  }
  assert.equal(readJson("messages/zh-tw.json").Wall.thankCta, "謝謝你留下這則");
});
