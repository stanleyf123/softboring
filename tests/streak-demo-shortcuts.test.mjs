import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

function wallNoteMatchesFilters(note, filters) {
  if (filters.hideDemo && note.ownerIsDemo) return false;
  const min = filters.feelingMin;
  const max = filters.feelingMax;
  if (min != null || max != null) {
    if (typeof note.feeling !== "number") return false;
    if (min != null && note.feeling < min) return false;
    if (max != null && note.feeling > max) return false;
  }
  const needle = filters.query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [note.ownerNickname, note.ownerFallback, note.excerpt, note.summary]
    .filter((value) => Boolean(value && String(value).trim()))
    .join("\n")
    .toLowerCase();
  return haystack.includes(needle);
}

test("CLI migrate.mjs keeps preferred_wall_color and wall_note_flags with runtime migrate", () => {
  const schema = read("scripts/schema.sql");
  const migrateTs = read("src/db/migrate.ts");
  const migrateMjs = read("scripts/migrate.mjs");

  assert.match(schema, /preferred_wall_color/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS wall_note_flags/);
  assert.match(migrateTs, /preferred_wall_color/);
  assert.match(migrateTs, /ensureWallNoteFlags/);
  assert.match(migrateMjs, /preferred_wall_color/);
  assert.match(migrateMjs, /wall_note_flags/);
  assert.match(migrateMjs, /idx_wall_note_flags_note/);
});

test("hide-demo Soft Wall filter matches is_demo notes", () => {
  const demo = {
    feeling: 3,
    ownerNickname: "小桃",
    excerpt: "demo tea",
    ownerIsDemo: true,
  };
  const human = {
    feeling: 3,
    ownerNickname: "Neighbor",
    excerpt: "real tea",
    ownerIsDemo: false,
  };
  const hide = {
    query: "",
    feelingMin: null,
    feelingMax: null,
    hideDemo: true,
  };
  assert.equal(wallNoteMatchesFilters(demo, hide), false);
  assert.equal(wallNoteMatchesFilters(human, hide), true);
  assert.equal(
    wallNoteMatchesFilters(demo, { ...hide, hideDemo: false }),
    true,
  );
});

test("streak celebration polish keeps soft copy, motion, and once-per-milestone", () => {
  const celebration = read("src/components/streak-celebration.tsx");
  const form = read("src/components/review-form.tsx");
  const css = read("src/app/globals.css");
  const en = readJson("messages/en.json");
  const zh = readJson("messages/zh-tw.json");
  const ja = readJson("messages/ja.json");

  assert.match(celebration, /soft-streak-card/);
  assert.match(celebration, /body_\$\{streak\}|body_2/);
  assert.match(celebration, /Escape/);
  assert.match(form, /softboring\.streak\.celebrated\.v1/);
  assert.match(form, /hasCelebrated/);
  assert.match(form, /markCelebrated/);
  assert.match(css, /@keyframes soft-streak-card/);
  assert.match(css, /prefers-reduced-motion/);

  for (const locale of [en, zh, ja]) {
    assert.ok(locale.Streak.body_2.length > 0);
    assert.ok(locale.Streak.body_4.length > 0);
    assert.ok(locale.Streak.body_8.length > 0);
    assert.ok(locale.Streak.body_12.length > 0);
  }
});

test("Soft Wall hide-demo filter and ownerIsDemo stay wired", () => {
  const filtersLib = read("src/lib/wall-filters.ts");
  const board = read("src/components/wall-board.tsx");
  const wallDb = read("src/db/wall.ts");
  const en = readJson("messages/en.json");

  assert.match(filtersLib, /hideDemo/);
  assert.match(filtersLib, /ownerIsDemo/);
  assert.match(filtersLib, /WALL_HIDE_DEMO_STORAGE_KEY/);
  assert.match(board, /filterHideDemo/);
  assert.match(board, /writeHideDemoPreference/);
  assert.match(board, /ownerIsDemo/);
  assert.match(wallDb, /owner_is_demo/);
  assert.match(wallDb, /ownerIsDemo/);
  assert.match(wallDb, /isDemoEmail/);
  assert.ok(en.Wall.filterHideDemo);
  assert.ok(en.Wall.filterHideDemoHint);
  assert.equal(readJson("messages/zh-tw.json").Wall.filterHideDemo.length > 0, true);
  assert.equal(readJson("messages/ja.json").Wall.filterHideDemoHint.length > 0, true);
});

test("soft shortcuts help covers wall/review Quiet Escape filters", () => {
  const help = read("src/components/soft-shortcuts-help.tsx");
  const layout = read("src/app/[locale]/layout.tsx");
  const en = readJson("messages/en.json");
  const zh = readJson("messages/zh-tw.json");
  const ja = readJson("messages/ja.json");

  assert.match(help, /SoftShortcutsHelp/);
  assert.match(help, /isHelpPath/);
  assert.match(help, /\/wall/);
  assert.match(help, /\/review/);
  assert.match(help, /Escape/);
  assert.match(help, /quiet/);
  assert.match(help, /filters/);
  assert.match(layout, /SoftShortcutsHelp/);
  assert.ok(en.Shortcuts.title);
  assert.ok(en.Shortcuts.quiet);
  assert.ok(en.Shortcuts.escape);
  assert.ok(en.Shortcuts.filters);
  assert.equal(zh.Shortcuts.close.length > 0, true);
  assert.equal(ja.Shortcuts.lead.length > 0, true);
});

test("memory quiet report paths stay present", () => {
  const memory = read("src/lib/soft-memory.ts");
  const quiet = read("src/lib/quiet-writing.ts");
  const flags = read("src/db/wall-flags.ts");
  assert.match(memory, /pickSoftMemory/);
  assert.match(quiet, /QUIET_WRITING_STORAGE_KEY/);
  assert.match(flags, /wall_note_flags/);
});
