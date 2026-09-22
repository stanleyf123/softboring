import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { register } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import Database from "better-sqlite3";

register("./alias-hook.mjs", import.meta.url);

const { seasonForMonth, packForSeason, seasonFrameForDate, seasonFrameClass } =
  await import("../src/lib/seasonal-frame.ts");
const {
  parseSoftLetterBody,
  matchLettersToReviews,
  SOFT_LETTER_MAX,
  isSoftLetterWeekKey,
  letterWeekKey,
} = await import("../src/lib/soft-letter.ts");
const { nextOnboardingTimezoneSet } = await import("../src/lib/onboarding-progress.ts");
const { ensureUserSettingsColumns, ensureSoftLetters } = await import("../src/db/migrate.ts");
const { isoWeekKeyInTimeZone } = await import("../src/lib/plus-insights.ts");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

test("seasonal frames follow the calendar and reuse existing packs", () => {
  assert.equal(seasonForMonth(3), "spring");
  assert.equal(seasonForMonth(5), "spring");
  assert.equal(seasonForMonth(6), "rain");
  assert.equal(seasonForMonth(8), "rain");
  assert.equal(seasonForMonth(9), "autumn");
  assert.equal(seasonForMonth(11), "autumn");
  assert.equal(seasonForMonth(12), "year-end");
  assert.equal(seasonForMonth(1), "year-end");
  assert.equal(seasonForMonth(2), "year-end");

  assert.equal(packForSeason("spring"), "spring-soft-reset");
  assert.equal(packForSeason("rain"), "rainy-week-comfort");
  assert.equal(packForSeason("autumn"), null);
  assert.equal(packForSeason("year-end"), "year-end-gratitude");

  const spring = seasonFrameForDate(new Date("2026-04-10T12:00:00.000Z"), "UTC");
  assert.equal(spring.season, "spring");
  assert.equal(spring.packId, "spring-soft-reset");
  assert.equal(spring.className, seasonFrameClass("spring"));

  const autumn = seasonFrameForDate(new Date("2026-09-22T04:00:00.000Z"), "Asia/Taipei");
  assert.equal(autumn.season, "autumn");
  assert.equal(autumn.packId, null);
  assert.match(autumn.className, /season-frame--autumn/);
});

test("saving a timezone completes that checklist step", () => {
  assert.equal(nextOnboardingTimezoneSet(false, {}), false);
  assert.equal(nextOnboardingTimezoneSet(false, { timezone: "UTC" }), true);
  assert.equal(nextOnboardingTimezoneSet(true, { seasonalFrame: true }), true);
  assert.equal(
    nextOnboardingTimezoneSet(true, { timezone: "UTC", onboardingTimezoneSet: false }),
    false,
  );
});

test("old desks gain timezone progress and seasonal frame columns", () => {
  const memory = new Database(":memory:");
  memory.exec(`CREATE TABLE user_settings (user_id TEXT PRIMARY KEY)`);
  ensureUserSettingsColumns(memory);
  const names = memory
    .prepare(`PRAGMA table_info(user_settings)`)
    .all()
    .map((col) => col.name);
  assert.ok(names.includes("onboarding_timezone_set"));
  assert.ok(names.includes("seasonal_frame"));
  assert.ok(names.includes("timezone"));
  ensureSoftLetters(memory);
  const table = memory
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'soft_letters'`)
    .get();
  assert.equal(table.name, "soft_letters");
  memory.close();
});

test("soft letters are one private row per member and week", () => {
  const dir = mkdtempSync(join(tmpdir(), "softboring-letter-"));
  const db = new Database(join(dir, "test.sqlite"));
  db.pragma("foreign_keys = ON");
  db.exec(read("scripts/schema.sql"));

  const settingsCols = db
    .prepare(`PRAGMA table_info(user_settings)`)
    .all()
    .map((col) => col.name);
  assert.ok(settingsCols.includes("onboarding_timezone_set"));
  assert.ok(settingsCols.includes("seasonal_frame"));

  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at, plan) VALUES (?, ?, ?, ?, ?)`,
  ).run("member", "member@example.com", "hash", "2026-09-22T00:00:00.000Z", "soft_plus");
  db.prepare(
    `INSERT INTO soft_letters (id, user_id, week_key, body, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run("letter-1", "member", "2026-W39", "Dear later me", "2026-09-22T00:00:00.000Z", "2026-09-22T00:00:00.000Z");
  assert.throws(() => {
    db.prepare(
      `INSERT INTO soft_letters (id, user_id, week_key, body, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      "letter-2",
      "member",
      "2026-W39",
      "Another",
      "2026-09-22T01:00:00.000Z",
      "2026-09-22T01:00:00.000Z",
    );
  });
  db.prepare(`UPDATE soft_letters SET body = ? WHERE user_id = ? AND week_key = ?`).run(
    "Still warm",
    "member",
    "2026-W39",
  );
  const row = db.prepare(`SELECT body FROM soft_letters WHERE user_id = ?`).get("member");
  assert.equal(row.body, "Still warm");
  db.prepare(`DELETE FROM users WHERE id = ?`).run("member");
  const left = db.prepare(`SELECT COUNT(*) AS n FROM soft_letters`).get();
  assert.equal(left.n, 0);

  db.close();
  rmSync(dir, { recursive: true, force: true });
});

test("letter text stays within one breath and links to the newest review", () => {
  const now = new Date("2026-09-22T12:00:00.000Z");
  const weekKey = letterWeekKey(now, "Asia/Taipei");
  assert.equal(weekKey, isoWeekKeyInTimeZone(now, "Asia/Taipei"));
  assert.equal(isSoftLetterWeekKey(weekKey), true);
  assert.equal(isSoftLetterWeekKey("this-week"), false);

  const long = "信".repeat(SOFT_LETTER_MAX + 40);
  const parsed = parseSoftLetterBody(long);
  assert.equal(Array.from(parsed).length, SOFT_LETTER_MAX);
  assert.equal(parseSoftLetterBody("   "), null);
  assert.equal(parseSoftLetterBody(12), null);

  const linked = matchLettersToReviews(
    [{ weekKey, body: "hello" }],
    [
      { id: "rev-new", createdAt: now.toISOString() },
      { id: "rev-old", createdAt: now.toISOString() },
    ],
    "Asia/Taipei",
  );
  assert.equal(linked[0].reviewId, "rev-new");
  assert.equal(
    matchLettersToReviews([{ weekKey: "2020-W01", body: "old" }], [], "UTC")[0].reviewId,
    null,
  );
});

test("checklist, frame, and letter stay free of payment and mail", () => {
  const files = [
    "src/components/onboarding-card.tsx",
    "src/components/soft-letter-card.tsx",
    "src/components/soft-letter-recall.tsx",
    "src/components/soft-letter-archive.tsx",
    "src/app/api/soft-letters/route.ts",
    "src/db/soft-letters.ts",
    "src/lib/seasonal-frame.ts",
    "src/lib/soft-letter.ts",
    "src/lib/onboarding-progress.ts",
  ];
  for (const file of files) {
    assert.doesNotMatch(read(file), /stripe|RESEND|SMTP|nodemailer/i);
  }

  const card = read("src/components/onboarding-card.tsx");
  assert.match(card, /VISIBLE_PATHS/);
  assert.match(card, /timezoneTitle/);
  assert.match(card, /softboring-onboarding-dismissed/);
  assert.match(card, /softboring-onboarding-progress/);
  assert.match(card, /nicknameTitle/);
  assert.match(card, /inviteTitle/);
  assert.match(card, /data-onboarding/);

  const wall = read("src/components/wall-board.tsx");
  assert.match(wall, /data-season-frame/);
  assert.match(wall, /seasonFrameForDate/);
  assert.match(wall, /seasonalFrame/);
  assert.match(wall, /SEASONAL_FRAME_STORAGE_KEY/);

  const api = read("src/app/api/soft-letters/route.ts");
  assert.match(api, /userIsSoftPlus/);
  assert.match(api, /soft_plus_required/);
  assert.match(api, /status: 403/);
  assert.match(read("src/db/user-settings.ts"), /nextOnboardingTimezoneSet/);
  assert.match(read("src/db/soft-letters.ts"), /saveCurrentSoftLetter/);
  assert.match(read("src/app/[locale]/history/page.tsx"), /SoftLetterArchive/);
  assert.match(read("src/app/[locale]/year/page.tsx"), /listSoftLettersForYear/);
  assert.match(read("src/components/history-detail.tsx"), /SoftLetterRecall/);

  const schema = read("scripts/schema.sql");
  const migrate = read("src/db/migrate.ts");
  const cli = read("scripts/migrate.mjs");
  assert.match(schema, /onboarding_timezone_set/);
  assert.match(schema, /seasonal_frame/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS soft_letters/);
  assert.match(migrate, /ensureSoftLetters/);
  assert.match(migrate, /onboarding_timezone_set/);
  assert.match(cli, /soft_letters/);
  assert.match(cli, /seasonal_frame/);

  assert.match(read("src/i18n/routing.ts"), /locales: \["en", "zh-tw", "ja"\]/);

  const keys = [
    ["Onboarding", "timezoneTitle"],
    ["Onboarding", "progress"],
    ["Account", "seasonalFrameToggle"],
    ["Wall", "seasonalFrame"],
    ["Wall", "season_year_end"],
    ["Year", "lettersTitle"],
    ["SoftLetter", "title"],
    ["SoftLetter", "privacy"],
    ["SoftLetter", "archiveTitle"],
  ];
  for (const locale of ["messages/en.json", "messages/zh-tw.json", "messages/ja.json"]) {
    const messages = readJson(locale);
    for (const [group, key] of keys) {
      assert.equal(typeof messages[group][key], "string", `${locale} ${group}.${key}`);
      assert.ok(messages[group][key].length > 0);
    }
  }

  const css = read("src/app/globals.css");
  assert.match(css, /\.season-frame--spring/);
  assert.match(css, /\.season-frame--rain/);
  assert.match(css, /\.season-frame--autumn/);
  assert.match(css, /\.season-frame--year-end/);
});
