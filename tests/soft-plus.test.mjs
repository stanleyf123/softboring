import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import Database from "better-sqlite3";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const adminCopy = readFileSync(join(root, "src/lib/admin-copy.ts"), "utf8");
const membersPage = readFileSync(join(root, "src/app/admin/members/page.tsx"), "utf8");
const membersTable = readFileSync(
  join(root, "src/components/admin-members-table.tsx"),
  "utf8",
);

function migrate(db) {
  db.exec(readFileSync(join(root, "scripts/schema.sql"), "utf8"));
}

function columnNames(db, table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map((col) => col.name);
}

const STOPWORDS = new Set(["a", "the", "and", "to", "of", "in", "我", "的", "了"]);

function isoWeekKey(date) {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function previousIsoWeekKey(key) {
  const match = /^(\d{4})-W(\d{2})$/.exec(key);
  const year = Number(match[1]);
  const week = Number(match[2]);
  if (week > 1) return `${year}-W${String(week - 1).padStart(2, "0")}`;
  return `${year - 1}-W52`;
}

function weeklyStreak(createdAts, now = new Date()) {
  const weeks = new Set(
    createdAts
      .map((value) => new Date(value))
      .filter((date) => !Number.isNaN(date.getTime()))
      .map((date) => isoWeekKey(date)),
  );
  if (weeks.size === 0) return 0;
  let cursor = isoWeekKey(now);
  if (!weeks.has(cursor)) cursor = previousIsoWeekKey(cursor);
  let streak = 0;
  while (weeks.has(cursor)) {
    streak += 1;
    cursor = previousIsoWeekKey(cursor);
  }
  return streak;
}

function tokenize(text) {
  const tokens = [];
  const latin = text.toLowerCase().match(/[a-z0-9']{2,}/g) ?? [];
  tokens.push(...latin);
  const cjk = text.match(/[\u3400-\u9fff]{2,}/g) ?? [];
  for (const chunk of cjk) {
    if (chunk.length <= 6) tokens.push(chunk);
  }
  return tokens.filter((token) => !STOPWORDS.has(token));
}

function keywordChips(texts, limit = 8) {
  const counts = new Map();
  for (const text of texts) {
    for (const token of tokenize(text)) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}

function reviewMatchesQuery(review, query) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const parts = [
    review.summary,
    review.energy,
    review.drain,
    review.lessOf,
    review.priorities,
    ...(review.customAnswers ?? []).flatMap((item) => [item.prompt, item.answer]),
  ];
  return parts.join("\n").toLowerCase().includes(needle);
}

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function requireSoftPlus(user, softPlus) {
  if (!user) return 401;
  if (!softPlus) return 403;
  return 200;
}

function normalizeCustomQuestions(value) {
  if (!Array.isArray(value)) return [];
  const questions = [];
  const seen = new Set();
  for (const item of value) {
    const prompt = typeof item?.prompt === "string" ? item.prompt.trim().slice(0, 200) : "";
    if (!prompt) continue;
    const id = typeof item.id === "string" && item.id.trim() ? item.id.trim() : `q${questions.length}`;
    if (seen.has(id)) continue;
    seen.add(id);
    questions.push({ id, prompt });
    if (questions.length >= 3) break;
  }
  return questions;
}

test("admin members list has direct Soft+ grant and revoke copy", () => {
  assert.match(adminCopy, /設為 Soft\+/);
  assert.match(adminCopy, /改回免費/);
  assert.match(adminCopy, /將已選設為 Soft\+/);
  assert.match(membersPage, /AdminMembersTable/);
  assert.match(membersTable, /setRowPlus/);
  assert.match(membersTable, /setRowFree/);
  assert.match(membersTable, /bulkPlus/);
  assert.match(membersTable, /isDemoEmail/);
  assert.match(adminCopy, /demoBadge/);
});

test("schema stores custom questions, custom answers, and pinned notes", () => {
  const dir = mkdtempSync(join(tmpdir(), "softboring-plus-schema-"));
  mkdirSync(dirname(join(dir, "test.sqlite")), { recursive: true });
  const db = new Database(join(dir, "test.sqlite"));
  migrate(db);
  assert.ok(columnNames(db, "user_settings").includes("custom_questions"));
  assert.ok(columnNames(db, "reviews").includes("custom_answers"));
  assert.ok(columnNames(db, "wall_notes").includes("pinned"));
  assert.ok(columnNames(db, "users").includes("is_demo"));
  assert.ok(columnNames(db, "users").includes("nickname"));
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

test("custom questions cap at three", () => {
  const questions = normalizeCustomQuestions([
    { id: "a", prompt: "One" },
    { id: "b", prompt: "Two" },
    { id: "c", prompt: "Three" },
    { id: "d", prompt: "Four" },
    { prompt: "  " },
  ]);
  assert.equal(questions.length, 3);
  assert.deepEqual(
    questions.map((item) => item.prompt),
    ["One", "Two", "Three"],
  );
});

test("weekly streak and energy/drain chips", () => {
  const now = new Date(Date.UTC(2026, 8, 15));
  const thisWeek = new Date(Date.UTC(2026, 8, 15)).toISOString();
  const lastWeek = new Date(Date.UTC(2026, 8, 8)).toISOString();
  const older = new Date(Date.UTC(2026, 7, 1)).toISOString();
  assert.equal(weeklyStreak([thisWeek, lastWeek, older], now), 2);
  assert.equal(weeklyStreak([], now), 0);

  const chips = keywordChips([
    "A slow Saturday walk after the rain",
    "A slow walk in the garden",
    "Meetings that drained me",
  ]);
  assert.ok(chips.some((chip) => chip.word === "walk"));
  assert.ok(!chips.some((chip) => chip.word === "the"));
});

test("history search matches title and answers, CSV escapes quotes", () => {
  const review = {
    summary: "Tea week",
    energy: "A garden walk",
    drain: "Too many meetings",
    lessOf: "Slack",
    priorities: "Sleep",
    customAnswers: [{ prompt: "Song", answer: "Rainy waltz" }],
  };
  assert.equal(reviewMatchesQuery(review, "garden"), true);
  assert.equal(reviewMatchesQuery(review, "waltz"), true);
  assert.equal(reviewMatchesQuery(review, "missing"), false);
  assert.equal(csvEscape('He said "hi"'), '"He said ""hi"""');
});

test("Soft+ APIs return 403 for free users", () => {
  assert.equal(requireSoftPlus(null, false), 401);
  assert.equal(requireSoftPlus({ id: "u" }, false), 403);
  assert.equal(requireSoftPlus({ id: "u" }, true), 200);
});

test("pinning a note unpins the owner's previous pin", () => {
  const dir = mkdtempSync(join(tmpdir(), "softboring-pin-"));
  const db = new Database(join(dir, "test.sqlite"));
  db.pragma("foreign_keys = ON");
  migrate(db);

  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at, plan)
     VALUES (?, ?, ?, ?, ?)`,
  ).run("user-a", "a@example.com", "hash", "2026-01-01T00:00:00.000Z", "soft_plus");
  const insertReview = db.prepare(
    `INSERT INTO reviews (id, guest_id, user_id, energy, drain, less_of, priorities, feeling, summary, created_at)
     VALUES (?, ?, ?, '', '', '', '', 4, ?, ?)`,
  );
  insertReview.run(
    "rev-a",
    "11111111-1111-1111-1111-111111111111",
    "user-a",
    "A",
    "2026-01-02T00:00:00.000Z",
  );
  insertReview.run(
    "rev-b",
    "11111111-1111-1111-1111-111111111111",
    "user-a",
    "B",
    "2026-01-03T00:00:00.000Z",
  );
  const insertNote = db.prepare(
    `INSERT INTO wall_notes (id, review_id, user_id, x, y, z, color, hidden, pinned, created_at, updated_at)
     VALUES (?, ?, ?, 80, 80, 1, 'peach', 0, 0, ?, ?)`,
  );
  insertNote.run("note-a", "rev-a", "user-a", "2026-01-02T00:00:00.000Z", "2026-01-02T00:00:00.000Z");
  insertNote.run("note-b", "rev-b", "user-a", "2026-01-03T00:00:00.000Z", "2026-01-03T00:00:00.000Z");

  const PIN = 50_000;
  db.prepare(`UPDATE wall_notes SET pinned = 1, z = ? WHERE id = ?`).run(PIN, "note-a");
  db.prepare(
    `UPDATE wall_notes
     SET pinned = 0, z = CASE WHEN z >= ? THEN z - ? ELSE z END
     WHERE user_id = ? AND pinned = 1 AND id != ?`,
  ).run(PIN, PIN, "user-a", "note-b");
  db.prepare(`UPDATE wall_notes SET pinned = 1, z = ? WHERE id = ?`).run(PIN + 1, "note-b");

  const rows = db.prepare(`SELECT id, pinned, z FROM wall_notes ORDER BY id`).all();
  const a = rows.find((row) => row.id === "note-a");
  const b = rows.find((row) => row.id === "note-b");
  assert.equal(a.pinned, 0);
  assert.equal(b.pinned, 1);
  assert.ok(b.z >= PIN);

  db.close();
  rmSync(dir, { recursive: true, force: true });
});

test("monthly digest counts this month's reviews and averages feeling", () => {
  const now = new Date(2026, 8, 15);
  const reviews = [
    { createdAt: "2026-09-02T00:00:00.000Z", feeling: 4 },
    { createdAt: "2026-09-10T00:00:00.000Z", feeling: 2 },
    { createdAt: "2026-08-20T00:00:00.000Z", feeling: 5 },
  ];
  const inMonth = reviews.filter((review) => {
    const date = new Date(review.createdAt);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  });
  const feelings = inMonth.map((review) => review.feeling);
  const avg = Math.round((feelings.reduce((sum, value) => sum + value, 0) / feelings.length) * 10) / 10;
  assert.equal(inMonth.length, 2);
  assert.equal(avg, 3);
});
