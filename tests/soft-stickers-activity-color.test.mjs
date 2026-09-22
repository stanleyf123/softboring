import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import Database from "better-sqlite3";
import { ensureExpandedStickers, ensureUserSettingsColumns } from "../src/db/migrate.ts";
import {
  clampActivityLimit,
  rowsToSoftActivity,
  SOFT_ACTIVITY_LIMIT,
  SOFT_ACTIVITY_SQL,
} from "../src/lib/soft-activity.ts";
import {
  EXPANDED_STICKERS,
  WALL_STICKER_SLUGS,
} from "../src/lib/wall-stickers.ts";
import {
  PLUS_NOTE_COLORS,
  resolveShareNoteColor,
  toTeaserNote,
  WALL_COLORS,
} from "../src/lib/wall-canvas.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

test("expanded stickers stay in the public catalog and the same apply gate", () => {
  assert.equal(EXPANDED_STICKERS.length, 5);
  assert.deepEqual(
    EXPANDED_STICKERS.map((sticker) => sticker.slug),
    ["blossom", "leaf", "honey", "shell", "candle"],
  );
  for (const sticker of EXPANDED_STICKERS) {
    assert.ok(WALL_STICKER_SLUGS.includes(sticker.slug));
    assert.match(read("scripts/schema.sql"), new RegExp(`'${sticker.slug}'`));
    assert.match(read("scripts/migrate.mjs"), new RegExp(`'${sticker.slug}'`));
  }
  assert.match(read("src/db/migrate.ts"), /ensureExpandedStickers/);
  assert.match(read("src/app/api/wall/stickers/route.ts"), /listStickers/);
  assert.doesNotMatch(read("src/app/api/wall/stickers/route.ts"), /requireSoftPlus/);
  assert.match(read("src/app/api/wall/notes/[id]/stickers/route.ts"), /requireSoftPlus/);
  assert.match(read("src/components/wall-board.tsx"), /isWallStickerSlug/);
  assert.match(read("src/components/wall-board.tsx"), /note\.stickers/);

  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE stickers (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      stripe_price_id TEXT,
      emoji TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
  `);
  db.prepare(
    `INSERT INTO stickers (id, slug, name, price_cents, stripe_price_id, emoji, sort_order)
     VALUES ('sticker-star', 'star', 'Star', 99, NULL, '⭐', 1)`,
  ).run();
  ensureExpandedStickers(db);
  const slugs = db
    .prepare(`SELECT slug FROM stickers ORDER BY sort_order ASC`)
    .all()
    .map((row) => row.slug);
  assert.deepEqual(slugs, ["star", "blossom", "leaf", "honey", "shell", "candle"]);
  ensureExpandedStickers(db);
  assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM stickers`).get().n, 6);
  db.close();

  for (const locale of ["messages/en.json", "messages/zh-tw.json", "messages/ja.json"]) {
    const stickers = readJson(locale).WallStickers;
    for (const slug of WALL_STICKER_SLUGS) {
      assert.equal(typeof stickers[slug], "string");
      assert.ok(stickers[slug].length > 0);
    }
  }
  assert.equal(readJson("messages/zh-tw.json").WallStickers.blossom, "小花");
  assert.equal(readJson("messages/ja.json").WallStickers.honey, "はちみつ");
});

test("soft activity is a signed-in read of own reviews, pins, and thanks", () => {
  assert.equal(SOFT_ACTIVITY_LIMIT, 24);
  assert.equal(clampActivityLimit("nope"), 24);
  assert.equal(clampActivityLimit(0), 1);
  assert.equal(clampActivityLimit(80), 40);

  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE reviews (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      summary TEXT,
      email TEXT,
      created_at TEXT
    );
    CREATE TABLE wall_notes (
      id TEXT PRIMARY KEY,
      review_id TEXT,
      user_id TEXT,
      hidden INTEGER,
      created_at TEXT
    );
    CREATE TABLE wall_note_thanks (
      user_id TEXT,
      note_id TEXT,
      created_at TEXT
    );
  `);
  db.prepare(
    `INSERT INTO reviews (id, user_id, summary, email, created_at) VALUES (?, ?, ?, ?, ?)`,
  ).run("rev-me", "me", "tea on the desk", "secret@example.com", "2026-09-20T01:00:00.000Z");
  db.prepare(
    `INSERT INTO reviews (id, user_id, summary, email, created_at) VALUES (?, ?, ?, ?, ?)`,
  ).run("rev-other", "other", "not mine", "other@example.com", "2026-09-22T01:00:00.000Z");
  db.prepare(
    `INSERT INTO wall_notes (id, review_id, user_id, hidden, created_at) VALUES (?, ?, ?, ?, ?)`,
  ).run("note-me", "rev-me", "me", 0, "2026-09-21T01:00:00.000Z");
  db.prepare(
    `INSERT INTO wall_notes (id, review_id, user_id, hidden, created_at) VALUES (?, ?, ?, ?, ?)`,
  ).run("note-hidden", "rev-me", "me", 1, "2026-09-19T01:00:00.000Z");
  db.prepare(
    `INSERT INTO wall_notes (id, review_id, user_id, hidden, created_at) VALUES (?, ?, ?, ?, ?)`,
  ).run("note-other", "rev-other", "other", 0, "2026-09-21T02:00:00.000Z");
  db.prepare(
    `INSERT INTO wall_note_thanks (user_id, note_id, created_at) VALUES (?, ?, ?)`,
  ).run("me", "note-other", "2026-09-22T03:00:00.000Z");
  db.prepare(
    `INSERT INTO wall_note_thanks (user_id, note_id, created_at) VALUES (?, ?, ?)`,
  ).run("me", "missing-note", "2026-09-18T03:00:00.000Z");

  const rows = db.prepare(SOFT_ACTIVITY_SQL).all("me", "me", "me", 24);
  const items = rowsToSoftActivity(rows);
  assert.deepEqual(
    items.map((item) => item.kind),
    ["thanks", "pin", "review", "pin", "thanks"],
  );
  assert.equal(items[0].href, "/wall?note=note-other");
  assert.equal(items[1].excerpt, "tea on the desk");
  assert.equal(items[1].href, "/wall?note=note-me");
  assert.equal(items[2].href, "/history/rev-me");
  assert.equal(items[3].href, "/history/rev-me");
  assert.equal(items[4].href, "/wall");
  assert.equal(JSON.stringify(items).includes("secret@"), false);
  assert.equal(JSON.stringify(items).includes("not mine"), false);
  assert.equal(JSON.stringify(items).includes("other@"), false);
  db.close();

  const page = read("src/app/[locale]/account/activity/page.tsx");
  const api = read("src/app/api/account/activity/route.ts");
  const timeline = read("src/components/soft-activity-timeline.tsx");
  assert.match(page, /listOwnSoftActivity\(user\.id\)/);
  assert.match(page, /SoftActivityExport/);
  assert.doesNotMatch(page, /if\s*\(\s*softPlus\s*\)/);
  assert.match(api, /getCurrentUser/);
  assert.doesNotMatch(api, /requireSoftPlus/);
  assert.match(read("src/app/api/account/activity/export/route.ts"), /requireSoftPlus/);
  assert.match(read("src/components/account-panel.tsx"), /\/account\/activity/);
  assert.match(timeline, /emptyTitle/);
  assert.doesNotMatch(timeline, /softPlus/);
  assert.doesNotMatch(page, /stripe|RESEND|SMTP/i);

  for (const locale of ["messages/en.json", "messages/zh-tw.json", "messages/ja.json"]) {
    const copy = readJson(locale).SoftActivity;
    for (const key of ["title", "lead", "emptyTitle", "emptyBody", "kind_review", "kind_pin", "kind_thanks"]) {
      assert.equal(typeof copy[key], "string");
      assert.ok(copy[key].length > 0);
    }
  }
  assert.equal(readJson("messages/zh-tw.json").SoftActivity.title, "柔軟足跡");
  assert.match(readJson("messages/ja.json").SoftActivity.lead, /メールは送りません/);
});

test("Soft+ personal note color sits beyond the shared palette", () => {
  assert.deepEqual(WALL_COLORS, ["peach", "blush", "mint", "cream", "lemon", "sky"]);
  assert.deepEqual(PLUS_NOTE_COLORS, ["lilac", "rose", "fern", "apricot"]);
  for (const color of PLUS_NOTE_COLORS) {
    assert.equal(WALL_COLORS.includes(color), false);
  }

  assert.equal(
    resolveShareNoteColor({
      requested: "lilac",
      softPlus: true,
      preferredWallColor: "mint",
      customNoteColor: null,
      index: 0,
    }),
    "lilac",
  );
  assert.equal(
    resolveShareNoteColor({
      requested: "peach",
      softPlus: true,
      preferredWallColor: "mint",
      customNoteColor: "rose",
      index: 1,
    }),
    "peach",
  );
  assert.equal(
    resolveShareNoteColor({
      requested: null,
      softPlus: true,
      preferredWallColor: "sky",
      customNoteColor: "fern",
      index: 2,
    }),
    "fern",
  );
  assert.equal(
    resolveShareNoteColor({
      requested: null,
      softPlus: true,
      preferredWallColor: "sky",
      customNoteColor: null,
      index: 2,
    }),
    "sky",
  );
  assert.equal(
    resolveShareNoteColor({
      requested: "lilac",
      softPlus: false,
      preferredWallColor: "mint",
      customNoteColor: "rose",
      index: 1,
    }),
    "blush",
  );
  assert.equal(
    resolveShareNoteColor({
      requested: "cream",
      softPlus: false,
      preferredWallColor: null,
      customNoteColor: "apricot",
      index: 4,
    }),
    "cream",
  );
  assert.equal(
    resolveShareNoteColor({
      requested: "nope",
      softPlus: false,
      preferredWallColor: "lemon",
      customNoteColor: "lilac",
      index: 0,
    }),
    "peach",
  );

  const teaser = toTeaserNote({
    id: "note",
    x: 1,
    y: 2,
    z: 3,
    color: "lilac",
    praiseCount: 1,
    summary: "secret week",
    energy: "hidden",
    stickers: [{ stickerId: "sticker-blossom", slug: "blossom", emoji: "🌸", count: 2 }],
  });
  assert.equal(teaser.color, "lilac");
  assert.equal("summary" in teaser, false);
  assert.equal(teaser.stickers[0].emoji, "🌸");
  assert.equal(JSON.stringify(teaser).includes("secret"), false);

  const memory = new Database(":memory:");
  memory.exec(`CREATE TABLE user_settings (user_id TEXT PRIMARY KEY)`);
  ensureUserSettingsColumns(memory);
  const names = memory
    .prepare(`PRAGMA table_info(user_settings)`)
    .all()
    .map((col) => col.name);
  assert.ok(names.includes("custom_note_color"));
  assert.ok(names.includes("preferred_wall_color"));
  memory.close();

  assert.match(read("scripts/schema.sql"), /custom_note_color/);
  assert.match(read("src/db/migrate.ts"), /custom_note_color/);
  assert.match(read("scripts/migrate.mjs"), /custom_note_color/);
  assert.match(read("src/components/share-to-wall.tsx"), /PLUS_NOTE_COLORS/);
  assert.match(read("src/components/share-to-wall.tsx"), /customNoteColor/);
  assert.match(read("src/components/share-to-wall.tsx"), /WALL_COLORS/);
  assert.match(read("src/app/api/account/settings/route.ts"), /soft_plus_required/);
  assert.match(read("src/app/api/account/settings/route.ts"), /customNoteColor/);
  assert.match(read("src/app/api/wall/notes/route.ts"), /customNoteColor/);
  assert.match(read("src/app/globals.css"), /--lilac:/);
  assert.doesNotMatch(read("src/components/share-to-wall.tsx"), /stripe|RESEND|SMTP/i);

  for (const locale of ["messages/en.json", "messages/zh-tw.json", "messages/ja.json"]) {
    const wall = readJson(locale).Wall;
    assert.ok(wall.personalColorTitle);
    assert.ok(wall.personalColorHint);
    for (const color of PLUS_NOTE_COLORS) {
      assert.ok(wall[`color_${color}`]);
      assert.ok(wall[`palette_${color}`]);
      assert.doesNotMatch(wall[`palette_${color}`], /#|rgb|token/i);
    }
  }
  assert.match(readJson("messages/zh-tw.json").Wall.personalColorHint, /免費/);
  assert.match(readJson("messages/ja.json").Wall.personalColorHint, /無料/);
});
