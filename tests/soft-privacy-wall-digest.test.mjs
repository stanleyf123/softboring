import assert from "node:assert/strict";
import { register } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

register("./alias-hook.mjs", import.meta.url);

const { DEFAULT_GA_MEASUREMENT_ID, gaMeasurementId } = await import("../src/lib/analytics-note.ts");
const {
  WALL_NOTE_PAGE,
  wallHasMoreNotes,
  wallNextShownCount,
  wallRevealCount,
  wallShownCount,
} = await import("../src/lib/wall-load-more.ts");
const {
  digestMonthKey,
  instantForDigestMonth,
  listPastDigestMonths,
  parseDigestMonthKey,
} = await import("../src/lib/digest-archive.ts");
const { calendarInTimeZone } = await import("../src/lib/timezone.ts");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

test("analytics note names the usual id and does not add a tracker or a cookie", () => {
  assert.equal(DEFAULT_GA_MEASUREMENT_ID, "G-MFQ9J6B9DH");
  const previous = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  assert.equal(gaMeasurementId(), "G-MFQ9J6B9DH");
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "   ";
  assert.equal(gaMeasurementId(), "G-MFQ9J6B9DH");
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = " G-OPTIONAL1 ";
  assert.equal(gaMeasurementId(), "G-OPTIONAL1");
  if (previous === undefined) delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  else process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = previous;

  const footer = read("src/components/site-footer.tsx");
  assert.match(footer, /data-analytics-note/);
  assert.match(footer, /gaMeasurementId\(\)/);
  assert.match(footer, /analyticsNote/);
  assert.doesNotMatch(footer, /googletagmanager|gtag\(|document\.cookie|localStorage/);
  assert.match(footer, /href="\/guidelines"/);
  assert.match(footer, /href="\/privacy"/);
  assert.match(footer, /href="\/terms"/);

  const analytics = read("src/components/google-analytics.tsx");
  assert.match(analytics, /googletagmanager/);
  assert.match(analytics, /gaMeasurementId/);
  assert.doesNotMatch(analytics, /analyticsNote/);

  const locales = ["en", "zh-tw", "ja"].map((locale) => readJson(`messages/${locale}.json`));
  for (const messages of locales) {
    assert.match(messages.Footer.analyticsNote, /\{id\}/);
    assert.match(messages.Footer.analyticsNote, /cookie/i);
    assert.match(messages.Privacy.s4Body, /G-MFQ9J6B9DH/);
    assert.doesNotMatch(messages.Footer.analyticsNote, /zh-TW/);
  }
  assert.match(locales[1].Footer.analyticsNote, /可選/);
  assert.match(locales[2].Footer.analyticsNote, /任意/);
});

test("wall batches reveal notes without dropping search or motion care", () => {
  assert.equal(WALL_NOTE_PAGE, 24);
  assert.equal(wallShownCount(0, 40), 0);
  assert.equal(wallShownCount(10, 0), 10);
  assert.equal(wallShownCount(40, 0), 24);
  assert.equal(wallShownCount(40, 30), 30);
  assert.equal(wallShownCount(Number.NaN, Number.NaN), 0);
  assert.equal(wallHasMoreNotes(40, 24), true);
  assert.equal(wallHasMoreNotes(24, 24), false);
  assert.equal(wallHasMoreNotes(10, 24), false);
  assert.equal(wallNextShownCount(40, 24), 40);
  assert.equal(wallNextShownCount(100, 24), 48);
  assert.equal(wallNextShownCount(100, 48), 72);
  const ids = Array.from({ length: 30 }, (_, index) => `note-${index}`);
  assert.equal(wallRevealCount(ids, "note-1"), 24);
  assert.equal(wallRevealCount(ids, "note-29"), 30);
  assert.equal(wallRevealCount(ids, "missing"), 24);
  assert.equal(wallRevealCount(ids, null), 24);

  const board = read("src/components/wall-board.tsx");
  assert.match(board, /renderedNotes/);
  assert.match(board, /data-wall-load-more/);
  assert.match(board, /data-wall-load-more-button/);
  assert.match(board, /data-wall-load-motion/);
  assert.match(board, /data-wall-guest-search/);
  assert.match(board, /data-wall-search/);
  assert.match(board, /showMoreNotes/);
  assert.doesNotMatch(board, /zh-TW/);

  const css = read("src/app/globals.css");
  assert.match(css, /data-wall-load="fresh"/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /data-wall-load-motion="still"/);

  const en = readJson("messages/en.json");
  assert.match(en.Wall.loadMoreStatus, /\{shown\}/);
  assert.match(en.Wall.loadMoreStatus, /\{total\}/);
  assert.match(readJson("messages/zh-tw.json").Wall.loadMore, /再看/);
  assert.match(readJson("messages/ja.json").Wall.loadMoreDone, /全部/);
});

test("past digest months stay counts and feelings, and free does not receive them", () => {
  const now = new Date("2026-09-22T12:00:00.000Z");
  const reviews = [
    {
      createdAt: "2026-08-31T15:30:00.000Z",
      feeling: 4,
      summary: "secret august edge",
      email: "a@b.c",
      id: "rev-private",
    },
    {
      createdAt: "2026-08-15T04:00:00.000Z",
      feeling: 5,
      summary: "secret august",
    },
    {
      createdAt: "2026-08-31T16:30:00.000Z",
      feeling: 1,
      summary: "secret september edge",
    },
    {
      createdAt: "2026-09-10T03:00:00.000Z",
      feeling: 5,
      summary: "this month",
    },
    {
      createdAt: "2026-07-02T03:00:00.000Z",
      feeling: null,
      summary: "july quiet",
    },
    { createdAt: "not-a-date", feeling: 3, summary: "skip me" },
  ];
  const months = listPastDigestMonths(reviews, now, "Asia/Taipei");
  assert.deepEqual(
    months.map((month) => [month.year, month.month, month.count, month.avgFeeling]),
    [
      [2026, 8, 2, 4.5],
      [2026, 7, 1, null],
    ],
  );
  assert.deepEqual(Object.keys(months[0]).sort(), ["avgFeeling", "count", "month", "year"]);
  const packed = JSON.stringify(months);
  assert.equal(packed.includes("secret"), false);
  assert.equal(packed.includes("a@b.c"), false);
  assert.equal(packed.includes("rev-private"), false);
  assert.deepEqual(listPastDigestMonths([], now, "Asia/Taipei"), []);
  assert.deepEqual(
    listPastDigestMonths([{ createdAt: "2026-09-02T03:00:00.000Z", feeling: 3 }], now, "Asia/Taipei"),
    [],
  );

  assert.deepEqual(parseDigestMonthKey("2026-08"), { year: 2026, month: 8 });
  assert.deepEqual(parseDigestMonthKey(" 2026-08 "), { year: 2026, month: 8 });
  assert.equal(parseDigestMonthKey("2026-8"), null);
  assert.equal(parseDigestMonthKey("2026-13"), null);
  assert.equal(parseDigestMonthKey("1999-01"), null);
  assert.equal(parseDigestMonthKey("zh-TW"), null);
  assert.equal(digestMonthKey(2026, 8), "2026-08");

  const august = instantForDigestMonth(2026, 8, "Asia/Taipei");
  const seen = calendarInTimeZone(august, "Asia/Taipei");
  assert.equal(seen.year, 2026);
  assert.equal(seen.month, 8);

  const page = read("src/app/[locale]/digest/page.tsx");
  assert.match(page, /userIsSoftPlus/);
  assert.match(page, /user && softPlus/);
  assert.match(page, /listPastDigestMonths/);
  assert.match(page, /softPlus=\{false\}/);
  assert.match(page, /path: "\/digest"/);
  assert.doesNotMatch(page, /zh-TW|stripe|resend|nodemailer/i);

  const archive = read("src/components/digest-archive.tsx");
  assert.match(archive, /data-digest-archive="tease"/);
  assert.match(archive, /data-digest-archive="empty"/);
  assert.match(archive, /data-digest-archive="list"/);
  assert.ok(archive.indexOf("if (!softPlus)") < archive.indexOf("months.map"));
  assert.doesNotMatch(archive, /summary|email|reviewId/);
  assert.match(archive, /href="\/pricing"/);
  assert.match(archive, /pathname: "\/digest"/);

  const pricing = read("src/components/pricing-view.tsx");
  assert.match(pricing, /featureDigestArchiveFree/);
  assert.match(pricing, /featureDigestArchivePlus/);

  const locales = ["en", "zh-tw", "ja"].map((locale) => readJson(`messages/${locale}.json`));
  for (const messages of locales) {
    assert.match(messages.Digest.archiveLead, /mail|寄信|メール/i);
    assert.match(messages.Pricing.featureDigestArchiveFree, /Soft\+/);
    assert.equal(messages.Digest.archiveTeaseBody.includes("secret"), false);
  }
  assert.match(locales[0].Digest.archiveEmptyTitle, /earlier/i);
  assert.match(locales[1].Digest.archiveEmptyTitle, /更早/);
  assert.match(locales[2].Digest.archiveTeaseBody, /メールは|見えません|招待/);
});
