import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

register("./alias-hook.mjs", import.meta.url);

const { historyNeighborLabel, historyWeekNeighbors } = await import(
  "../src/lib/history-week-nav.ts"
);
const { seasonForMonth } = await import("../src/lib/seasonal-variants.ts");
const { isWallWeekChip, noteMatchesWeekChip } = await import("../src/lib/wall-week-chips.ts");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

const reviews = [
  { id: "new", locked: false, summary: "  latest   week " },
  { id: "mid-locked", locked: true, summary: "secret tucked week" },
  { id: "mid", locked: false, summary: "" },
  { id: "old", locked: false, summary: "oldest" },
];

test("open weeks step around locked history", () => {
  const mid = historyWeekNeighbors(reviews, "mid");
  assert.equal(mid.later?.id, "new");
  assert.equal(mid.earlier?.id, "old");
  assert.equal(mid.openIndex, 2);
  assert.equal(mid.openCount, 3);
  assert.equal(mid.later?.summary.includes("secret"), false);

  const latest = historyWeekNeighbors(reviews, "new");
  assert.equal(latest.later, null);
  assert.equal(latest.earlier?.id, "mid");
  assert.equal(latest.openIndex, 1);

  const oldest = historyWeekNeighbors(reviews, "old");
  assert.equal(oldest.earlier, null);
  assert.equal(oldest.later?.id, "mid");
  assert.equal(oldest.openIndex, 3);

  const locked = historyWeekNeighbors(reviews, "mid-locked");
  assert.equal(locked.later, null);
  assert.equal(locked.earlier, null);
  assert.equal(locked.openIndex, 0);
  assert.equal(locked.openCount, 3);
  assert.equal(locked.lockedCount, 1);

  assert.deepEqual(historyWeekNeighbors(reviews, "missing"), {
    earlier: null,
    later: null,
    openIndex: 0,
    openCount: 3,
    lockedCount: 1,
  });
  assert.equal(historyWeekNeighbors([], "new").openCount, 0);
  assert.equal(historyWeekNeighbors([], "new").lockedCount, 0);
  assert.equal(historyWeekNeighbors([{ id: "  ", locked: false }], " ").openIndex, 0);
});

test("neighbor titles stay short and unnamed when blank", () => {
  assert.equal(historyNeighborLabel("  hi   there ", "untitled"), "hi there");
  assert.equal(historyNeighborLabel("   ", "untitled"), "untitled");
  assert.equal(historyNeighborLabel(null, "untitled"), "untitled");
  const long = historyNeighborLabel("a".repeat(80), "untitled");
  assert.equal(long.endsWith("…"), true);
  assert.equal(long.length, 72);
  assert.equal(historyNeighborLabel("a".repeat(72), "untitled"), "a".repeat(72));
});

test("seasonal phrasing follows the calendar month and leaves fields alone", () => {
  assert.equal(seasonForMonth(3), "spring");
  assert.equal(seasonForMonth(5), "spring");
  assert.equal(seasonForMonth(6), "summer");
  assert.equal(seasonForMonth(8), "summer");
  assert.equal(seasonForMonth(9), "autumn");
  assert.equal(seasonForMonth(11), "autumn");
  assert.equal(seasonForMonth(12), "winter");
  assert.equal(seasonForMonth(1), "winter");
  assert.equal(seasonForMonth(2), "winter");
  assert.equal(seasonForMonth(0), null);
  assert.equal(seasonForMonth(13), null);
  assert.equal(seasonForMonth(1.5), null);

  const lib = read("src/lib/seasonal-variants.ts");
  const form = read("src/components/review-form.tsx");
  const chip = read("src/components/seasonal-variant-chip.tsx");
  assert.match(form, /seasonForMonth\(new Date\(\)\.getMonth\(\) \+ 1\)/);
  assert.match(form, /hidden=\{Boolean\(activePackId\)\}/);
  assert.match(form, /if \(activePackId\)/);
  assert.match(chip, /data-seasonal-variant=/);
  assert.match(chip, /aria-pressed/);
  assert.doesNotMatch(lib, /stripe|resend|nodemailer|sendMail/i);
  assert.doesNotMatch(chip, /fetch\(/);
});

test("Soft+ wall week chips use the account ISO week", () => {
  const now = new Date("2026-09-24T04:00:00.000Z");
  const zone = "Asia/Taipei";
  const same = "2026-09-23T16:00:00.000Z";
  const earlier = "2026-09-10T04:00:00.000Z";
  const future = "2026-12-01T04:00:00.000Z";

  assert.equal(noteMatchesWeekChip(same, "this-week", now, zone), true);
  assert.equal(noteMatchesWeekChip(same, "earlier", now, zone), false);
  assert.equal(noteMatchesWeekChip(same, "all", now, zone), true);
  assert.equal(noteMatchesWeekChip(earlier, "this-week", now, zone), false);
  assert.equal(noteMatchesWeekChip(earlier, "earlier", now, zone), true);
  assert.equal(noteMatchesWeekChip(future, "this-week", now, zone), false);
  assert.equal(noteMatchesWeekChip(future, "earlier", now, zone), false);
  assert.equal(noteMatchesWeekChip(future, "all", now, zone), true);
  assert.equal(noteMatchesWeekChip("nope", "this-week", now, zone), false);
  assert.equal(noteMatchesWeekChip("", "earlier", now, zone), false);
  assert.equal(noteMatchesWeekChip(null, "all", now, zone), true);
  assert.equal(isWallWeekChip("this-week"), true);
  assert.equal(isWallWeekChip("mood"), false);

  const board = read("src/components/wall-board.tsx");
  const page = read("src/app/[locale]/wall/page.tsx");
  assert.match(board, /data-wall-week-chips=""/);
  assert.match(board, /data-wall-week-chip=\{chip\}/);
  assert.match(board, /noteMatchesWeekChip/);
  assert.match(board, /setWeekChip\("all"\)/);
  assert.match(page, /weekTimeZone=\{settings\?\.timezone\}/);
  assert.doesNotMatch(read("src/lib/wall-week-chips.ts"), /stripe|resend|nodemailer|sendMail/i);
  assert.doesNotMatch(board.slice(board.indexOf("data-wall-week-chips")), /mailto:/);
});

test("history week nav is present and does not link locked weeks", () => {
  const detail = read("src/components/history-detail.tsx");
  const nav = read("src/components/history-week-nav.tsx");
  assert.match(detail, /historyWeekNeighbors\(list\.reviews, id\)/);
  assert.match(detail, /<HistoryWeekNav neighbors=\{neighbors\} \/>/);
  assert.match(nav, /data-history-week-nav="open"/);
  assert.match(nav, /data-history-week="earlier"/);
  assert.match(nav, /data-history-week="later"/);
  assert.match(nav, /neighbors\.lockedCount > 0 \? t\("onlyOpen"\) : t\("onlyWeek"\)/);
  assert.match(nav, /focus-visible:outline-accent/);
  assert.doesNotMatch(nav, /href=.*locked/);
  assert.doesNotMatch(read("src/lib/history-week-nav.ts"), /stripe|resend|nodemailer|sendMail/i);
});

test("en, zh-tw, and ja share the new week, season, and chip copy", () => {
  const locales = ["messages/en.json", "messages/zh-tw.json", "messages/ja.json"].map(readJson);
  const fields = ["energy", "drain", "lessOf", "priorities", "feeling", "summary"];
  for (const messages of locales) {
    assert.equal(typeof messages.HistoryDetail.weekNavLabel, "string");
    assert.equal(typeof messages.HistoryDetail.onlyOpen, "string");
    assert.equal(typeof messages.HistoryDetail.onlyWeek, "string");
    assert.match(messages.HistoryDetail.onlyOpen, /Soft\+/);
    assert.doesNotMatch(messages.HistoryDetail.onlyWeek, /Soft\+/);
    assert.equal(typeof messages.Wall.weekChipThis, "string");
    assert.equal(typeof messages.Wall.weekChipsHint, "string");
    assert.equal(messages.SeasonalVariants.lead.includes("Soft+"), true);
    for (const season of ["spring", "summer", "autumn", "winter"]) {
      for (const field of fields) {
        assert.equal(messages.SeasonalVariants.seasons[season][field].length > 0, true);
      }
    }
  }
  assert.notEqual(
    locales[0].SeasonalVariants.seasons.summer.summary,
    locales[1].SeasonalVariants.seasons.summer.summary,
  );
  assert.notEqual(
    locales[1].Wall.weekChipEarlier,
    locales[2].Wall.weekChipEarlier,
  );
  assert.equal(locales[1].HistoryDetail.earlier, "更早一週");
  assert.equal(locales[2].SeasonalVariants.season_autumn, "秋");
  assert.doesNotMatch(JSON.stringify(locales), /zh-TW/);
});
