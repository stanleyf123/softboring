import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import Database from "better-sqlite3";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

const FREE_HISTORY_LIMIT = 4;
const SOFT_MEMORY_MIN_AGE_MS = 28 * 24 * 60 * 60 * 1000;

function utcDayNumber(date) {
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) /
      86_400_000,
  );
}

function shouldSurfaceSoftMemory(date = new Date()) {
  return utcDayNumber(date) % 3 !== 0;
}

function noteExcerpt(summary, energy) {
  const fromSummary = summary.trim();
  if (fromSummary) return fromSummary.slice(0, 96);
  return energy.trim().slice(0, 96);
}

function pickSoftMemory(reviewsNewestFirst, softPlus, now = new Date()) {
  if (!shouldSurfaceSoftMemory(now)) return null;
  const cutoff = now.getTime() - SOFT_MEMORY_MIN_AGE_MS;
  const eligible = reviewsNewestFirst
    .map((review, index) => ({ review, index }))
    .filter(({ review }) => Date.parse(review.createdAt) <= cutoff);
  if (eligible.length === 0) return null;
  const pick = eligible[utcDayNumber(now) % eligible.length];
  const unlocked = softPlus || pick.index < FREE_HISTORY_LIMIT;
  return {
    id: pick.review.id,
    createdAt: pick.review.createdAt,
    excerpt: unlocked ? noteExcerpt(pick.review.summary, pick.review.energy) : "",
    locked: !unlocked,
  };
}

test("soft memory picks 4+ week reviews and respects free window", () => {
  const now = new Date(Date.UTC(2026, 8, 23)); // day % 3 !== 0 → surfaces
  assert.equal(shouldSurfaceSoftMemory(now), true);
  assert.equal(shouldSurfaceSoftMemory(new Date(Date.UTC(2026, 8, 22))), false);

  const reviews = [
    {
      id: "new",
      createdAt: "2026-09-20T00:00:00.000Z",
      summary: "this week",
      energy: "",
    },
    {
      id: "old-free",
      createdAt: "2026-08-01T00:00:00.000Z",
      summary: "tea in August",
      energy: "",
    },
    {
      id: "older",
      createdAt: "2026-07-01T00:00:00.000Z",
      summary: "July quiet",
      energy: "",
    },
    {
      id: "oldest",
      createdAt: "2026-06-01T00:00:00.000Z",
      summary: "June soft",
      energy: "",
    },
    {
      id: "locked-age",
      createdAt: "2026-05-01T00:00:00.000Z",
      summary: "May secret",
      energy: "",
    },
  ];

  const plus = pickSoftMemory(reviews, true, now);
  assert.ok(plus);
  assert.equal(plus.locked, false);
  assert.ok(plus.excerpt.length > 0);

  const free = pickSoftMemory(reviews, false, now);
  assert.ok(free);
  const chosenIndex = reviews.findIndex((r) => r.id === free.id);
  assert.ok(chosenIndex >= 0);
  if (chosenIndex >= FREE_HISTORY_LIMIT) {
    assert.equal(free.locked, true);
    assert.equal(free.excerpt, "");
  } else {
    assert.equal(free.locked, false);
    assert.ok(free.excerpt.length > 0);
  }

  const lib = read("src/lib/soft-memory.ts");
  const card = read("src/components/soft-memory-card.tsx");
  const home = read("src/app/[locale]/page.tsx");
  const account = read("src/app/[locale]/account/page.tsx");
  assert.match(lib, /SOFT_MEMORY_MIN_AGE_MS/);
  assert.match(lib, /shouldSurfaceSoftMemory/);
  assert.match(lib, /pickSoftMemory/);
  assert.match(card, /SoftMemory/);
  assert.match(home, /SoftMemoryCard/);
  assert.match(home, /pickSoftMemory/);
  assert.match(account, /softMemory/);
  assert.doesNotMatch(lib, /stripe|RESEND|SMTP/i);
});

test("quiet writing hides chrome via html data attribute", () => {
  const lib = read("src/lib/quiet-writing.ts");
  const ui = read("src/components/quiet-writing.tsx");
  const review = read("src/app/[locale]/review/page.tsx");
  const layout = read("src/app/[locale]/layout.tsx");
  const css = read("src/app/globals.css");
  const onboarding = read("src/components/onboarding-card.tsx");

  assert.match(lib, /QUIET_WRITING_ATTR/);
  assert.match(lib, /sessionStorage/);
  assert.match(ui, /QuietWritingToggle/);
  assert.match(ui, /QuietWritingExit/);
  assert.match(ui, /QuietWritingSync/);
  assert.match(review, /QuietWritingToggle/);
  assert.match(review, /quiet-writing-chrome/);
  assert.match(layout, /QuietWritingSync/);
  assert.match(layout, /QuietWritingExit/);
  assert.match(css, /data-quiet-writing/);
  assert.match(css, /\[data-bottom-nav\]/);
  assert.match(onboarding, /data-onboarding/);
  assert.doesNotMatch(ui, /stripe|RESEND|SMTP/i);
});

test("wall note flags table, Soft+ report API, admin flag column, clearer unshare", () => {
  const schema = read("scripts/schema.sql");
  const migrate = read("src/db/migrate.ts");
  const flags = read("src/db/wall-flags.ts");
  const wall = read("src/db/wall.ts");
  const api = read("src/app/api/wall/notes/[id]/flag/route.ts");
  const noteApi = read("src/app/api/wall/notes/[id]/route.ts");
  const board = read("src/components/wall-board.tsx");
  const adminPage = read("src/app/admin/wall/page.tsx");
  const adminCopy = read("src/lib/admin-copy.ts");

  assert.match(schema, /CREATE TABLE IF NOT EXISTS wall_note_flags/);
  assert.match(schema, /UNIQUE \(note_id, reporter_id\)/);
  assert.match(migrate, /ensureWallNoteFlags/);
  assert.match(flags, /flagWallNote/);
  assert.match(flags, /FlagOwnNoteError/);
  assert.match(flags, /attachFlagToDetail/);
  assert.match(wall, /flag_count/);
  assert.match(wall, /flagCount/);
  assert.match(api, /requireSoftPlus/);
  assert.match(api, /flagWallNote/);
  assert.match(noteApi, /attachFlagToDetail/);
  assert.match(board, /reportFeelsOff/);
  assert.match(board, /unshareTitle/);
  assert.match(board, /reportNote/);
  assert.match(adminPage, /flagCount/);
  assert.match(adminCopy, /flags:/);
  assert.doesNotMatch(flags, /stripe|RESEND|SMTP/i);
});

test("wall note flag insert is once per Soft+ reporter", () => {
  const dir = mkdtempSync(join(tmpdir(), "softboring-flags-"));
  const sqlitePath = join(dir, "test.sqlite");
  mkdirSync(dirname(sqlitePath), { recursive: true });
  const db = new Database(sqlitePath);
  db.pragma("foreign_keys = ON");
  db.exec(read("scripts/schema.sql"));

  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at, plan)
     VALUES (?, ?, ?, ?, ?)`,
  ).run("owner", "owner@example.com", "hash", "2026-01-01T00:00:00.000Z", "soft_plus");
  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at, plan)
     VALUES (?, ?, ?, ?, ?)`,
  ).run("viewer", "viewer@example.com", "hash", "2026-01-01T00:00:00.000Z", "soft_plus");

  db.prepare(
    `INSERT INTO reviews (
      id, guest_id, user_id, energy, drain, less_of, priorities, feeling, summary, locale, created_at
    ) VALUES (?, ?, ?, ?, '', '', '', 4, ?, NULL, ?)`,
  ).run(
    "rev-a",
    "11111111-1111-1111-1111-111111111111",
    "owner",
    "energy",
    "A quiet week",
    "2026-01-02T00:00:00.000Z",
  );

  db.prepare(
    `INSERT INTO wall_notes (
      id, review_id, user_id, x, y, z, color, hidden, pinned, created_at, updated_at
    ) VALUES (?, ?, ?, 80, 90, 1, 'peach', 0, 0, ?, ?)`,
  ).run(
    "note-a",
    "rev-a",
    "owner",
    "2026-01-02T00:00:00.000Z",
    "2026-01-02T00:00:00.000Z",
  );

  const insert = db.prepare(
    `INSERT INTO wall_note_flags (id, note_id, reporter_id, created_at)
     VALUES (?, ?, ?, ?)`,
  );
  insert.run("flag-1", "note-a", "viewer", "2026-01-03T00:00:00.000Z");
  assert.throws(() =>
    insert.run("flag-2", "note-a", "viewer", "2026-01-04T00:00:00.000Z"),
  );

  const count = db
    .prepare(`SELECT COUNT(*) AS n FROM wall_note_flags WHERE note_id = ?`)
    .get("note-a");
  assert.equal(count.n, 1);

  db.close();
  rmSync(dir, { recursive: true, force: true });
});

test("memory / quiet / wall report copy exists in en, zh-tw, and ja", () => {
  for (const locale of ["en", "zh-tw", "ja"]) {
    const messages = readJson(`messages/${locale}.json`);
    assert.equal(typeof messages.SoftMemory.title, "string");
    assert.equal(typeof messages.SoftMemory.teaser, "string");
    assert.equal(typeof messages.Review.quietEnter, "string");
    assert.equal(typeof messages.Review.quietExit, "string");
    assert.equal(typeof messages.Wall.unshareTitle, "string");
    assert.equal(typeof messages.Wall.reportFeelsOff, "string");
    assert.equal(typeof messages.Wall.reportThanks, "string");
  }
});

test("print checklist bookmarks stay wired after this round", () => {
  assert.match(read("src/components/soft-week-print.tsx"), /soft-week-print/);
  assert.match(read("src/components/soft-postcard-button.tsx"), /printWeek/);
  assert.match(read("src/components/onboarding-card.tsx"), /VISIBLE_PATHS/);
  assert.match(read("src/db/wall-bookmarks.ts"), /listBookmarkedWallNotes/);
  assert.match(read("src/db/user-settings.ts"), /preferredWallColor/);
});
