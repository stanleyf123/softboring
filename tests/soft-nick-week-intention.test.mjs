import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

register("./alias-hook.mjs", import.meta.url);

const { nicknameWallQuery } = await import("../src/lib/nickname-wall-link.ts");
const { wallQuietEmptyKind } = await import("../src/lib/wall-week-empty.ts");
const { intentionWeeksAgo, isoWeekMondayUtc } = await import(
  "../src/lib/intention-weeks-ago.ts"
);

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

test("nickname wall links stay short and off email", () => {
  assert.equal(nicknameWallQuery("  小桃 "), "小桃");
  assert.equal(nicknameWallQuery("Moss"), "Moss");
  assert.equal(nicknameWallQuery("a"), null);
  assert.equal(nicknameWallQuery("a".repeat(17)), null);
  assert.equal(nicknameWallQuery("a@b"), null);
  assert.equal(nicknameWallQuery("hidden@example.com"), null);
  assert.equal(nicknameWallQuery("ok\nname"), null);
  assert.equal(nicknameWallQuery(""), null);
  assert.equal(nicknameWallQuery(null), null);
  assert.equal(nicknameWallQuery(12), null);

  const strip = read("src/components/public-nickname-strip.tsx");
  const page = read("src/app/[locale]/wall/page.tsx");
  const board = read("src/components/wall-board.tsx");
  assert.match(strip, /nicknameWallQuery/);
  assert.match(strip, /pathname: "\/wall"/);
  assert.match(strip, /data-public-nickname-count/);
  assert.match(strip, /href="\/wall"/);
  assert.match(page, /initialNickname=\{nicknameWallQuery\(query\.nick\)\}/);
  assert.match(board, /data-wall-nickname-query/);
  assert.doesNotMatch(strip, /email|zh-TW|stripe|resend|sendMail/i);
  assert.doesNotMatch(read("src/lib/nickname-wall-link.ts"), /stripe|resend|nodemailer|sendMail/i);
});

test("week chips get their own quiet empty when nothing else is filtering", () => {
  assert.equal(wallQuietEmptyKind("all", false), "filters");
  assert.equal(wallQuietEmptyKind("this-week", false), "this-week");
  assert.equal(wallQuietEmptyKind("earlier", false), "earlier");
  assert.equal(wallQuietEmptyKind("this-week", true), "filters");
  assert.equal(wallQuietEmptyKind("earlier", true), "filters");

  const board = read("src/components/wall-board.tsx");
  assert.match(board, /wallQuietEmptyKind/);
  assert.match(board, /data-wall-week-empty=/);
  assert.match(board, /data-wall-week-empty-reset/);
  assert.match(board, /weekEmptyShowAll/);
  assert.doesNotMatch(read("src/lib/wall-week-empty.ts"), /stripe|resend|nodemailer|zh-TW/);
});

test("earlier intentions know how many weeks ago, and can be copied here", () => {
  assert.equal(intentionWeeksAgo("2026-W37", "2026-W38"), 1);
  assert.equal(intentionWeeksAgo("2026-W01", "2026-W03"), 2);
  assert.equal(intentionWeeksAgo("2026-W38", "2026-W38"), null);
  assert.equal(intentionWeeksAgo("2026-W39", "2026-W38"), null);
  assert.equal(intentionWeeksAgo("nope", "2026-W38"), null);
  assert.equal(intentionWeeksAgo("2026-W38", "not-a-week"), null);
  assert.equal(isoWeekMondayUtc("2021-W53"), null);
  assert.equal(intentionWeeksAgo("2021-W53", "2022-W01"), null);
  assert.ok(isoWeekMondayUtc("2020-W53"));
  assert.equal(intentionWeeksAgo("2020-W52", "2020-W53"), 1);
  assert.equal(intentionWeeksAgo("2020-W53", "2021-W01"), 1);
  assert.equal(intentionWeeksAgo("2025-W52", "2026-W01"), 1);

  const history = read("src/components/soft-intention-history.tsx");
  assert.match(history, /intentionWeeksAgo/);
  assert.match(history, /data-intention-ago/);
  assert.match(history, /data-intention-copy/);
  assert.match(history, /copyShareText/);
  assert.doesNotMatch(history, /stripe|resend|nodemailer|sendMail|zh-TW/i);
  assert.doesNotMatch(read("src/lib/intention-weeks-ago.ts"), /stripe|resend|nodemailer|zh-TW/);
});

test("copy exists in en, zh-tw, and ja", () => {
  const locales = ["en", "zh-tw", "ja"].map((locale) => readJson(`messages/${locale}.json`));
  for (const messages of locales) {
    assert.match(messages.PublicNicknames.count, /\{count\}/);
    assert.match(messages.PublicNicknames.chipAria, /\{name\}/);
    assert.match(messages.Wall.nicknameFromStrip, /\{name\}/);
    assert.match(messages.Wall.weekEmptyThisTitle, /\S/);
    assert.match(messages.Wall.weekEmptyThis, /\S/);
    assert.match(messages.Wall.weekEmptyEarlierTitle, /\S/);
    assert.match(messages.Wall.weekEmptyEarlier, /\S/);
    assert.match(messages.Wall.weekEmptyShowAll, /\S/);
    assert.match(messages.SoftIntention.historyLastWeek, /\S/);
    assert.match(messages.SoftIntention.historyWeeksAgo, /\{count\}/);
    assert.match(messages.SoftIntention.historyCopy, /\S/);
    assert.match(messages.SoftIntention.historyCopied, /\S/);
    assert.match(messages.SoftIntention.historyCopyError, /\S/);
    assert.doesNotMatch(JSON.stringify(messages.PublicNicknames), /zh-TW/);
    assert.doesNotMatch(JSON.stringify(messages.Wall), /zh-TW/);
  }
  assert.match(locales[1].PublicNicknames.chipAria, /軟軟牆/);
  assert.match(locales[2].PublicNicknames.chipAria, /ソフトウォール/);
  assert.match(locales[1].Wall.weekEmptyShowAll, /所有週/);
  assert.match(locales[2].SoftIntention.historyCopy, /コピー/);
  assert.match(read("README.md"), /docs\/soft-nick-week-intention\.md/);
  assert.match(read("docs/soft-nick-week-intention.md"), /Nothing is emailed|not emailed/);
});
