import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import Database from "better-sqlite3";
import {
  ensureSoftGratitudes,
  ensureUserSettingsColumns,
  migrateDb,
} from "../src/db/migrate.ts";
import {
  GRATITUDE_JAR_CAP,
  GRATITUDE_MAX,
  gratitudePickIndex,
  parseGratitudeBody,
} from "../src/lib/gratitude-jar.ts";
import {
  storedWallLargerText,
  WALL_NOTE_COPY_LARGER_REM,
  WALL_NOTE_COPY_REM,
} from "../src/lib/wall-text.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

test("gratitude lines stay one private sentence", () => {
  assert.equal(GRATITUDE_MAX, 140);
  assert.equal(GRATITUDE_JAR_CAP, 240);
  assert.equal(parseGratitudeBody("  warm tea  "), "warm tea");
  assert.equal(parseGratitudeBody("line\none"), "line one");
  assert.equal(parseGratitudeBody("   "), null);
  assert.equal(parseGratitudeBody(12), null);
  const long = "謝".repeat(180);
  assert.equal(Array.from(parseGratitudeBody(long)).length, 140);
});

test("a random draw stays inside the jar", () => {
  assert.equal(gratitudePickIndex(0, 0.4), -1);
  assert.equal(gratitudePickIndex(3, 0), 0);
  assert.equal(gratitudePickIndex(3, 0.34), 1);
  assert.equal(gratitudePickIndex(3, 0.99), 2);
  assert.equal(gratitudePickIndex(3, 1.4), 2);
  assert.equal(gratitudePickIndex(3, Number.NaN), 0);
  assert.equal(gratitudePickIndex(2.5, 0.2), -1);
});

test("larger wall text is a small free step up", () => {
  assert.ok(WALL_NOTE_COPY_LARGER_REM > WALL_NOTE_COPY_REM);
  assert.ok(WALL_NOTE_COPY_LARGER_REM - WALL_NOTE_COPY_REM < 0.25);
  assert.equal(storedWallLargerText(true), true);
  assert.equal(storedWallLargerText(1), true);
  assert.equal(storedWallLargerText("1"), true);
  assert.equal(storedWallLargerText(false), false);
  assert.equal(storedWallLargerText(0), false);
  assert.equal(storedWallLargerText("0"), false);
});

test("old desks gain larger text and a private gratitude table", () => {
  const memory = new Database(":memory:");
  memory.exec(`CREATE TABLE user_settings (user_id TEXT PRIMARY KEY)`);
  ensureUserSettingsColumns(memory);
  const names = memory
    .prepare(`PRAGMA table_info(user_settings)`)
    .all()
    .map((col) => col.name);
  assert.ok(names.includes("wall_larger_text"));
  ensureSoftGratitudes(memory);
  ensureSoftGratitudes(memory);
  const table = memory
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'soft_gratitudes'`)
    .get();
  assert.equal(table.name, "soft_gratitudes");
  memory.close();

  const dir = mkdtempSync(join(tmpdir(), "softboring-jar-"));
  const db = new Database(join(dir, "test.sqlite"));
  db.pragma("foreign_keys = ON");
  migrateDb(db);
  const fresh = db.prepare(`PRAGMA table_info(user_settings)`).all().map((col) => col.name);
  assert.ok(fresh.includes("wall_larger_text"));
  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at) VALUES ('member', 'm@example.com', 'x', '2026-09-22T00:00:00.000Z')`,
  ).run();
  db.prepare(
    `INSERT INTO soft_gratitudes (id, user_id, body, created_at) VALUES ('g1', 'member', 'warm tea', '2026-09-22T00:00:00.000Z')`,
  ).run();
  db.prepare(`DELETE FROM users WHERE id = 'member'`).run();
  assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM soft_gratitudes`).get().n, 0);
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

test("home chip, wall text, and gratitude jar are wired without mail or payments", () => {
  const home = read("src/app/[locale]/page.tsx");
  const chip = read("src/components/intention-reminder-chip.tsx");
  const card = read("src/components/soft-intention-card.tsx");
  const wall = read("src/components/wall-board.tsx");
  const wallPage = read("src/app/[locale]/wall/page.tsx");
  const account = read("src/components/account-panel.tsx");
  const settings = read("src/app/api/account/settings/route.ts");
  const jarApi = read("src/app/api/gratitude-jar/route.ts");
  const jarDb = read("src/db/soft-gratitudes.ts");
  const schema = read("scripts/schema.sql");
  const migrate = read("src/db/migrate.ts");
  const cli = read("scripts/migrate.mjs");
  const css = read("src/app/globals.css");

  assert.match(schema, /wall_larger_text INTEGER NOT NULL DEFAULT 0/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS soft_gratitudes/);
  assert.match(migrate, /ensureSoftGratitudes/);
  assert.match(cli, /soft_gratitudes/);
  assert.match(cli, /wall_larger_text/);

  assert.match(home, /IntentionReminderChip/);
  assert.match(home, /getCurrentSoftIntention/);
  assert.match(home, /GratitudeJarCard/);
  assert.match(chip, /data-intention-chip/);
  assert.match(chip, /#soft-intention/);
  assert.match(card, /id="soft-intention"/);
  assert.doesNotMatch(chip, /sendMail|resend|stripe/i);

  assert.match(wall, /toggleWallLargerText/);
  assert.match(wall, /data-wall-larger-text-toggle/);
  assert.match(wall, /wall-note-copy/);
  assert.match(wall, /wall-larger-text/);
  assert.match(wall, /WALL_LARGER_TEXT_STORAGE_KEY/);
  assert.match(wallPage, /initialWallLargerText/);
  assert.match(account, /data-wall-larger-text-preference/);
  assert.match(account, /wallLargerText/);
  assert.match(settings, /wallLargerText/);
  assert.match(settings, /invalid_wall_text/);
  assert.match(css, /\.wall-larger-text \.wall-note-copy/);
  assert.match(settings, /customNoteColor !== undefined && !userIsSoftPlus\(user\)/);
  assert.doesNotMatch(settings, /wallLargerText !== undefined && !userIsSoftPlus/);

  assert.match(jarApi, /soft_plus_required/);
  assert.match(jarApi, /auth_required/);
  assert.match(jarApi, /userIsSoftPlus/);
  assert.match(jarApi, /pickRandomGratitude/);
  assert.match(jarDb, /DELETE FROM soft_gratitudes WHERE id = \? AND user_id = \?/);
  assert.match(read("src/components/gratitude-jar-card.tsx"), /data-gratitude-jar="tease"/);
  assert.match(read("src/components/gratitude-jar-card.tsx"), /data-gratitude-jar="open"/);
  assert.match(read("src/components/gratitude-jar-card.tsx"), /\/pricing/);
  assert.doesNotMatch(jarApi, /sendMail|resend|stripe|nodemailer/i);
  assert.doesNotMatch(jarDb, /sendMail|resend|stripe/i);
});

test("intention chip, larger text, and gratitude copy exist in en / zh-tw / ja", () => {
  const en = readJson("messages/en.json");
  const zh = readJson("messages/zh-tw.json");
  const ja = readJson("messages/ja.json");

  for (const messages of [en, zh, ja]) {
    assert.equal(typeof messages.IntentionChip.kicker, "string");
    assert.equal(typeof messages.IntentionChip.aria, "string");
    assert.equal(typeof messages.Wall.largerText, "string");
    assert.equal(typeof messages.Wall.largerTextHint, "string");
    assert.equal(typeof messages.Account.largerTextTitle, "string");
    assert.equal(typeof messages.Account.largerTextToggle, "string");
    assert.equal(typeof messages.GratitudeJar.title, "string");
    assert.equal(typeof messages.GratitudeJar.lockedBody, "string");
    assert.equal(typeof messages.GratitudeJar.privacy, "string");
    assert.equal(typeof messages.GratitudeJar.draw, "string");
    assert.match(messages.GratitudeJar.privacy, /mail|信|メール/i);
  }

  assert.notEqual(en.IntentionChip.kicker, zh.IntentionChip.kicker);
  assert.notEqual(en.IntentionChip.kicker, ja.IntentionChip.kicker);
  assert.equal(zh.GratitudeJar.title, "感謝罐");
  assert.equal(ja.GratitudeJar.title, "感謝の瓶");
  assert.equal(zh.Wall.largerText, "便利貼字再大一點");
});
