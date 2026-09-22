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

function truncateForPostcard(text, maxChars) {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  const chars = Array.from(trimmed);
  if (chars.length <= maxChars) return trimmed;
  return `${chars.slice(0, Math.max(1, maxChars - 1)).join("")}…`;
}

function postcardFilename(kind, stamp) {
  const safe = stamp
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `soft-boring-${kind}-${safe || "postcard"}.png`;
}

function pickSoftWallSpotlight(notes, options = {}) {
  const limit = Math.max(1, Math.min(8, options.limit ?? 5));
  const minPraise = options.minPraise ?? 1;
  const seen = new Set();
  const picks = [];

  const pinned = notes
    .filter((note) => note.pinned)
    .sort((a, b) => b.praiseCount - a.praiseCount || a.id.localeCompare(b.id));
  for (const note of pinned) {
    if (picks.length >= limit) break;
    if (seen.has(note.id)) continue;
    seen.add(note.id);
    picks.push({ noteId: note.id, reason: "pinned", praiseCount: note.praiseCount });
  }

  const praised = notes
    .filter((note) => !seen.has(note.id) && note.praiseCount >= minPraise)
    .sort((a, b) => b.praiseCount - a.praiseCount || a.id.localeCompare(b.id));
  for (const note of praised) {
    if (picks.length >= limit) break;
    seen.add(note.id);
    picks.push({ noteId: note.id, reason: "praise", praiseCount: note.praiseCount });
  }
  return picks;
}

function canComparePair(leftId, rightId) {
  if (!leftId || !rightId) return false;
  return leftId !== rightId;
}

function feelingDelta(left, right) {
  if (left == null || right == null) return null;
  return right - left;
}

test("postcard helpers truncate and name files softly", () => {
  assert.equal(truncateForPostcard("  hello   world  ", 20), "hello world");
  assert.equal(truncateForPostcard("abcdefghij", 5), "abcd…");
  assert.equal(postcardFilename("week", "2026-09-22"), "soft-boring-week-2026-09-22.png");
  assert.equal(postcardFilename("digest", "2026/09"), "soft-boring-digest-2026-09.png");
});

test("soft postcard wires Soft+ history detail and digest export", () => {
  const lib = read("src/lib/soft-postcard.ts");
  const button = read("src/components/soft-postcard-button.tsx");
  const detail = read("src/components/history-detail.tsx");
  const digest = read("src/components/digest-panel.tsx");

  assert.match(lib, /drawSoftPostcard/);
  assert.match(lib, /POSTCARD_COLORS/);
  assert.match(lib, /#fff4e8/);
  assert.match(lib, /#f4d4c6/);
  assert.match(button, /SoftPostcardFromReview/);
  assert.match(button, /SoftPostcardFromDigest/);
  assert.match(button, /renderSoftPostcardPng/);
  assert.match(detail, /SoftPostcardFromReview/);
  assert.match(detail, /softPlus/);
  assert.match(digest, /SoftPostcardFromDigest/);
});

test("wall spotlight prefers pinned then high praise and caps the list", () => {
  const picks = pickSoftWallSpotlight(
    [
      { id: "a", pinned: false, praiseCount: 9 },
      { id: "b", pinned: true, praiseCount: 1 },
      { id: "c", pinned: false, praiseCount: 4 },
      { id: "d", pinned: false, praiseCount: 0 },
      { id: "e", pinned: true, praiseCount: 3 },
      { id: "f", pinned: false, praiseCount: 2 },
    ],
    { limit: 4 },
  );
  assert.deepEqual(
    picks.map((item) => item.noteId),
    ["e", "b", "a", "c"],
  );
  assert.equal(picks[0].reason, "pinned");
  assert.equal(picks[2].reason, "praise");
  assert.ok(!picks.some((item) => item.noteId === "d"));
});

test("wall spotlight strip and Soft+ API are wired", () => {
  const lib = read("src/lib/wall-spotlight.ts");
  const db = read("src/db/wall-spotlight.ts");
  const api = read("src/app/api/wall/spotlight/route.ts");
  const strip = read("src/components/wall-spotlight-strip.tsx");
  const board = read("src/components/wall-board.tsx");

  assert.match(lib, /pickSoftWallSpotlight/);
  assert.match(db, /listWallSpotlight/);
  assert.match(api, /requireSoftPlus/);
  assert.match(api, /listWallSpotlight/);
  assert.match(strip, /WallSpotlight/);
  assert.match(strip, /\/api\/wall\/spotlight/);
  assert.match(board, /WallSpotlightStrip/);
  assert.match(board, /initialNoteId/);
});

test("history compare gates Soft+ and compares feeling delta", () => {
  assert.equal(canComparePair("a", "a"), false);
  assert.equal(canComparePair("a", "b"), true);
  assert.equal(feelingDelta(2, 5), 3);
  assert.equal(feelingDelta(null, 5), null);

  const page = read("src/app/[locale]/history/compare/page.tsx");
  const panel = read("src/components/history-compare.tsx");
  const lib = read("src/lib/history-compare.ts");
  const list = read("src/components/history-list.tsx");

  assert.match(page, /HistoryComparePanel/);
  assert.match(page, /userIsSoftPlus/);
  assert.match(page, /path: "\/history\/compare"/);
  assert.match(panel, /feelingDelta/);
  assert.match(panel, /toCompareSide/);
  assert.match(lib, /canComparePair/);
  assert.match(list, /\/history\/compare/);
  assert.match(list, /compareWeeks/);
});

test("postcard spotlight compare i18n exists in en zh-tw ja", () => {
  for (const locale of ["en", "zh-tw", "ja"]) {
    const messages = readJson(`messages/${locale}.json`);
    assert.ok(messages.Postcard?.exportWeek);
    assert.ok(messages.Postcard?.exportDigest);
    assert.ok(messages.HistoryCompare?.title);
    assert.ok(messages.WallSpotlight?.title);
    assert.ok(messages.History?.compareWeeks);
    assert.ok(messages.Metadata?.historyCompareTitle);
  }
});

test("docs mention soft postcard spotlight compare without Stripe/email", () => {
  const docs = read("docs/soft-postcard-spotlight-compare.md");
  const readme = read("README.md");
  assert.match(docs, /Soft postcard PNG/);
  assert.match(docs, /weekly spotlight/);
  assert.match(docs, /history\/compare/);
  assert.match(docs, /No new environment variables/);
  assert.match(readme, /soft-postcard-spotlight-compare/);
  assert.match(readme, /soft postcard PNG/);
  assert.match(readme, /history\/compare/);
});
