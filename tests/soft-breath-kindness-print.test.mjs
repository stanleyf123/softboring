import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import Database from "better-sqlite3";

register("./alias-hook.mjs", import.meta.url);

const {
  BREATH_STORAGE_KEY,
  breathFrame,
  breathTotalMs,
  formatBreathClock,
  isBreathSeconds,
  normalizeBreathPreference,
} = await import("../src/lib/soft-breath.ts");
const {
  KINDNESS_DIGEST_LIMIT,
  KINDNESS_ECHOES_SQL,
  KINDNESS_THANKS_SQL,
  isInKindnessWeek,
  kindnessWeekStart,
  shapeKindnessDigest,
  toKindnessEcho,
  toKindnessThanks,
  trimKindness,
} = await import("../src/lib/wall-kindness.ts");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

const now = new Date("2026-09-22T04:00:00.000Z");

test("a short breath is visual only and remembers a local preference", () => {
  assert.deepEqual(normalizeBreathPreference(null), { seconds: 30, dismissed: false });
  assert.deepEqual(normalizeBreathPreference({ seconds: 60, dismissed: true }), {
    seconds: 60,
    dismissed: true,
  });
  assert.deepEqual(normalizeBreathPreference({ seconds: 45, dismissed: "yes" }), {
    seconds: 30,
    dismissed: false,
  });
  assert.equal(isBreathSeconds(30), true);
  assert.equal(isBreathSeconds(60), true);
  assert.equal(isBreathSeconds(15), false);
  assert.equal(breathTotalMs(30), 30_000);
  assert.equal(formatBreathClock(30_000), "0:30");
  assert.equal(formatBreathClock(1_001), "0:02");

  assert.equal(breathFrame(0, 30).phase, "in");
  assert.equal(breathFrame(3_999, 30).phase, "in");
  assert.equal(breathFrame(4_000, 30).phase, "rest");
  assert.equal(breathFrame(5_999, 30).phase, "rest");
  assert.equal(breathFrame(6_000, 30).phase, "out");
  assert.equal(breathFrame(9_999, 30).phase, "out");
  assert.equal(breathFrame(10_000, 30).phase, "in");
  assert.equal(breathFrame(29_999, 30).phase, "out");
  assert.equal(breathFrame(30_000, 30).phase, "done");
  assert.equal(breathFrame(30_000, 30).remainingMs, 0);
  assert.ok(breathFrame(0, 30).scale < breathFrame(3_999, 30).scale);
  assert.ok(breathFrame(6_000, 60).scale > breathFrame(9_999, 60).scale);

  const card = read("src/components/soft-breath-card.tsx");
  const review = read("src/app/[locale]/review/page.tsx");
  assert.match(card, /BREATH_STORAGE_KEY|softboring\.softBreath\.v1|writeBreathPreference/);
  assert.match(read("src/lib/soft-breath.ts"), new RegExp(BREATH_STORAGE_KEY.replace(".", "\\.")));
  assert.match(card, /data-soft-breath/);
  assert.match(card, /prefers-reduced-motion/);
  assert.match(review, /SoftBreathCard/);
  assert.match(review, /SoftFocusTimer/);
  assert.doesNotMatch(card, /AudioContext|HTMLAudioElement|<audio/i);
  assert.doesNotMatch(read("src/lib/soft-breath.ts"), /AudioContext|stripe|nodemailer|resend/i);
  assert.doesNotMatch(review, /stripe|nodemailer|resend/i);
});

test("kindness digest keeps this timezone week and stays off free desks", () => {
  const start = kindnessWeekStart(now, "Asia/Taipei");
  assert.equal(start.toISOString(), "2026-09-20T16:00:00.000Z");
  assert.equal(isInKindnessWeek("2026-09-20T15:59:59.000Z", start), false);
  assert.equal(isInKindnessWeek("2026-09-20T16:00:00.000Z", start), true);

  const thanks = trimKindness(
    [
      {
        noteId: "old",
        at: "2026-09-20T15:59:59.000Z",
        excerpt: "last week",
        nickname: null,
        hidden: false,
      },
      {
        noteId: "edge",
        at: "2026-09-20T16:00:00.000Z",
        excerpt: "monday",
        nickname: "Mint",
        hidden: false,
      },
      {
        noteId: "later",
        at: "2026-09-22T01:00:00.000Z",
        excerpt: "secret line",
        nickname: null,
        hidden: true,
      },
    ],
    start,
  );
  assert.deepEqual(
    thanks.map((item) => item.noteId),
    ["later", "edge"],
  );

  const many = Array.from({ length: 8 }, (_, index) => ({
    noteId: String(index),
    at: new Date(start.getTime() + (index + 1) * 1000).toISOString(),
    excerpt: "x",
    nickname: null,
    hidden: false,
  }));
  const capped = trimKindness(many, start, KINDNESS_DIGEST_LIMIT);
  assert.equal(capped.length, KINDNESS_DIGEST_LIMIT);
  assert.equal(capped[0].noteId, "7");

  const hidden = toKindnessThanks({
    note_id: "quiet",
    at: "2026-09-22T01:00:00.000Z",
    hidden: 1,
    summary: "kept off the wall",
    energy: "secret energy",
    nickname: null,
    email: "secret@example.com",
  });
  assert.equal(hidden.hidden, true);
  assert.equal(hidden.excerpt, "");
  assert.equal(hidden.nickname, null);
  assert.equal(JSON.stringify(hidden).includes("secret@"), false);
  assert.equal(JSON.stringify(hidden).includes("kept off"), false);

  const echoed = toKindnessEcho({
    note_id: "echo-note",
    at: "2026-09-22T02:00:00.000Z",
    hidden: 0,
    summary: "a soft week",
    energy: "",
    nickname: "Peach",
    email: "secret@example.com",
    body: "  still here  ",
  });
  assert.equal(echoed.body, "still here");
  assert.equal(echoed.nickname, "Peach");
  assert.equal(echoed.excerpt, "a soft week");
  assert.equal(JSON.stringify(echoed).includes("secret@"), false);

  const digest = shapeKindnessDigest({
    thanks: [hidden],
    echoes: [echoed],
    weekStart: start,
    timeZone: "Asia/Taipei",
    now,
  });
  assert.equal(digest.since, start.toISOString());
  assert.match(digest.weekKey, /^2026-W\d{2}$/);
  assert.equal(digest.thanks.length, 1);
  assert.equal(digest.echoes.length, 1);

  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, nickname TEXT, email TEXT);
    CREATE TABLE reviews (
      id TEXT PRIMARY KEY,
      summary TEXT,
      energy TEXT
    );
    CREATE TABLE wall_notes (
      id TEXT PRIMARY KEY,
      review_id TEXT,
      user_id TEXT,
      hidden INTEGER
    );
    CREATE TABLE wall_note_thanks (
      user_id TEXT,
      note_id TEXT,
      created_at TEXT
    );
    CREATE TABLE wall_note_echoes (
      user_id TEXT,
      note_id TEXT,
      body TEXT,
      created_at TEXT,
      updated_at TEXT
    );
  `);
  db.prepare(`INSERT INTO users (id, nickname, email) VALUES (?, ?, ?)`).run(
    "neighbor",
    null,
    "secret@example.com",
  );
  db.prepare(`INSERT INTO reviews (id, summary, energy) VALUES (?, ?, ?)`).run(
    "review",
    "monday note",
    "tea",
  );
  db.prepare(`INSERT INTO wall_notes (id, review_id, user_id, hidden) VALUES (?, ?, ?, ?)`).run(
    "note",
    "review",
    "neighbor",
    0,
  );
  db.prepare(
    `INSERT INTO wall_note_thanks (user_id, note_id, created_at) VALUES (?, ?, ?)`,
  ).run("me", "note", "2026-09-21T01:00:00.000Z");
  db.prepare(
    `INSERT INTO wall_note_thanks (user_id, note_id, created_at) VALUES (?, ?, ?)`,
  ).run("me", "note", "2026-09-01T01:00:00.000Z");
  db.prepare(
    `INSERT INTO wall_note_echoes (user_id, note_id, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
  ).run("me", "note", "a small echo", "2026-09-01T01:00:00.000Z", "2026-09-22T03:00:00.000Z");

  const thankRows = db.prepare(KINDNESS_THANKS_SQL).all("me", start.toISOString(), 6);
  assert.equal(thankRows.length, 1);
  assert.equal(thankRows[0].at, "2026-09-21T01:00:00.000Z");
  const echoRows = db
    .prepare(KINDNESS_ECHOES_SQL)
    .all("me", start.toISOString(), start.toISOString(), 6);
  assert.equal(echoRows.length, 1);
  assert.equal(echoRows[0].body, "a small echo");
  assert.equal(echoRows[0].at, "2026-09-22T03:00:00.000Z");
  db.close();

  const route = read("src/app/api/wall/kindness/route.ts");
  const strip = read("src/components/wall-kindness-strip.tsx");
  const board = read("src/components/wall-board.tsx");
  assert.match(route, /requireSoftPlus/);
  assert.match(route, /kindnessWeekStart/);
  assert.doesNotMatch(route, /stripe|nodemailer|resend|sendMail/i);
  assert.match(strip, /data-wall-kindness="tease"/);
  assert.match(strip, /data-wall-kindness="guest"/);
  assert.match(strip, /data-wall-kindness="open"/);
  assert.match(strip, /\/pricing/);
  assert.match(board, /WallKindnessStrip/);
  assert.doesNotMatch(strip, /stripe|nodemailer|resend/i);
});

test("print sheets stay cream for review, snapshot, and letters", () => {
  const css = read("src/app/globals.css");
  const month = read("src/components/soft-month-view.tsx");
  const review = read("src/components/review-form.tsx");
  const detail = read("src/components/history-detail.tsx");
  const letter = read("src/components/soft-letter-card.tsx");
  const archive = read("src/components/soft-letter-archive.tsx");
  const recall = read("src/components/soft-letter-recall.tsx");
  const year = read("src/components/year-panel.tsx");
  const exported = read("src/components/export-print-view.tsx");

  assert.match(css, /@page/);
  assert.match(css, /size:\s*A4/);
  assert.match(css, /#fff8f2/);
  assert.match(css, /#f4d4c6/);
  assert.match(css, /#d5e6d8/);
  assert.match(css, /print-color-adjust:\s*exact/);
  assert.match(css, /\.soft-letter-sheet/);
  assert.match(css, /\.soft-print-sheet/);
  assert.match(css, /\.soft-review-sheet/);
  assert.match(css, /\.soft-month-sheet/);
  assert.match(css, /\.soft-export-sheet/);
  assert.match(css, /html\[data-night="on"\]/);
  assert.match(month, /soft-month-sheet/);
  assert.match(month, /soft-print-blush/);
  assert.match(month, /soft-print-mint/);
  assert.match(review, /soft-review-sheet/);
  assert.match(detail, /soft-review-sheet/);
  assert.match(detail, /SoftPostcardFromReview/);
  assert.match(detail, /soft-week-print|SoftWeekPrintPostcard|SoftPostcardFromReview/);
  assert.match(letter, /soft-letter-sheet/);
  assert.match(archive, /soft-letter-sheet/);
  assert.match(recall, /soft-letter-sheet/);
  assert.doesNotMatch(recall, /print:hidden/);
  assert.match(year, /soft-letter-sheet/);
  assert.match(exported, /soft-export-sheet/);
  assert.match(read("src/i18n/routing.ts"), /locales: \["en", "zh-tw", "ja"\]/);

  const keys = [
    "title",
    "lead",
    "sec30",
    "sec60",
    "dismiss",
    "restore",
    "in",
    "out",
    "done",
  ];
  const kindness = ["title", "lead", "lockedBody", "guestBody", "empty", "thanksTitle", "echoesTitle"];
  for (const locale of ["messages/en.json", "messages/zh-tw.json", "messages/ja.json"]) {
    const messages = readJson(locale);
    for (const key of keys) assert.equal(typeof messages.SoftBreath[key], "string");
    for (const key of kindness) assert.equal(typeof messages.WallKindness[key], "string");
  }
  assert.equal(readJson("messages/zh-tw.json").SoftBreath.title, "輕輕呼吸");
  assert.equal(readJson("messages/zh-tw.json").WallKindness.title, "這一週的善意");
  assert.equal(readJson("messages/ja.json").SoftBreath.title, "そっと呼吸");
  assert.equal(readJson("messages/en.json").WallKindness.lockedTitle, "Kindness waits on Soft+");
});
