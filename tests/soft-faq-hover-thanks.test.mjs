import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const { isSoftFaqId, softFaqIds, toggleSoftFaq } = await import("../src/lib/soft-faq.ts");
const { wallNotePreviewLines, WALL_NOTE_PREVIEW_LINES } = await import(
  "../src/lib/wall-note-preview.ts"
);
const { shapeSoftThanksHistory, SOFT_THANKS_HISTORY_LIMIT } = await import(
  "../src/lib/soft-thanks-history.ts"
);

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

test("soft FAQ stays one answer at a time and ignores unknown ids", () => {
  assert.deepEqual(softFaqIds(), ["payments", "reminders", "freeWindow", "thanks", "cancel"]);
  assert.equal(toggleSoftFaq(null, "payments"), "payments");
  assert.equal(toggleSoftFaq("payments", "payments"), null);
  assert.equal(toggleSoftFaq("payments", "reminders"), "reminders");
  assert.equal(toggleSoftFaq("thanks", "nope"), "thanks");
  assert.equal(toggleSoftFaq(null, ""), null);
  assert.equal(isSoftFaqId("cancel"), true);
  assert.equal(isSoftFaqId("zh-TW"), false);
});

test("pricing FAQ is free copy and does not start checkout", () => {
  const faq = read("src/components/soft-faq.tsx");
  const pricing = read("src/components/pricing-view.tsx");
  assert.match(pricing, /<SoftFaq \/>/);
  assert.match(faq, /data-soft-faq=/);
  assert.match(faq, /aria-expanded=\{expanded\}/);
  assert.match(faq, /aria-controls=\{panelId\}/);
  assert.match(faq, /hidden=\{!expanded\}/);
  assert.doesNotMatch(faq, /stripe|checkout|resend|smtp/i);
  assert.doesNotMatch(read("src/lib/soft-faq.ts"), /getDb|stripe|fetch\(/);
  for (const locale of ["en", "zh-tw", "ja"]) {
    const copy = readJson(`messages/${locale}.json`).SoftFaq;
    for (const id of softFaqIds()) {
      assert.equal(typeof copy[`${id}Q`], "string");
      assert.equal(typeof copy[`${id}A`], "string");
      assert.doesNotMatch(copy[`${id}A`], /\/zh-TW(\/|$)/);
    }
    assert.match(copy.paymentsA, /gift|禮物|ギフト/);
    assert.match(copy.remindersA, /Resend/);
  }
});

test("readable wall notes open a little more on hover and focus", () => {
  assert.equal(WALL_NOTE_PREVIEW_LINES, 5);
  assert.equal(wallNotePreviewLines(false), 5);
  assert.equal(wallNotePreviewLines(true), null);
  const board = read("src/components/wall-board.tsx");
  const css = read("src/app/globals.css");
  assert.match(board, /line-clamp-5/);
  assert.match(board, /data-note-preview=\{full && !locked \? "soft" : undefined\}/);
  assert.match(board, /data-wall-guest-search/);
  assert.match(css, /data-note-preview="soft"\]:hover \.wall-note-copy/);
  assert.match(css, /data-note-preview="soft"\]:focus-within \.wall-note-copy/);
  assert.match(css, /-webkit-line-clamp:\s*unset !important/);
  assert.match(css, /overflow:\s*visible !important/);
  const still = css.slice(css.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(still, /The note preview still opens/);
  assert.match(still, /-webkit-line-clamp:\s*unset !important/);
  assert.doesNotMatch(read("src/lib/wall-note-preview.ts"), /getDb|stripe|fetch\(/);
});

test("thank-you history is newest-first, hides taken-down words, and stays off Free", () => {
  const rows = [
    { noteId: "old", at: "2026-01-01T00:00:00.000Z", excerpt: "tea", nickname: "Peach" },
    { noteId: "new", at: "2026-03-02T00:00:00.000Z", excerpt: "rain", nickname: "  " },
    { noteId: "new", at: "2026-02-01T00:00:00.000Z", excerpt: "older rain", nickname: "Momo" },
    { noteId: "gone", at: "2026-04-01T00:00:00.000Z", excerpt: "secret week", nickname: "Hidden", hidden: true },
    { noteId: "bad", at: "not-a-date", excerpt: "nope" },
    { noteId: " ", at: "2026-05-01T00:00:00.000Z", excerpt: "blank id" },
  ];
  const shaped = shapeSoftThanksHistory(rows, 5);
  assert.deepEqual(
    shaped.map((row) => row.noteId),
    ["gone", "new", "old"],
  );
  assert.equal(shaped[0].excerpt, "");
  assert.equal(shaped[0].hidden, true);
  assert.equal(shaped[1].nickname, null);
  assert.equal(shaped[1].excerpt, "rain");
  assert.equal(shapeSoftThanksHistory(rows, 1).length, 1);
  assert.equal(shapeSoftThanksHistory(rows, Number.NaN).length <= SOFT_THANKS_HISTORY_LIMIT, true);
  assert.equal(SOFT_THANKS_HISTORY_LIMIT, 5);

  const account = read("src/app/[locale]/account/page.tsx");
  const plus = read("src/app/[locale]/thanks/plus/page.tsx");
  const panel = read("src/components/account-panel.tsx");
  const strip = read("src/components/soft-thanks-history.tsx");
  const db = read("src/db/wall-thanks.ts");
  const fn = db.slice(db.indexOf("export function listRecentThanksForUser"));
  assert.match(account, /softPlus \? listRecentThanksForUser\(user\.id\) : \[\]/);
  assert.match(plus, /softPlus \? listRecentThanksForUser\(user\.id\) : \[\]/);
  assert.match(panel, /<SoftThanksHistory softPlus=\{softPlus\} notes=\{thankedNotes\} \/>/);
  assert.match(strip, /data-soft-thanks-tease/);
  assert.match(strip, /data-soft-thanks-history/);
  assert.match(strip, /if \(!softPlus\)/);
  assert.doesNotMatch(fn, /u\.email|stripe|resend|smtp/i);
  assert.match(fn, /allowEmailFallback: false/);
  assert.doesNotMatch(read("src/lib/soft-thanks-history.ts"), /getDb|stripe/);
  for (const locale of ["en", "zh-tw", "ja"]) {
    const copy = readJson(`messages/${locale}.json`).SoftThanks;
    assert.equal(typeof copy.teaseBody, "string");
    assert.equal(typeof copy.hidden, "string");
    assert.equal(typeof copy.empty, "string");
    assert.doesNotMatch(copy.teaseBody, /\/zh-TW(\/|$)/);
  }
});
