import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { register } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import Database from "better-sqlite3";

register("./alias-hook.mjs", import.meta.url);

const { WEEK_MOODS, WEEK_MOOD_SWATCH, WEEK_MOOD_TINT, isWeekMood, parseWeekMood } =
  await import("../src/lib/week-mood.ts");
const { WALL_COLORS } = await import("../src/lib/wall-canvas.ts");
const { startOfIsoWeek } = await import("../src/lib/timezone.ts");
const {
  quietDraftKey,
  parseQuietDraftStore,
  withQuietDraft,
  withoutQuietDraft,
  QUIET_DRAFT_STORAGE_KEY,
} = await import("../src/lib/quiet-drafts.ts");
const { NEIGHBOR_HIGHLIGHTS_SQL, toNeighborHighlight } = await import(
  "../src/lib/neighbor-highlights.ts"
);
const { migrateDb } = await import("../src/db/migrate.ts");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

test("week mood is a free soft palette and does not replace wall colors", () => {
  assert.deepEqual(WEEK_MOODS, ["peach", "mint", "blush", "cream", "lavender"]);
  assert.deepEqual(WALL_COLORS, ["peach", "blush", "mint", "cream", "lemon", "sky"]);
  assert.equal(isWeekMood("lavender"), true);
  assert.equal(isWeekMood("lemon"), false);
  assert.equal(parseWeekMood("  mint "), "mint");
  assert.equal(parseWeekMood("sky"), null);
  assert.equal(parseWeekMood(null), null);
  for (const mood of WEEK_MOODS) {
    assert.match(WEEK_MOOD_SWATCH[mood], /^bg-/);
    assert.match(WEEK_MOOD_TINT[mood], /^bg-/);
  }
  assert.match(read("src/app/globals.css"), /--lavender:\s*#e4d8f2/);
  assert.match(read("src/app/globals.css"), /--color-lavender:\s*var\(--lavender\)/);
});

test("mood patch source only accepts the soft palette", () => {
  const input = read("src/lib/review-input.ts");
  assert.match(input, /function asMood/);
  assert.match(input, /isWeekMood\(value\)/);
  assert.match(input, /export function parseMoodPatch/);
  assert.match(input, /Mood must be a soft color/);
  assert.match(input, /Expected a mood/);
  assert.equal(isWeekMood("lavender"), true);
  assert.equal(isWeekMood("sky"), false);
});

test("this ISO week starts Monday midnight in the member timezone", () => {
  const tuesday = new Date("2026-09-22T04:00:00.000Z");
  const taipei = startOfIsoWeek(tuesday, "Asia/Taipei");
  assert.equal(taipei.toISOString(), "2026-09-20T16:00:00.000Z");

  const sundayEvening = new Date("2026-09-20T10:00:00.000Z");
  const previous = startOfIsoWeek(sundayEvening, "Asia/Taipei");
  assert.equal(previous.toISOString(), "2026-09-13T16:00:00.000Z");

  assert.equal(startOfIsoWeek(tuesday, "Not/AZone").toISOString(), taipei.toISOString());
});

test("quiet drafts keep a new note and a reply in separate pockets", () => {
  assert.equal(QUIET_DRAFT_STORAGE_KEY, "softboring.wall.quiet-drafts.v1");
  assert.equal(quietDraftKey(" note-1 ", null), "note:note-1");
  assert.equal(quietDraftKey("note-1", "  comment-9 "), "reply:note-1:comment-9");
  assert.equal(quietDraftKey("  ", "x"), "");

  const savedAt = "2026-09-22T01:00:00.000Z";
  let store = withQuietDraft({}, "note:note-1", "  a gentle line  ", savedAt);
  store = withQuietDraft(store, "reply:note-1:comment-9", "still here", savedAt);
  store = withQuietDraft(store, "note:note-1", "   ", savedAt);
  assert.equal(store["note:note-1"], undefined);
  assert.equal(store["reply:note-1:comment-9"].body, "still here");

  const parsed = parseQuietDraftStore(
    JSON.stringify({
      "note:a": { body: "hello", savedAt },
      junk: { body: 12 },
      "reply:a:b": { body: "   ", savedAt },
    }),
  );
  assert.deepEqual(parsed, { "note:a": { body: "hello", savedAt } });
  assert.equal(parseQuietDraftStore("not-json")["note:a"], undefined);
  assert.deepEqual(withoutQuietDraft(parsed, "note:a"), {});
});

test("neighbor highlights count this week's thanks and prefer nicknames", () => {
  const dir = mkdtempSync(join(tmpdir(), "softboring-highlights-"));
  const db = new Database(join(dir, "test.sqlite"));
  db.pragma("foreign_keys = ON");
  db.exec(read("scripts/schema.sql"));

  const since = "2026-09-20T16:00:00.000Z";
  const earlier = "2026-09-20T15:59:59.000Z";
  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at, plan, nickname) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run("owner", "owner@example.com", "hash", since, "soft_plus", "Peach");
  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at, plan, nickname) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run("neighbor", "neighbor@example.com", "hash", since, "soft_plus", null);
  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at, plan, nickname) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run("fan", "fan@example.com", "hash", since, "free", null);
  db.prepare(
    `INSERT INTO reviews (id, guest_id, user_id, energy, drain, less_of, priorities, feeling, summary, mood, created_at)
     VALUES (?, ?, ?, ?, '', '', '', 4, ?, ?, ?)`,
  ).run("rev-a", "11111111-1111-4111-8111-111111111111", "owner", "tea", "a lavender week", "lavender", since);
  db.prepare(
    `INSERT INTO reviews (id, guest_id, user_id, energy, drain, less_of, priorities, feeling, summary, created_at)
     VALUES (?, ?, ?, ?, '', '', '', 3, ?, ?)`,
  ).run("rev-b", "22222222-2222-4222-8222-222222222222", "neighbor", "walk", "hidden week", since);
  db.prepare(
    `INSERT INTO wall_notes (id, review_id, user_id, x, y, z, color, hidden, created_at, updated_at)
     VALUES (?, ?, ?, 10, 10, 1, 'peach', 0, ?, ?)`,
  ).run("note-a", "rev-a", "owner", since, since);
  db.prepare(
    `INSERT INTO wall_notes (id, review_id, user_id, x, y, z, color, hidden, created_at, updated_at)
     VALUES (?, ?, ?, 20, 20, 1, 'mint', 1, ?, ?)`,
  ).run("note-b", "rev-b", "neighbor", since, since);

  db.prepare(
    `INSERT INTO wall_note_thanks (user_id, note_id, created_at) VALUES (?, ?, ?)`,
  ).run("neighbor", "note-a", since);
  db.prepare(
    `INSERT INTO wall_note_thanks (user_id, note_id, created_at) VALUES (?, ?, ?)`,
  ).run("fan", "note-a", "2026-09-22T01:00:00.000Z");
  db.prepare(
    `INSERT INTO wall_note_thanks (user_id, note_id, created_at) VALUES (?, ?, ?)`,
  ).run("owner", "note-a", earlier);
  db.prepare(
    `INSERT INTO wall_note_thanks (user_id, note_id, created_at) VALUES (?, ?, ?)`,
  ).run("fan", "note-b", since);

  const rows = db.prepare(NEIGHBOR_HIGHLIGHTS_SQL).all(since, 8);
  assert.equal(rows.length, 1);
  const highlight = toNeighborHighlight(rows[0]);
  assert.equal(highlight.noteId, "note-a");
  assert.equal(highlight.nickname, "Peach");
  assert.equal(highlight.thankCount, 2);
  assert.match(highlight.excerpt, /lavender week/);

  const emailOnly = toNeighborHighlight({
    note_id: "note-z",
    thank_count: 1,
    nickname: "  ",
    email: "neighbor@example.com",
    summary: "",
    energy: "window light",
  });
  assert.equal(emailOnly.nickname, "neighbor");
  assert.equal(emailOnly.excerpt, "window light");

  db.close();
  rmSync(dir, { recursive: true, force: true });
});

test("legacy reviews gain a nullable mood column", () => {
  const dir = mkdtempSync(join(tmpdir(), "softboring-mood-alter-"));
  const db = new Database(join(dir, "test.sqlite"));
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
  migrateDb(db);
  const cols = db.prepare(`PRAGMA table_info(reviews)`).all().map((col) => col.name);
  assert.ok(cols.includes("mood"));
  db.prepare(
    `INSERT INTO reviews (id, guest_id, summary, created_at) VALUES ('r', 'g', 'quiet', '2026-09-22T00:00:00.000Z')`,
  ).run();
  const row = db.prepare(`SELECT mood FROM reviews WHERE id = 'r'`).get();
  assert.equal(row.mood, null);
  db.close();
  rmSync(dir, { recursive: true, force: true });

  const schema = read("scripts/schema.sql");
  const migrate = read("src/db/migrate.ts");
  const cli = read("scripts/migrate.mjs");
  assert.match(schema, /mood TEXT/);
  assert.match(migrate, /ensureColumn\(db, "reviews", "mood", "TEXT"\)/);
  assert.match(cli, /ensureColumn\("reviews", "mood", "TEXT"\)/);
});

test("mood, quiet drafts, and thanks strip stay local and Soft+ gated", () => {
  const form = read("src/components/review-form.tsx");
  const detail = read("src/components/history-detail.tsx");
  const share = read("src/components/share-to-wall.tsx");
  const board = read("src/components/wall-board.tsx");
  const composer = read("src/components/quiet-wall-composer.tsx");
  const strip = read("src/components/neighbor-highlights-strip.tsx");
  const highlightsRoute = read("src/app/api/wall/highlights/route.ts");
  const reviewRoute = read("src/app/api/reviews/route.ts");
  const patchRoute = read("src/app/api/reviews/[id]/route.ts");
  const reviewsDb = read("src/db/reviews.ts");

  assert.match(form, /signedIn \? \([\s\S]*WeekMoodPicker/);
  assert.match(form, /WEEK_MOOD_TINT/);
  assert.match(form, /mood=\{draft\.mood && isWeekMood\(draft\.mood\) \? draft\.mood : null\}/);
  assert.match(detail, /WEEK_MOOD_TINT/);
  assert.match(detail, /WeekMoodPicker/);
  assert.match(detail, /method: "PATCH"/);
  assert.match(detail, /wall\?\.canShare/);
  assert.match(share, /WeekMoodChip/);
  assert.match(board, /QuietWallComposer/);
  assert.match(board, /NeighborHighlightsStrip/);
  assert.match(board, /softPlus && !locked/);
  assert.match(board, /WeekMoodChip/);
  assert.match(composer, /draftBanner/);
  assert.match(composer, /draftRestore/);
  assert.match(composer, /loadQuietDraft/);
  assert.match(composer, /saveQuietDraft/);
  assert.match(strip, /if \(!softPlus\) return null/);
  assert.match(strip, /\/api\/wall\/highlights/);
  assert.match(highlightsRoute, /requireSoftPlus/);
  assert.match(highlightsRoute, /startOfIsoWeek/);
  assert.match(reviewRoute, /answers\.mood = null/);
  assert.match(patchRoute, /parseMoodPatch/);
  assert.match(patchRoute, /isHistoryIndexUnlocked/);
  assert.match(reviewsDb, /mood/);
  assert.match(read("src/db/wall.ts"), /r\.mood AS review_mood/);

  const touched = [
    "src/lib/week-mood.ts",
    "src/lib/quiet-drafts.ts",
    "src/lib/neighbor-highlights.ts",
    "src/db/wall-highlights.ts",
    "src/app/api/wall/highlights/route.ts",
    "src/components/week-mood-picker.tsx",
    "src/components/quiet-wall-composer.tsx",
    "src/components/neighbor-highlights-strip.tsx",
    "src/app/api/reviews/route.ts",
    "src/app/api/reviews/[id]/route.ts",
  ];
  for (const path of touched) {
    const source = read(path);
    assert.doesNotMatch(source, /stripe|sendMail|nodemailer|resend/i, path);
  }
  assert.doesNotMatch(read("src/lib/stripe.ts"), /week-mood|quiet-draft|neighbor-highlight/);
  assert.doesNotMatch(read("src/lib/email.ts"), /week-mood|quiet-draft|neighbor-highlight/);

  assert.match(read("src/i18n/routing.ts"), /locales:\s*\["en", "zh-tw", "ja"\]/);
  const draftKeys = ["draftBanner", "draftRestore", "draftDismiss", "draftHint"];
  const moodKeys = [
    "title",
    "lead",
    "clear",
    "saved",
    "saveError",
    "shareHint",
    "name_lavender",
    "phrase_lavender",
  ];
  const highlightKeys = ["title", "lead", "empty", "count", "someone", "open", "listAria"];
  for (const locale of ["en", "zh-tw", "ja"]) {
    const messages = readJson(`messages/${locale}.json`);
    for (const key of draftKeys) assert.equal(messages.Wall[key].length > 0, true, `${locale} ${key}`);
    for (const key of moodKeys) {
      assert.equal(messages.WeekMood[key].length > 0, true, `${locale} WeekMood.${key}`);
    }
    for (const key of highlightKeys) {
      assert.equal(messages.NeighborHighlights[key].length > 0, true, `${locale} ${key}`);
    }
    assert.equal(messages.WeekMood.name_lavender.length > 0, true);
    assert.doesNotMatch(JSON.stringify(messages.WeekMood), /zh-TW/);
  }
  assert.equal(readJson("messages/zh-tw.json").NeighborHighlights.empty.includes("謝謝"), true);
  assert.equal(readJson("messages/zh-tw.json").WeekMood.name_lavender, "薰衣草");
});
