import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { register } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import Database from "better-sqlite3";

register("./alias-hook.mjs", import.meta.url);

const {
  isoWeekKeyFromParts,
  isoWeekKeyInTimeZone,
  reviewMatchesQuery,
  weeklyStreak,
} = await import("../src/lib/plus-insights.ts");
const { currentPauseWeekKey, isPauseWeekKey } = await import("../src/lib/pause-week.ts");
const { wallQuoteColor, wallQuoteText, quoteCardFilename, QUOTE_WASH } = await import(
  "../src/lib/wall-quote.ts"
);
const { POSTCARD_COLORS } = await import("../src/lib/soft-postcard.ts");
const { WALL_COLORS } = await import("../src/lib/wall-canvas.ts");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

test("pause weeks are skipped by the streak and do not break it", () => {
  const now = new Date("2026-09-22T12:00:00.000Z");
  const previous = new Date("2026-09-15T12:00:00.000Z");
  const older = new Date("2026-09-08T12:00:00.000Z");
  const thisWeek = isoWeekKeyInTimeZone(now, "UTC");
  const prevWeek = isoWeekKeyInTimeZone(previous, "UTC");
  assert.notEqual(thisWeek, prevWeek);
  assert.equal(isPauseWeekKey(thisWeek), true);
  assert.equal(isPauseWeekKey("this-week"), false);
  assert.equal(currentPauseWeekKey(now, "UTC"), thisWeek);

  assert.equal(
    weeklyStreak([previous.toISOString(), older.toISOString()], now, {
      timeZone: "UTC",
      pausedWeeks: [thisWeek],
    }),
    2,
  );
  assert.equal(
    weeklyStreak([now.toISOString(), older.toISOString()], now, { timeZone: "UTC" }),
    1,
  );
  assert.equal(
    weeklyStreak([now.toISOString(), older.toISOString()], now, {
      timeZone: "UTC",
      pausedWeeks: [prevWeek],
    }),
    2,
  );
  assert.equal(
    weeklyStreak([now.toISOString(), previous.toISOString()], now, {
      timeZone: "UTC",
      pausedWeeks: [thisWeek],
    }),
    1,
  );
  assert.equal(weeklyStreak([], now, { pausedWeeks: [thisWeek], timeZone: "UTC" }), 0);
});

test("pause week keys follow the member timezone", () => {
  const mondayTaipei = new Date("2026-09-20T16:00:00.000Z");
  const sundayTaipei = new Date("2026-09-20T15:00:00.000Z");
  assert.equal(
    isoWeekKeyInTimeZone(mondayTaipei, "Asia/Taipei"),
    isoWeekKeyFromParts(2026, 9, 21),
  );
  assert.equal(
    isoWeekKeyInTimeZone(sundayTaipei, "Asia/Taipei"),
    isoWeekKeyFromParts(2026, 9, 20),
  );
  assert.equal(currentPauseWeekKey(mondayTaipei, "Asia/Taipei"), isoWeekKeyFromParts(2026, 9, 21));
});

test("week_pauses stores one gentle mark per member and week", () => {
  const schema = read("scripts/schema.sql");
  const migrate = read("src/db/migrate.ts");
  const cli = read("scripts/migrate.mjs");
  assert.match(schema, /CREATE TABLE IF NOT EXISTS week_pauses/);
  assert.match(schema, /PRIMARY KEY \(user_id, week_key\)/);
  assert.match(migrate, /ensureWeekPauses/);
  assert.match(cli, /week_pauses/);

  const dir = mkdtempSync(join(tmpdir(), "softboring-pause-"));
  const db = new Database(join(dir, "test.sqlite"));
  db.pragma("foreign_keys = ON");
  db.exec(schema);
  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at, plan) VALUES (?, ?, ?, ?, ?)`,
  ).run("member", "member@example.com", "hash", "2026-09-22T00:00:00.000Z", "free");
  db.prepare(
    `INSERT INTO week_pauses (user_id, week_key, created_at) VALUES (?, ?, ?)`,
  ).run("member", "2026-W39", "2026-09-22T00:00:00.000Z");
  assert.throws(() => {
    db.prepare(
      `INSERT INTO week_pauses (user_id, week_key, created_at) VALUES (?, ?, ?)`,
    ).run("member", "2026-W39", "2026-09-22T01:00:00.000Z");
  });
  db.prepare(`DELETE FROM week_pauses WHERE user_id = ? AND week_key = ?`).run(
    "member",
    "2026-W39",
  );
  const left = db.prepare(`SELECT COUNT(*) AS n FROM week_pauses`).get();
  assert.equal(left.n, 0);
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

test("quote cards reuse the postcard cream palette and stay short", () => {
  assert.equal(POSTCARD_COLORS.cream, "#fff4e8");
  assert.equal(QUOTE_WASH.cream, POSTCARD_COLORS.cream);
  assert.equal(QUOTE_WASH.peach, POSTCARD_COLORS.peach);
  for (const color of WALL_COLORS) {
    assert.match(QUOTE_WASH[color], /^#[0-9a-f]{6}$/);
  }
  assert.equal(wallQuoteColor("sky"), "sky");
  assert.equal(wallQuoteColor("nope"), "peach");
  assert.equal(wallQuoteText("  a   quiet   week  ", "energy"), "a quiet week");
  assert.equal(wallQuoteText("   ", "  tea and rain  "), "tea and rain");
  assert.equal(wallQuoteText("", "  "), "");
  const long = "peach ".repeat(80);
  assert.ok(Array.from(wallQuoteText(long, "")).length <= 160);
  assert.match(quoteCardFilename("Note 12"), /^soft-boring-quote-[a-z0-9-]+\.png$/);
  assert.match(read("src/lib/wall-quote.ts"), /drawWallQuoteCard/);
  assert.match(read("src/lib/wall-quote.ts"), /POSTCARD_COLORS/);
});

test("calm archive search matches title, body, and mood for Soft+ only", () => {
  const review = {
    summary: "Tea week",
    energy: "A garden walk",
    drain: "",
    lessOf: "",
    priorities: "",
    feeling: 3,
    customAnswers: [],
    mood: "lavender",
  };
  assert.equal(reviewMatchesQuery(review, "garden"), true);
  assert.equal(reviewMatchesQuery(review, "lavender"), true);
  assert.equal(reviewMatchesQuery(review, "薰衣草", "薰衣草"), true);
  assert.equal(reviewMatchesQuery(review, "missing"), false);

  const history = read("src/components/history-list.tsx");
  const archive = read("src/components/calm-archive-search.tsx");
  assert.match(history, /CalmArchiveSearch/);
  assert.match(history, /review\.mood/);
  assert.match(archive, /data-archive-search="open"/);
  assert.match(archive, /data-archive-search="tease"/);
  assert.match(archive, /href="\/pricing"/);
  assert.match(archive, /disabled/);
  assert.doesNotMatch(archive, /stripe|checkout|sendMail|resend/i);
  assert.match(read("src/lib/plus-insights.ts"), /review\.mood/);
});

test("pause, quote, and archive stay free of payments and mail", () => {
  const files = [
    "src/app/api/week-pause/route.ts",
    "src/app/api/wall/notes/[id]/quote/route.ts",
    "src/components/soft-pause-card.tsx",
    "src/components/wall-quote-button.tsx",
    "src/db/week-pauses.ts",
    "src/lib/review-streak.ts",
  ];
  for (const file of files) {
    const source = read(file);
    assert.doesNotMatch(source, /stripe|sendMail|resend|nodemailer/i);
  }

  const pause = read("src/app/api/week-pause/route.ts");
  const quote = read("src/app/api/wall/notes/[id]/quote/route.ts");
  const home = read("src/app/[locale]/page.tsx");
  const review = read("src/app/[locale]/review/page.tsx");
  const board = read("src/components/wall-board.tsx");
  const streak = read("src/lib/review-streak.ts");

  assert.match(pause, /paused/);
  assert.doesNotMatch(pause, /requireSoftPlus|userIsSoftPlus/);
  assert.match(quote, /consumeKeyedRateLimit/);
  assert.match(quote, /row\.hidden && !owns/);
  assert.doesNotMatch(quote, /requireSoftPlus/);
  assert.match(home, /SoftPauseCard/);
  assert.match(review, /SoftPauseCard/);
  assert.match(board, /WallQuoteButton/);
  assert.match(streak, /pausedWeeks/);
  assert.match(read("src/app/api/reviews/route.ts"), /streakForUser/);
  assert.match(read("src/i18n/routing.ts"), /locales:\s*\["en", "zh-tw", "ja"\]/);
  assert.doesNotMatch(home, /zh-TW/);
  assert.doesNotMatch(review, /zh-TW/);

  const archiveKeys = [
    "archiveTitle",
    "archiveLead",
    "archiveEmptyTitle",
    "archiveEmptyBody",
    "archiveTeaseTitle",
    "archiveTeaseBody",
    "archiveTeaseCta",
  ];
  const pauseKeys = ["title", "pausedBody", "pause", "resume", "guestBody"];
  const quoteKeys = ["brand", "kind", "footer", "anonymous", "emptyQuote"];
  for (const locale of ["en", "zh-tw", "ja"]) {
    const messages = readJson(`messages/${locale}.json`);
    for (const key of archiveKeys) {
      assert.equal(messages.History[key].length > 0, true);
    }
    for (const key of pauseKeys) {
      assert.equal(messages.SoftPause[key].length > 0, true);
    }
    for (const key of quoteKeys) {
      assert.equal(messages.QuoteCard[key].length > 0, true);
    }
    assert.equal(messages.Wall.quoteCta.length > 0, true);
    assert.equal(messages.Wall.quoteAria.length > 0, true);
    assert.equal(messages.SoftPause.pausedBody.includes("{"), false);
  }
  assert.equal(readJson("messages/zh-tw.json").SoftPause.pausedTitle, "這一週正在休息");
  assert.equal(readJson("messages/zh-tw.json").Wall.quoteCta, "引用小卡");
});
