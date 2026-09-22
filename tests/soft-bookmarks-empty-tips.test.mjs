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

const SOFT_TIP_IDS = [
  "tipPause",
  "tipOneSentence",
  "tipFeeling",
  "tipWallSave",
  "tipNoScore",
  "tipTea",
  "tipSkip",
  "tipNeighbor",
];

function softTipIdForDate(date = new Date()) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const day = Math.floor((date.getTime() - start) / 86_400_000);
  const index = ((day % SOFT_TIP_IDS.length) + SOFT_TIP_IDS.length) % SOFT_TIP_IDS.length;
  return SOFT_TIP_IDS[index];
}

test("wall note bookmarks are Soft+ private and listed at /wall/saved", () => {
  const schema = read("scripts/schema.sql");
  const migrate = read("src/db/migrate.ts");
  const db = read("src/db/wall-bookmarks.ts");
  const listApi = read("src/app/api/wall/bookmarks/route.ts");
  const toggleApi = read("src/app/api/wall/notes/[id]/bookmark/route.ts");
  const notesApi = read("src/app/api/wall/notes/route.ts");
  const noteApi = read("src/app/api/wall/notes/[id]/route.ts");
  const board = read("src/components/wall-board.tsx");
  const savedPanel = read("src/components/wall-saved-panel.tsx");
  const savedPage = read("src/app/[locale]/wall/saved/page.tsx");
  const account = read("src/components/account-panel.tsx");

  assert.match(schema, /CREATE TABLE IF NOT EXISTS wall_note_bookmarks/);
  assert.match(schema, /PRIMARY KEY \(user_id, note_id\)/);
  assert.match(migrate, /ensureWallNoteBookmarks/);
  assert.match(db, /toggleWallNoteBookmark/);
  assert.match(db, /listBookmarkedWallNotes/);
  assert.match(db, /withBookmarkFlag/);
  assert.match(listApi, /requireSoftPlus/);
  assert.match(listApi, /listBookmarkedWallNotes/);
  assert.match(toggleApi, /requireSoftPlus/);
  assert.match(toggleApi, /toggleWallNoteBookmark/);
  assert.match(notesApi, /withBookmarkFlag/);
  assert.match(noteApi, /attachBookmarkToDetail/);
  assert.match(board, /toggleBookmark/);
  assert.match(board, /\/wall\/saved/);
  assert.match(board, /savedLink/);
  assert.match(savedPanel, /\/api\/wall\/bookmarks/);
  assert.match(savedPage, /WallSavedPanel/);
  assert.match(savedPage, /isSoftPlusPlan/);
  assert.match(account, /savedWall/);
  assert.match(account, /\/wall\/saved/);
  assert.doesNotMatch(db, /stripe|RESEND|SMTP/i);
});

test("soft tip rotation is stable for a UTC day", () => {
  const a = softTipIdForDate(new Date(Date.UTC(2026, 8, 22)));
  const b = softTipIdForDate(new Date(Date.UTC(2026, 8, 22, 23, 59)));
  const c = softTipIdForDate(new Date(Date.UTC(2026, 8, 23)));
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.ok(SOFT_TIP_IDS.includes(a));
});

test("empty states share SoftShapesEmpty illustrations", () => {
  const empty = read("src/components/empty-state.tsx");
  const doodles = read("src/components/soft-doodles.tsx");
  const history = read("src/components/history-list.tsx");
  const digest = read("src/components/digest-panel.tsx");
  const year = read("src/components/year-panel.tsx");
  const saved = read("src/components/wall-saved-panel.tsx");

  assert.match(doodles, /SoftShapesEmpty/);
  assert.match(doodles, /HistoryEmptyDoodle/);
  assert.match(doodles, /DigestEmptyDoodle/);
  assert.match(doodles, /YearEmptyDoodle/);
  assert.match(doodles, /SavedEmptyDoodle/);
  assert.match(empty, /SoftShapesEmpty/);
  assert.match(empty, /illustration/);
  assert.match(history, /illustration="history"/);
  assert.match(digest, /illustration="digest"/);
  assert.match(year, /illustration="year"/);
  assert.match(saved, /illustration="saved"/);
});

test("Soft inbox has unread and soft tips filters; Soft+ tips card on account", () => {
  const bell = read("src/components/notification-bell.tsx");
  const tips = read("src/components/soft-tips-card.tsx");
  const lib = read("src/lib/soft-tips.ts");
  const account = read("src/components/account-panel.tsx");

  assert.match(lib, /SOFT_TIP_IDS/);
  assert.match(lib, /softTipIdForDate/);
  assert.match(bell, /filterUnread/);
  assert.match(bell, /filterTips/);
  assert.match(bell, /SoftTipsList/);
  assert.match(tips, /SoftTipsCard/);
  assert.match(account, /SoftTipsCard/);
});

test("bookmark / empty / tips copy exists in en, zh-tw, and ja", () => {
  for (const locale of ["en", "zh-tw", "ja"]) {
    const messages = readJson(`messages/${locale}.json`);
    assert.equal(typeof messages.Metadata.wallSavedTitle, "string");
    assert.equal(typeof messages.Wall.savedLink, "string");
    assert.equal(typeof messages.Wall.save, "string");
    assert.equal(typeof messages.Wall.unsave, "string");
    assert.equal(typeof messages.Account.savedWall, "string");
    assert.equal(typeof messages.Notifications.filterUnread, "string");
    assert.equal(typeof messages.Notifications.filterTips, "string");
    assert.equal(typeof messages.WallSaved.emptyTitle, "string");
    assert.equal(typeof messages.SoftTips.tipPause, "string");
    for (const id of SOFT_TIP_IDS) {
      assert.equal(typeof messages.SoftTips[id], "string");
    }
  }
});

test("intentions, wall a11y, postcard, compare, and year wiring still present", () => {
  const intention = read("src/components/soft-intention-card.tsx");
  const board = read("src/components/wall-board.tsx");
  const postcard = read("src/components/soft-postcard-button.tsx");
  const compare = read("src/components/history-compare.tsx");
  const year = read("src/components/year-panel.tsx");

  assert.match(intention, /LastIntentionNudge|SoftIntentionCard/);
  assert.match(board, /Escape|keydown|onKeyDown|key === \"Escape\"|key===\"Escape\"/);
  assert.match(board, /focus-visible:outline/);
  assert.match(postcard, /SoftPostcard|postcard/i);
  assert.match(compare, /compare|HistoryCompare/i);
  assert.match(year, /SoftYearTimeline|feelingDotClass/);
});
