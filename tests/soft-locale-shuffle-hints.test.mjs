import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

register("./alias-hook.mjs", import.meta.url);

const { buildCapsuleDayHints, capsuleUnlockDay } = await import("../src/lib/capsule-hints.ts");
const { normalizeAppLocale, rewriteLocalePath } = await import("../src/lib/locale-path.ts");
const { nextShuffleSeed, shuffleWallNotes } = await import("../src/lib/wall-shuffle.ts");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

test("footer locale links rewrite onto en / zh-tw / ja and never zh-TW", () => {
  assert.equal(normalizeAppLocale("zh-TW"), "zh-tw");
  assert.equal(normalizeAppLocale("ZH-tw"), "zh-tw");
  assert.equal(normalizeAppLocale("ja"), "ja");
  assert.equal(normalizeAppLocale("fr"), null);

  assert.equal(rewriteLocalePath("/wall", "en"), "/en/wall");
  assert.equal(rewriteLocalePath("/year", "zh-tw"), "/zh-tw/year");
  assert.equal(rewriteLocalePath("/", "ja"), "/ja");
  assert.equal(rewriteLocalePath("/en/history/abc", "ja"), "/ja/history/abc");
  assert.equal(rewriteLocalePath("/zh-TW/wall/saved", "en"), "/en/wall/saved");
  assert.equal(rewriteLocalePath("/ZH-TW/review", "zh-tw"), "/zh-tw/review");
  assert.equal(
    rewriteLocalePath("/ja/history?week=1#quiet", "zh-tw"),
    "/zh-tw/history?week=1#quiet",
  );

  for (const locale of ["en", "zh-tw", "ja"]) {
    const href = rewriteLocalePath("/zh-TW/wall", locale);
    assert.match(href, new RegExp(`^/${locale}/wall$`));
    assert.equal(href.includes("zh-TW"), false);
  }

  assert.equal(rewriteLocalePath("/wall", "zh-TW"), "/zh-tw/wall");
  assert.throws(() => rewriteLocalePath("/wall", "fr"), /unsupported locale/);

  const switcher = read("src/components/locale-switcher.tsx");
  const footer = read("src/components/site-footer.tsx");
  assert.match(footer, /LocaleSwitcher variant="footer"/);
  assert.match(switcher, /data-locale-switcher=\{variant\}/);
  assert.match(switcher, /data-locale="en"/);
  assert.match(switcher, /data-locale="zh-tw"/);
  assert.match(switcher, /data-locale="ja"/);
  assert.match(switcher, /hrefFor\("en"\)/);
  assert.match(switcher, /hrefFor\("zh-tw"\)/);
  assert.match(switcher, /hrefFor\("ja"\)/);
  assert.match(switcher, /rewriteLocalePath/);
  assert.doesNotMatch(switcher, /zh-TW/);
  assert.doesNotMatch(switcher, /localStorage|stripe|resend|nodemailer/i);

  const layout = read("src/app/[locale]/layout.tsx");
  assert.match(layout, /<SiteFooter \/>/);

  const messages = ["en", "zh-tw", "ja"].map((locale) => readJson(`messages/${locale}.json`));
  for (const copy of messages) {
    assert.equal(copy.LocaleSwitcher.enName, "English");
    assert.equal(copy.LocaleSwitcher.zhName, "繁體中文");
    assert.equal(copy.LocaleSwitcher.jaName, "日本語");
  }
});

test("soft shuffle reorders visible notes for this visit only", () => {
  const notes = [
    { id: "a", z: 1 },
    { id: "b", z: 2 },
    { id: "c", z: 3 },
    { id: "d", z: 4 },
    { id: "e", z: 5 },
  ];
  const once = shuffleWallNotes(notes, 1);
  const again = shuffleWallNotes(notes, 1);
  const other = shuffleWallNotes(notes, 2);
  assert.deepEqual(notes.map((note) => note.id), ["a", "b", "c", "d", "e"]);
  assert.deepEqual(
    once.map((note) => note.id),
    again.map((note) => note.id),
  );
  assert.notDeepEqual(
    once.map((note) => note.id),
    other.map((note) => note.id),
  );
  assert.equal(once.length, notes.length);
  assert.deepEqual(new Set(once.map((note) => note.id)), new Set(notes.map((note) => note.id)));
  assert.deepEqual(shuffleWallNotes(notes.slice(0, 1), 4), notes.slice(0, 1));
  assert.deepEqual(shuffleWallNotes(notes, Number.NaN).map((note) => note.id), ["a", "b", "c", "d", "e"]);

  assert.equal(nextShuffleSeed(null), 1);
  assert.equal(nextShuffleSeed(Number.NaN), 1);
  assert.equal(nextShuffleSeed(1), 2);
  assert.equal(nextShuffleSeed(2), 3);

  const lib = read("src/lib/wall-shuffle.ts");
  assert.doesNotMatch(lib, /localStorage|sessionStorage|fetch\(|softPlus|stripe|resend/i);

  const board = read("src/components/wall-board.tsx");
  assert.match(board, /data-wall-shuffle/);
  assert.match(board, /nextShuffleSeed/);
  assert.match(board, /shuffleWallNotes/);
  assert.match(board, /setShuffleSeed\(\(current\) => nextShuffleSeed\(current\)\)/);
  assert.match(board, /setShuffleSeed\(null\)/);
  assert.match(board, /useState<number \| null>\(null\)/);
  const buttonAt = board.indexOf("data-wall-shuffle");
  const beforeButton = board.slice(Math.max(0, buttonAt - 600), buttonAt);
  assert.doesNotMatch(beforeButton, /softPlus \?/);
  assert.doesNotMatch(lib, /localStorage/);
  assert.doesNotMatch(board, /softboring\.wall\.shuffle|shuffleSeed.*localStorage|localStorage.*shuffle/i);

  const messages = ["en", "zh-tw", "ja"].map((locale) => readJson(`messages/${locale}.json`));
  assert.match(messages[0].Wall.shuffleHint, /nothing is saved/i);
  assert.match(messages[1].Wall.shuffleHint, /不會記住/);
  assert.match(messages[2].Wall.shuffleHint, /保存しません/);
  assert.equal(messages[0].Wall.shuffle.length > 0, true);
  assert.equal(messages[1].Wall.shuffleReset.length > 0, true);
  assert.equal(messages[2].Wall.shuffled.length > 0, true);
});

test("Soft+ capsule calendar hints mark sealed and open days without the words", () => {
  const secret = "sealed words stay inside";
  const hints = buildCapsuleDayHints(
    [
      { unlockAt: "2026-10-02T00:00:00.000Z", sealed: true, body: secret },
      { unlockAt: "2026-10-02T15:00:00.000Z", sealed: false, body: "already open" },
      { unlockAt: "2026-11-01T00:00:00.000Z", sealed: true, body: secret },
      { unlockAt: "not-a-date", sealed: true, body: secret },
    ],
    "Asia/Taipei",
  );
  assert.deepEqual(hints, [
    { unlockOn: "2026-10-02", sealed: 1, open: 1 },
    { unlockOn: "2026-11-01", sealed: 1, open: 0 },
  ]);
  assert.equal(JSON.stringify(hints).includes(secret), false);
  assert.equal("body" in hints[0], false);
  assert.equal(capsuleUnlockDay("2026-10-02T00:00:00.000Z", "America/Los_Angeles"), "2026-10-01");
  assert.equal(capsuleUnlockDay("nope", "Asia/Taipei"), null);

  const year = read("src/app/[locale]/year/page.tsx");
  const history = read("src/app/[locale]/history/page.tsx");
  const card = read("src/components/capsule-calendar-hints.tsx");
  for (const page of [year, history]) {
    assert.match(page, /CapsuleCalendarHints/);
    assert.match(
      page,
      /user && softPlus\s*\?\s*buildCapsuleDayHints\(listPublicCapsules\(user\.id\)/,
    );
  }
  assert.match(card, /data-capsule-hints="tease"/);
  assert.match(card, /data-capsule-hints="plus"/);
  assert.match(card, /href="\/pricing"/);
  assert.match(card, /data-capsule-day=\{hint\.unlockOn\}/);
  assert.doesNotMatch(card, /hint\.body|capsule\.body|stripe|resend|nodemailer|sendMail/i);
  const tease = card.slice(0, card.indexOf('data-capsule-hints="plus"'));
  assert.match(tease, /data-capsule-hints="tease"/);
  assert.doesNotMatch(tease, /data-capsule-day/);

  const messages = ["en", "zh-tw", "ja"].map((locale) => readJson(`messages/${locale}.json`));
  assert.match(messages[0].CapsuleHints.privacy, /nothing is emailed/i);
  assert.match(messages[1].CapsuleHints.privacy, /不會寄信/);
  assert.match(messages[2].CapsuleHints.privacy, /メールは送りません/);
  assert.match(messages[0].CapsuleHints.teaseBody, /Soft\+/);
  assert.equal(messages[1].CapsuleHints.teaseCta.length > 0, true);
  assert.equal(messages[2].CapsuleHints.accountLink.length > 0, true);
});
