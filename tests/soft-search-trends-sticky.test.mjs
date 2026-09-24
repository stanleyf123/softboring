import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

register("./alias-hook.mjs", import.meta.url);

const { wallNoteMatchesFilters } = await import("../src/lib/wall-filters.ts");
const { toTeaserNote } = await import("../src/lib/wall-canvas.ts");
const {
  stickyFeelingLabel,
  truncateStickyQuery,
  wallStickyFilterChips,
  WALL_FILTER_CHIP_WRAP,
  WALL_STICKY_QUERY_MAX,
} = await import("../src/lib/wall-filter-sticky.ts");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

const filtersOff = { query: "", feelingMin: null, feelingMax: null, hideDemo: false };

test("Soft+ search reads words already on the note, and teasers drop them", () => {
  const note = {
    ownerNickname: "Peach",
    excerpt: "a short week",
    summary: "tea",
    energy: "garden walk",
    drain: "late meetings",
    lessOf: "extra tabs",
    priorities: "one quiet hour",
  };
  assert.equal(wallNoteMatchesFilters(note, { ...filtersOff, query: "garden" }), true);
  assert.equal(wallNoteMatchesFilters(note, { ...filtersOff, query: "meetings" }), true);
  assert.equal(wallNoteMatchesFilters(note, { ...filtersOff, query: "tabs" }), true);
  assert.equal(wallNoteMatchesFilters(note, { ...filtersOff, query: "quiet hour" }), true);
  assert.equal(wallNoteMatchesFilters(note, { ...filtersOff, query: "peach" }), true);
  assert.equal(wallNoteMatchesFilters(note, { ...filtersOff, query: "missing word" }), false);
  assert.equal(
    wallNoteMatchesFilters(
      { excerpt: "hello", feeling: null },
      { ...filtersOff, query: "", feelingMin: 1, feelingMax: 5 },
    ),
    false,
  );
  assert.equal(
    wallNoteMatchesFilters(note, { ...filtersOff, query: `  ${"a".repeat(WALL_STICKY_QUERY_MAX + 40)}` }),
    false,
  );

  const teaser = toTeaserNote({
    id: "note-1",
    x: 1,
    y: 2,
    z: 3,
    color: "peach",
    praiseCount: 0,
    ownerNickname: "Peach",
    energy: "garden walk",
    drain: "late meetings",
    lessOf: "extra tabs",
    priorities: "one quiet hour",
    summary: "tea",
  });
  assert.equal("energy" in teaser, false);
  assert.equal("drain" in teaser, false);
  assert.equal("lessOf" in teaser, false);
  assert.equal("priorities" in teaser, false);
  assert.equal("summary" in teaser, false);
  assert.equal(JSON.stringify(teaser).includes("garden"), false);
  assert.equal(JSON.stringify(teaser).includes("meetings"), false);

  const wallDb = read("src/db/wall.ts");
  const route = read("src/app/api/wall/notes/route.ts");
  const filters = read("src/lib/wall-filters.ts");
  assert.match(wallDb, /lessOf: row\.less_of/);
  assert.match(wallDb, /priorities: row\.priorities/);
  assert.match(route, /toTeaserNote/);
  assert.match(filters, /normalizePlusSearch/);
  assert.match(filters, /PLUS_SEARCH_MAX = 80/);
  assert.match(filters, /lessOf/);
  assert.doesNotMatch(filters, /stripe|resend|nodemailer|sendMail/i);
});

test("trends empty is a cream card, not a bare error", () => {
  const panel = read("src/components/trends-panel.tsx");
  const doodle = read("src/components/soft-doodles.tsx");
  assert.match(panel, /illustration="trends"/);
  assert.match(panel, /emptyWhisper/);
  assert.match(panel, /EmptyState/);
  assert.match(doodle, /function TrendsEmptyDoodle/);
  assert.match(doodle, /case "trends"/);

  for (const locale of ["en", "zh-tw", "ja"]) {
    const trends = readJson(`messages/${locale}.json`).Trends;
    assert.equal(typeof trends.emptyWhisper, "string");
    assert.ok(trends.emptyWhisper.length > 4);
    assert.match(trends.empty, /一|最初|first|一度/);
    assert.doesNotMatch(trends.emptyWhisper, /error|錯誤|エラー/i);
  }
});

test("mobile wall filters wrap, and the sticky bar only lists active chips", () => {
  assert.equal(truncateStickyQuery("  tea   week  "), "tea week");
  assert.equal(truncateStickyQuery(""), "");
  const long = "a".repeat(WALL_STICKY_QUERY_MAX + 8);
  assert.equal(truncateStickyQuery(long).endsWith("…"), true);
  assert.ok(truncateStickyQuery(long).length <= WALL_STICKY_QUERY_MAX + 1);
  assert.equal(stickyFeelingLabel(null, null), "");
  assert.equal(stickyFeelingLabel(2, null), "2–·");
  assert.equal(stickyFeelingLabel(null, 4), "·–4");
  assert.equal(stickyFeelingLabel(2, 4), "2–4");

  assert.deepEqual(
    wallStickyFilterChips({
      weekChip: "all",
      weekLabel: "All weeks",
      query: "",
      feelingMin: null,
      feelingMax: null,
      feelingLabel: "",
      hideDemo: false,
      demoLabel: "Hide demo notes",
    }),
    [],
  );
  assert.deepEqual(
    wallStickyFilterChips({
      weekChip: "this-week",
      weekLabel: "This week",
      query: "  garden walk  ",
      feelingMin: 2,
      feelingMax: 4,
      feelingLabel: "2–4",
      hideDemo: true,
      demoLabel: "Hide demo notes",
    }).map((chip) => chip.id),
    ["week", "query", "feeling", "demo"],
  );

  const board = read("src/components/wall-board.tsx");
  const sticky = read("src/components/wall-filter-sticky.tsx");
  assert.match(board, /WALL_FILTER_CHIP_WRAP/);
  assert.match(board, /data-wall-filter-wrap/);
  assert.match(board, /data-wall-search-scope/);
  assert.match(board, /WallFilterSticky/);
  assert.match(sticky, /data-wall-filter-sticky/);
  assert.match(read("src/lib/wall-filter-sticky.ts"), /sm:hidden/);
  assert.match(read("src/lib/wall-filter-sticky.ts"), /max-w-full/);
  assert.doesNotMatch(read("src/lib/wall-filter-sticky.ts"), /stripe|resend|nodemailer|zh-TW/);
});
