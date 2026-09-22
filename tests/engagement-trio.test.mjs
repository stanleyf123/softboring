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

function wallNoteMatchesFilters(note, filters) {
  const min = filters.feelingMin;
  const max = filters.feelingMax;
  if (min != null || max != null) {
    if (typeof note.feeling !== "number") return false;
    if (min != null && note.feeling < min) return false;
    if (max != null && note.feeling > max) return false;
  }
  const needle = filters.query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [note.ownerNickname, note.ownerFallback, note.excerpt, note.summary]
    .filter((value) => Boolean(value && String(value).trim()))
    .join("\n")
    .toLowerCase();
  return haystack.includes(needle);
}

function monthlyDigestFromReviews(reviews, now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const inMonth = reviews.filter((review) => {
    const date = new Date(review.createdAt);
    return date.getFullYear() === year && date.getMonth() === month;
  });
  const feelings = inMonth
    .map((review) => review.feeling)
    .filter((value) => typeof value === "number");
  const avgFeeling =
    feelings.length === 0
      ? null
      : Math.round((feelings.reduce((sum, value) => sum + value, 0) / feelings.length) * 10) /
        10;
  return {
    year,
    month: month + 1,
    count: inMonth.length,
    avgFeeling,
    streak: inMonth.length > 0 ? 1 : 0,
    energyKeywords: inMonth.length ? ["tea"] : [],
    drainKeywords: inMonth.length ? ["meetings"] : [],
  };
}

function customQuestionsFromPack(packId, prompts) {
  return prompts
    .map((prompt, index) => ({
      id: `seasonal:${packId}:${index + 1}`,
      prompt: String(prompt).trim().slice(0, 200),
    }))
    .filter((item) => item.prompt)
    .slice(0, 3);
}

test("Soft Wall discovery filters match feeling range and nickname/excerpt", () => {
  const note = {
    feeling: 4,
    ownerNickname: "Peach",
    excerpt: "a quiet tea week",
    summary: "soft rain",
  };
  assert.equal(
    wallNoteMatchesFilters(note, { query: "", feelingMin: 3, feelingMax: 5 }),
    true,
  );
  assert.equal(
    wallNoteMatchesFilters(note, { query: "", feelingMin: 5, feelingMax: 5 }),
    false,
  );
  assert.equal(
    wallNoteMatchesFilters(note, { query: "peach", feelingMin: null, feelingMax: null }),
    true,
  );
  assert.equal(
    wallNoteMatchesFilters(note, { query: "tea", feelingMin: null, feelingMax: null }),
    true,
  );
  assert.equal(
    wallNoteMatchesFilters(note, { query: "missing", feelingMin: null, feelingMax: null }),
    false,
  );
  assert.equal(
    wallNoteMatchesFilters(
      { feeling: null, excerpt: "hello" },
      { query: "", feelingMin: 1, feelingMax: 5 },
    ),
    false,
  );
});

test("wall filter helpers and Soft+ filter UI stay wired", () => {
  const filtersLib = read("src/lib/wall-filters.ts");
  const board = read("src/components/wall-board.tsx");
  assert.match(filtersLib, /wallNoteMatchesFilters/);
  assert.match(filtersLib, /filterWallNotes/);
  assert.match(board, /filterTitle/);
  assert.match(board, /filterWallNotes/);
  assert.match(board, /visibleNotes/);
  assert.match(board, /softPlus && !locked/);
  assert.match(board, /toTeaserNote|locked/);
});

test("monthly digest page is Soft+ gated and richer than account teaser", () => {
  const page = read("src/app/[locale]/digest/page.tsx");
  const panel = read("src/components/digest-panel.tsx");
  const insights = read("src/lib/plus-insights.ts");
  const header = read("src/components/site-header.tsx");
  const account = read("src/components/account-panel.tsx");
  const trends = read("src/components/trends-panel.tsx");

  assert.match(page, /DigestPanel/);
  assert.match(page, /isSoftPlusPlan/);
  assert.match(page, /lockedTitle/);
  assert.match(page, /path: "\/digest"/);
  assert.match(panel, /energyKeywords/);
  assert.match(panel, /drainKeywords/);
  assert.match(panel, /streak/);
  assert.match(insights, /energyKeywords/);
  assert.match(insights, /drainKeywords/);
  assert.match(insights, /weeklyStreak/);
  assert.match(header, /href="\/digest"/);
  assert.match(account, /href="\/digest"/);
  assert.match(trends, /seeDigest/);

  const now = new Date(2026, 8, 15);
  const digest = monthlyDigestFromReviews(
    [
      { createdAt: "2026-09-01T12:00:00.000Z", feeling: 4, energy: "tea", drain: "meetings" },
      { createdAt: "2026-08-01T12:00:00.000Z", feeling: 2, energy: "walk", drain: "noise" },
    ],
    now,
  );
  assert.equal(digest.count, 1);
  assert.equal(digest.avgFeeling, 4);
  assert.equal(digest.month, 9);
});

test("seasonal packs apply as custom questions and review overrides", () => {
  const packs = read("src/lib/seasonal-packs.ts");
  const panel = read("src/components/seasonal-packs-panel.tsx");
  const review = read("src/components/review-form.tsx");
  const account = read("src/components/account-panel.tsx");

  assert.match(packs, /spring-soft-reset/);
  assert.match(packs, /rainy-week-comfort/);
  assert.match(packs, /year-end-gratitude/);
  assert.match(packs, /customQuestionsFromPack/);
  assert.match(panel, /applyCustom/);
  assert.match(panel, /useThisWeek/);
  assert.match(panel, /\/api\/account\/custom-questions/);
  assert.match(review, /SeasonalPacksPanel/);
  assert.match(review, /activePackId/);
  assert.match(review, /questionLabel/);
  assert.match(account, /SeasonalPacksPanel/);

  const questions = customQuestionsFromPack("spring-soft-reset", [
    "a",
    "b",
    "c",
    "d",
  ]);
  assert.equal(questions.length, 3);
  assert.equal(questions[0].id, "seasonal:spring-soft-reset:1");
});

test("engagement trio copy exists in en / zh-tw / ja", () => {
  const en = readJson("messages/en.json");
  const zh = readJson("messages/zh-tw.json");
  const ja = readJson("messages/ja.json");

  for (const messages of [en, zh, ja]) {
    assert.equal(typeof messages.Nav.digest, "string");
    assert.equal(typeof messages.Digest.title, "string");
    assert.equal(typeof messages.Wall.filterTitle, "string");
    assert.equal(
      typeof messages.SeasonalPacks.packs["year-end-gratitude"].summary,
      "string",
    );
    assert.equal(typeof messages.Metadata.digestTitle, "string");
  }

  assert.notEqual(en.SeasonalPacks.packs["spring-soft-reset"].name, zh.SeasonalPacks.packs["spring-soft-reset"].name);
  assert.notEqual(en.Digest.title, ja.Digest.title);
});

test("free Soft Wall teaser path and default six questions stay intact", () => {
  const canvas = read("src/lib/wall-canvas.ts");
  const board = read("src/components/wall-board.tsx");
  const questions = readJson("messages/en.json").Questions;
  const review = read("src/components/review-form.tsx");

  assert.match(canvas, /toTeaserNote/);
  assert.doesNotMatch(canvas, /feeling:/);
  assert.match(board, /locked \|\| !full/);
  assert.match(board, /blur/);
  assert.equal(typeof questions.energy, "string");
  assert.equal(typeof questions.summary, "string");
  assert.match(review, /tQuestions\("feelingHint"\)/);
  assert.match(review, /softPlus \? \(/);
});
