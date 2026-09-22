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

function isoWeekKey(date) {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function isoWeekCount(year) {
  const key = isoWeekKey(new Date(Date.UTC(year, 11, 28)));
  const match = /^(\d{4})-W(\d{2})$/.exec(key);
  if (!match || Number(match[1]) !== year) return 52;
  return Number(match[2]);
}

function softYearFromReviews(reviews, year) {
  const byWeek = new Map();
  for (const review of reviews) {
    const date = new Date(review.createdAt);
    if (Number.isNaN(date.getTime())) continue;
    const weekKey = isoWeekKey(date);
    const match = /^(\d{4})-W(\d{2})$/.exec(weekKey);
    if (!match || Number(match[1]) !== year) continue;
    const week = Number(match[2]);
    const existing = byWeek.get(weekKey);
    const nextTime = date.getTime();
    const existingTime = existing?.createdAt
      ? new Date(existing.createdAt).getTime()
      : Number.NEGATIVE_INFINITY;
    if (!existing || nextTime >= existingTime) {
      byWeek.set(weekKey, {
        weekKey,
        week,
        reviewId: review.id,
        feeling: review.feeling,
        createdAt: review.createdAt,
      });
    }
  }
  const weeks = isoWeekCount(year);
  const cells = [];
  for (let week = 1; week <= weeks; week += 1) {
    const weekKey = `${year}-W${String(week).padStart(2, "0")}`;
    cells.push(
      byWeek.get(weekKey) ?? {
        weekKey,
        week,
        reviewId: null,
        feeling: null,
        createdAt: null,
      },
    );
  }
  const filled = cells.filter((cell) => cell.reviewId);
  return { year, cells, filledCount: filled.length };
}

test("soft year maps reviews onto ISO weeks and keeps newest per week", () => {
  const timeline = softYearFromReviews(
    [
      { id: "a", createdAt: "2026-01-07T12:00:00.000Z", feeling: 3 },
      { id: "b", createdAt: "2026-01-08T12:00:00.000Z", feeling: 5 },
      { id: "c", createdAt: "2025-12-01T12:00:00.000Z", feeling: 2 },
    ],
    2026,
  );
  assert.ok(timeline.cells.length >= 52);
  assert.equal(timeline.filledCount, 1);
  const filled = timeline.cells.find((cell) => cell.reviewId);
  assert.equal(filled.reviewId, "b");
  assert.equal(filled.feeling, 5);
});

test("soft year page is Soft+ gated with history click-through", () => {
  const page = read("src/app/[locale]/year/page.tsx");
  const panel = read("src/components/year-panel.tsx");
  const lib = read("src/lib/soft-year.ts");
  const header = read("src/components/site-header.tsx");

  assert.match(page, /YearPanel/);
  assert.match(page, /userIsSoftPlus/);
  assert.match(page, /lockedTitle/);
  assert.match(page, /path: "\/year"/);
  assert.match(panel, /\/history\/\$\{cell\.reviewId\}/);
  assert.match(panel, /feelingDotClass/);
  assert.match(lib, /softYearFromReviews/);
  assert.match(header, /href="\/year"/);
});

test("wall compliments feed is Soft+ gated and omits emails", () => {
  const api = read("src/app/api/wall/activity/route.ts");
  const db = read("src/db/wall-activity.ts");
  const strip = read("src/components/wall-activity-strip.tsx");
  const board = read("src/components/wall-board.tsx");
  const page = read("src/app/[locale]/wall/activity/page.tsx");

  assert.match(api, /requireSoftPlus/);
  assert.match(api, /listWallActivity/);
  assert.match(db, /allowEmailFallback: false/);
  assert.match(db, /wall_note_stickers/);
  assert.match(db, /wall_comments/);
  assert.match(db, /actorNickname/);
  assert.match(db, /actorFallback/);
  assert.doesNotMatch(db, /actorEmail:/);
  assert.match(strip, /WallActivity/);
  assert.match(board, /WallActivityStrip/);
  assert.match(board, /compact/);
  assert.match(page, /wall\/activity/);
  assert.match(page, /userIsSoftPlus/);
});

test("private mid-week soft note is signed-in only and stays off the wall", () => {
  const schema = read("scripts/schema.sql");
  const migrate = read("src/db/migrate.ts");
  const db = read("src/db/soft-notes.ts");
  const api = read("src/app/api/soft-notes/route.ts");
  const card = read("src/components/soft-note-card.tsx");
  const review = read("src/app/[locale]/review/page.tsx");

  assert.match(schema, /CREATE TABLE IF NOT EXISTS soft_notes/);
  assert.match(schema, /UNIQUE \(user_id, week_key\)/);
  assert.match(migrate, /ensureSoftNotes/);
  assert.match(db, /SOFT_NOTE_MAX/);
  assert.match(db, /saveCurrentSoftNote/);
  assert.match(api, /getCurrentUser/);
  assert.match(api, /auth_required/);
  assert.match(api, /PUT/);
  assert.match(card, /privacy/);
  assert.match(card, /\/api\/soft-notes/);
  assert.doesNotMatch(card, /share.*wall|ShareToWall/i);
  assert.match(review, /SoftNoteCard/);
});

test("soft year / activity / note copy exists in en / zh-tw / ja", () => {
  const en = readJson("messages/en.json");
  const zh = readJson("messages/zh-tw.json");
  const ja = readJson("messages/ja.json");

  for (const messages of [en, zh, ja]) {
    assert.equal(typeof messages.Nav.year, "string");
    assert.equal(typeof messages.Year.title, "string");
    assert.equal(typeof messages.WallActivity.title, "string");
    assert.equal(typeof messages.SoftNote.title, "string");
    assert.equal(typeof messages.Metadata.yearTitle, "string");
    assert.equal(typeof messages.Metadata.wallActivityTitle, "string");
    assert.equal(typeof messages.Account.yearOpen, "string");
  }

  assert.notEqual(en.Year.title, zh.Year.title);
  assert.notEqual(en.SoftNote.title, ja.SoftNote.title);
  assert.notEqual(en.WallActivity.title, zh.WallActivity.title);
});

test("prior engagement trio surfaces stay wired", () => {
  assert.match(read("src/lib/wall-filters.ts"), /filterWallNotes/);
  assert.match(read("src/app/[locale]/digest/page.tsx"), /DigestPanel/);
  assert.match(read("src/lib/seasonal-packs.ts"), /year-end-gratitude/);
  assert.match(read("src/components/wall-board.tsx"), /filterTitle/);
});
