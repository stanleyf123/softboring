import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const { filterNotesBySoftSearch, noteMatchesSoftSearch, normalizeSoftSearch } = await import(
  "../src/lib/wall-soft-search.ts"
);
const {
  FREE_RAISED_PIN_LIMIT,
  SOFT_PLUS_RAISED_PIN_LIMIT,
  raisedPinLimit,
  shareWindowLimit,
  softPlusPinWindowIsHigher,
} = await import("../src/lib/wall-pin-limit.ts");
const { softDeskSize } = await import("../src/lib/soft-desk-size.ts");
const { FREE_HISTORY_LIMIT } = await import("../src/lib/plan.ts");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

test("guest soft search matches nickname and open words only", () => {
  const notes = [
    { id: "a", ownerNickname: "Peach", excerpt: "" },
    { id: "b", ownerNickname: "  ", excerpt: "a quiet tea" },
    { id: "c", ownerNickname: "Momo", summary: "rain on the window" },
    { id: "d", ownerNickname: null },
  ];
  assert.equal(normalizeSoftSearch("  Peach  "), "peach");
  assert.equal(noteMatchesSoftSearch(notes[0], "peach"), true);
  assert.equal(noteMatchesSoftSearch(notes[0], "tea"), false);
  assert.deepEqual(
    filterNotesBySoftSearch(notes, "tea").map((note) => note.id),
    ["b"],
  );
  assert.deepEqual(
    filterNotesBySoftSearch(notes, "RAIN").map((note) => note.id),
    ["c"],
  );
  assert.equal(filterNotesBySoftSearch(notes, "   ").length, notes.length);
  assert.equal(filterNotesBySoftSearch(notes, "missing").length, 0);
  const teaser = { id: "t", ownerNickname: "小桃" };
  assert.equal("summary" in teaser, false);
  assert.equal(noteMatchesSoftSearch(teaser, "小桃"), true);
  assert.equal(noteMatchesSoftSearch(teaser, "secret week"), false);
});

test("guest search stays on the locked wall and does not open Soft+ filters", () => {
  const board = read("src/components/wall-board.tsx");
  const notesRoute = read("src/app/api/wall/notes/route.ts");
  const canvas = read("src/lib/wall-canvas.ts");
  assert.match(board, /data-wall-guest-search/);
  assert.match(board, /filterNotesBySoftSearch/);
  assert.match(board, /locked && notes\.length > 0/);
  assert.match(board, /softPlus && !locked/);
  assert.match(board, /filterTitle/);
  assert.match(notesRoute, /toTeaserNote/);
  assert.match(canvas, /function toTeaserNote/);
  assert.doesNotMatch(read("src/lib/wall-soft-search.ts"), /getDb|stripe|resend|smtp/i);
  assert.doesNotMatch(board, /guestSearch[\s\S]{0,400}summary:/);
});

test("desk size is a non-negative snapshot of reviews and wall notes", () => {
  assert.deepEqual(softDeskSize(4, 2), { reviews: 4, notes: 2 });
  assert.deepEqual(softDeskSize(-3, Number.NaN), { reviews: 0, notes: 0 });
  assert.deepEqual(softDeskSize(3.8, 1.2), { reviews: 3, notes: 1 });
  const account = read("src/app/[locale]/account/page.tsx");
  const panel = read("src/components/account-panel.tsx");
  const wallDb = read("src/db/wall.ts");
  assert.match(account, /countWallNotesForUser/);
  assert.match(account, /wallNoteCount=/);
  assert.match(panel, /data-soft-data-size/);
  assert.match(panel, /dataSizeTitle/);
  assert.match(panel, /softDeskSize/);
  assert.match(wallDb, /function countWallNotesForUser/);
  assert.match(wallDb, /WHERE user_id = \?/);
  assert.doesNotMatch(panel, /stripe\.checkout|resend|nodemailer/i);
});

test("Soft+ pin window is wider than free, and the raised note stays at one", () => {
  assert.equal(FREE_HISTORY_LIMIT, 4);
  assert.equal(shareWindowLimit(false), FREE_HISTORY_LIMIT);
  assert.equal(shareWindowLimit(true), null);
  assert.equal(raisedPinLimit(false), FREE_RAISED_PIN_LIMIT);
  assert.equal(raisedPinLimit(true), SOFT_PLUS_RAISED_PIN_LIMIT);
  assert.equal(SOFT_PLUS_RAISED_PIN_LIMIT, 1);
  assert.equal(FREE_RAISED_PIN_LIMIT, 0);
  assert.equal(softPlusPinWindowIsHigher(), true);
  const share = read("src/components/share-to-wall.tsx");
  const board = read("src/components/wall-board.tsx");
  const wallDb = read("src/db/wall.ts");
  assert.match(share, /data-wall-pin-limit=\{softPlus \? "plus" : "free"\}/);
  assert.match(share, /sharePinLimitPlus/);
  assert.match(share, /sharePinLimitFree/);
  assert.match(share, /SOFT_PLUS_RAISED_PIN_LIMIT/);
  assert.match(board, /pinRaisedHint/);
  assert.match(wallDb, /SET pinned = 0/);
  assert.doesNotMatch(share, /stripe|RESEND|SMTP/i);
});

test("search, size, and pin copy exist in en, zh-tw, and ja", () => {
  const keys = [
    "guestSearchTitle",
    "guestSearchLead",
    "guestSearchLabel",
    "guestSearchPlaceholder",
    "guestSearchResult",
    "guestSearchClear",
    "guestSearchEmptyTitle",
    "guestSearchEmpty",
    "sharePinLimitFree",
    "sharePinLimitPlus",
    "pinRaisedHint",
  ];
  for (const locale of ["messages/en.json", "messages/zh-tw.json", "messages/ja.json"]) {
    const messages = readJson(locale);
    for (const key of keys) {
      assert.equal(typeof messages.Wall[key], "string");
      assert.ok(messages.Wall[key].length > 0);
    }
    assert.equal(typeof messages.Account.dataSizeTitle, "string");
    assert.equal(typeof messages.Account.dataSizeBody, "string");
    assert.match(messages.Account.dataSizeBody, /\{reviews\}|\{reviews,/);
    assert.match(messages.Account.dataSizeBody, /\{notes\}|\{notes,/);
    assert.match(messages.Wall.sharePinLimitFree, /\{weeks\}/);
    assert.match(messages.Wall.sharePinLimitPlus, /\{raised\}/);
    assert.doesNotMatch(messages.Wall.guestSearchLead, /zh-TW/);
    assert.doesNotMatch(messages.Wall.sharePinLimitFree, /stripe|SMTP|Resend/i);
  }
  assert.match(readJson("messages/zh-tw.json").Wall.guestSearchTitle, /鄰居/);
  assert.match(readJson("messages/ja.json").Account.dataSizeTitle, /大きさ/);
  assert.match(readJson("messages/en.json").Account.dataSizeBody, /nothing is emailed/i);
});
