import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { register } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import Database from "better-sqlite3";

register("./alias-hook.mjs", import.meta.url);

const { buildQuietYearChips } = await import("../src/lib/quiet-chips.ts");
const { isoWeekKeyInTimeZone } = await import("../src/lib/plus-insights.ts");
const {
  DEFAULT_FOCUS_PREFERENCE,
  focusProgress,
  focusTotalMs,
  formatFocusClock,
  normalizeFocusPreference,
  remainingFocusMs,
  storedFocusChime,
  storedFocusMinutes,
} = await import("../src/lib/focus-timer.ts");
const { ECHO_MAX_CHARS, parseEchoBody } = await import("../src/lib/soft-echo.ts");
const { FREE_HISTORY_LIMIT } = await import("../src/lib/plan.ts");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

function weekKey(iso) {
  return isoWeekKeyInTimeZone(new Date(iso), "Asia/Taipei");
}

test("focus preference is only 15 or 25, and the clock stays in memory", () => {
  assert.deepEqual(normalizeFocusPreference(null), DEFAULT_FOCUS_PREFERENCE);
  assert.deepEqual(normalizeFocusPreference({ minutes: 10, chime: "yes" }), {
    minutes: 25,
    chime: true,
  });
  assert.deepEqual(normalizeFocusPreference({ minutes: 15, chime: false }), {
    minutes: 15,
    chime: false,
  });
  assert.equal(storedFocusMinutes(15), 15);
  assert.equal(storedFocusMinutes(45), 25);
  assert.equal(storedFocusChime(0), false);
  assert.equal(storedFocusChime(1), true);
  assert.equal(storedFocusChime(undefined), true);
  assert.equal(focusTotalMs(15), 15 * 60 * 1000);
  assert.equal(formatFocusClock(15 * 60 * 1000), "15:00");
  assert.equal(formatFocusClock(1500), "00:02");
  assert.equal(remainingFocusMs(1_000, 1_500), 0);
  assert.equal(remainingFocusMs(5_000, 1_000), 4_000);
  assert.equal(focusProgress(0, 1000), 1);
  assert.equal(focusProgress(250, 1000), 0.75);
  assert.equal(focusProgress(1000, 0), 0);
});

test("echo lines stay one short line", () => {
  assert.deepEqual(parseEchoBody("  hello\nthere  "), { ok: true, body: "hello there" });
  assert.equal(parseEchoBody("   ").ok, false);
  assert.equal(parseEchoBody(12).error, "invalid");
  assert.equal(parseEchoBody("hi\u0000").error, "invalid");
  const ok = "葉".repeat(ECHO_MAX_CHARS);
  assert.equal(parseEchoBody(ok).ok, true);
  assert.equal(parseEchoBody(`${ok}。`).error, "too_long");
});

test("quiet chips show pause weeks and moods, with free limited to the latest reviews", () => {
  assert.equal(FREE_HISTORY_LIMIT, 4);
  const dates = [
    "2026-09-21T02:00:00.000Z",
    "2026-09-14T02:00:00.000Z",
    "2026-09-07T02:00:00.000Z",
    "2026-08-31T02:00:00.000Z",
    "2026-08-24T02:00:00.000Z",
    "2026-08-17T02:00:00.000Z",
  ];
  const moods = ["peach", "mint", "blush", "cream", "lavender", "peach"];
  const reviews = dates.map((createdAt, index) => ({
    id: `r${index}`,
    createdAt,
    mood: moods[index],
  }));
  const newestKey = weekKey(dates[0]);
  const oldestKey = weekKey(dates[5]);
  assert.notEqual(newestKey, oldestKey);
  assert.match(newestKey, /^2026-W/);

  const pauses = [newestKey, oldestKey, "2026-W01", "2025-W52", "not-a-week"];
  const free = buildQuietYearChips({
    reviews: [...reviews].reverse(),
    pauseWeekKeys: pauses,
    softPlus: false,
    year: 2026,
    timeZone: "Asia/Taipei",
  });
  assert.equal(free.softPlus, false);
  assert.equal(free.year, 2026);
  const freeMoodIds = free.chips.filter((chip) => chip.kind === "mood").map((chip) => chip.reviewId);
  assert.deepEqual(freeMoodIds, ["r3", "r2", "r1", "r0"]);
  assert.equal(
    free.chips.some((chip) => chip.mood === "lavender"),
    false,
  );
  const freePauses = free.chips.filter((chip) => chip.kind === "pause").map((chip) => chip.weekKey);
  assert.deepEqual(freePauses, [newestKey]);
  assert.equal(free.hiddenCount, 4);
  assert.equal(
    free.chips.find((chip) => chip.weekKey === newestKey && chip.kind === "pause").week > 0,
    true,
  );

  const plus = buildQuietYearChips({
    reviews,
    pauseWeekKeys: pauses,
    softPlus: true,
    year: 2026,
    timeZone: "Asia/Taipei",
  });
  assert.equal(plus.hiddenCount, 0);
  assert.equal(plus.chips.filter((chip) => chip.kind === "mood").length, 6);
  assert.deepEqual(
    plus.chips.filter((chip) => chip.kind === "pause").map((chip) => chip.weekKey),
    ["2026-W01", oldestKey, newestKey].sort(),
  );
  assert.equal(
    plus.chips.some((chip) => chip.weekKey === "2025-W52"),
    false,
  );

  const sameWeek = buildQuietYearChips({
    reviews: [
      { id: "newer", createdAt: dates[0], mood: "mint" },
      { id: "older", createdAt: "2026-09-21T01:00:00.000Z", mood: "blush" },
    ],
    pauseWeekKeys: [],
    softPlus: true,
    year: 2026,
    timeZone: "Asia/Taipei",
  });
  assert.equal(sameWeek.chips.length, 1);
  assert.equal(sameWeek.chips[0].reviewId, "newer");
  assert.equal(sameWeek.chips[0].mood, "mint");
});

test("wall echoes are one row per neighbor, and focus preferences migrate", () => {
  const schema = read("scripts/schema.sql");
  const migrate = read("src/db/migrate.ts");
  const cli = read("scripts/migrate.mjs");
  assert.match(schema, /CREATE TABLE IF NOT EXISTS wall_note_echoes/);
  assert.match(schema, /PRIMARY KEY \(user_id, note_id\)/);
  assert.match(schema, /focus_minutes INTEGER NOT NULL DEFAULT 25/);
  assert.match(schema, /focus_chime INTEGER NOT NULL DEFAULT 1/);
  assert.match(migrate, /ensureWallNoteEchoes/);
  assert.match(migrate, /focus_minutes/);
  assert.match(cli, /wall_note_echoes/);
  assert.match(cli, /focus_chime/);

  const dir = mkdtempSync(join(tmpdir(), "softboring-echo-"));
  const db = new Database(join(dir, "test.sqlite"));
  db.pragma("foreign_keys = ON");
  db.exec(schema);
  const now = "2026-09-22T00:00:00.000Z";
  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at, plan) VALUES (?, ?, ?, ?, ?)`,
  ).run("owner", "owner@example.com", "hash", now, "soft_plus");
  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at, plan, nickname) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run("neighbor", "neighbor@example.com", "hash", now, "soft_plus", "小草");
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
    `INSERT INTO wall_note_echoes (user_id, note_id, body, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run("neighbor", "note", "tea was enough", now, now);
  assert.throws(() => {
    db.prepare(
      `INSERT INTO wall_note_echoes (user_id, note_id, body, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run("neighbor", "note", "another line", now, now);
  });
  db.prepare(
    `INSERT INTO wall_note_echoes (user_id, note_id, body, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id, note_id) DO UPDATE SET
       body = excluded.body,
       updated_at = excluded.updated_at`,
  ).run("neighbor", "note", "still one line", now, now);
  const row = db
    .prepare(`SELECT body, COUNT(*) AS n FROM wall_note_echoes WHERE note_id = ?`)
    .get("note");
  assert.equal(row.n, 1);
  assert.equal(row.body, "still one line");

  const settingsCols = db.prepare(`PRAGMA table_info(user_settings)`).all().map((col) => col.name);
  assert.ok(settingsCols.includes("focus_minutes"));
  assert.ok(settingsCols.includes("focus_chime"));

  db.close();
  rmSync(dir, { recursive: true, force: true });
});

test("timer, echo, and quiet chips stay local, gated, and localized", () => {
  const review = read("src/app/[locale]/review/page.tsx");
  const timer = read("src/components/soft-focus-timer.tsx");
  const focusLib = read("src/lib/focus-timer.ts");
  const echoRoute = read("src/app/api/wall/notes/[id]/echo/route.ts");
  const echoDb = read("src/db/wall-echoes.ts");
  const board = read("src/components/wall-board.tsx");
  const notesRoute = read("src/app/api/wall/notes/route.ts");
  const year = read("src/app/[locale]/year/page.tsx");
  const history = read("src/app/[locale]/history/page.tsx");
  const chips = read("src/lib/quiet-chips.ts");
  const settingsRoute = read("src/app/api/account/settings/route.ts");

  assert.match(review, /SoftFocusTimer/);
  assert.match(timer, /data-focus-timer/);
  assert.match(timer, /playSoftChime/);
  assert.match(focusLib, /AudioContext/);
  assert.match(focusLib, /localStorage/);
  assert.doesNotMatch(focusLib, /Notification|sendMail|resend|stripe/i);
  assert.doesNotMatch(timer, /Notification|sendMail|resend|stripe/i);

  assert.match(echoRoute, /requireSoftPlus/);
  assert.match(echoRoute, /consumeKeyedRateLimit/);
  assert.match(echoRoute, /own_note/);
  assert.match(echoRoute, /invalid_echo/);
  assert.doesNotMatch(echoRoute, /sendMail|resend|stripe|notifications/i);
  assert.match(echoDb, /ON CONFLICT\(user_id, note_id\)/);
  assert.match(echoDb, /EchoOwnNoteError/);
  assert.doesNotMatch(echoDb, /sendMail|resend|stripe|notifications|email/i);
  assert.match(board, /echoPreview/);
  assert.match(board, /\/echo/);
  assert.match(board, /WallEchoList/);
  assert.match(notesRoute, /withEchoes\(withBookmarkFlag/);
  assert.match(notesRoute, /toTeaserNote/);
  assert.match(settingsRoute, /focusMinutes/);
  assert.match(settingsRoute, /invalid_focus/);

  assert.match(year, /QuietYearChips/);
  assert.match(year, /lockedTitle/);
  assert.match(year, /buildQuietYearChips/);
  assert.match(history, /QuietYearChips/);
  assert.match(history, /SoftLetterArchive/);
  assert.match(chips, /FREE_HISTORY_LIMIT/);
  assert.doesNotMatch(chips, /sendMail|resend|stripe/i);
  assert.match(read("src/i18n/routing.ts"), /locales:\s*\["en", "zh-tw", "ja"\]/);
  assert.doesNotMatch(year, /zh-TW/);
  assert.doesNotMatch(history, /zh-TW/);
  assert.doesNotMatch(review, /zh-TW/);

  const echoKeys = [
    "echoTitle",
    "echoLead",
    "echoSubmit",
    "echoPreview",
    "echoRate",
    "echoInvalid",
    "echoEmpty",
  ];
  for (const locale of ["en", "zh-tw", "ja"]) {
    const messages = readJson(`messages/${locale}.json`);
    assert.equal(messages.FocusTimer.title.length > 0, true);
    assert.equal(messages.FocusTimer.lead.length > 0, true);
    assert.equal(messages.FocusTimer.chimeHint.includes("{") === false, true);
    assert.equal(messages.QuietChips.freeHint.length > 0, true);
    assert.equal(messages.QuietChips.plusHint.length > 0, true);
    assert.equal(messages.QuietChips.hidden.includes("count"), true);
    assert.equal(messages.QuietChips.week.includes("{week}"), true);
    for (const key of echoKeys) {
      assert.equal(messages.Wall[key].length > 0, true);
    }
  }
  assert.equal(readJson("messages/zh-tw.json").FocusTimer.title, "輕柔專注");
  assert.equal(readJson("messages/zh-tw.json").QuietChips.title, "安靜小標");
  assert.equal(readJson("messages/ja.json").Wall.echoTitle, "隣人のエコー");
});
