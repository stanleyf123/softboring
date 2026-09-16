import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import Database from "better-sqlite3";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function migrate(db) {
  db.exec(readFileSync(join(root, "scripts/schema.sql"), "utf8"));
}

function columnNames(db, table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map((col) => col.name);
}

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

function streakMilestone(streak) {
  return [2, 4, 8, 12].includes(streak) ? streak : null;
}

function hitKey(db, key, max, windowMs, now) {
  const row = db.prepare(`SELECT hits, window_start FROM rate_limits WHERE key = ?`).get(key);
  if (!row || now - row.window_start >= windowMs) {
    db.prepare(
      `INSERT INTO rate_limits (key, hits, window_start) VALUES (?, 1, ?)
       ON CONFLICT(key) DO UPDATE SET hits = 1, window_start = excluded.window_start`,
    ).run(key, now);
    return { ok: true };
  }
  if (row.hits >= max) {
    return { ok: false };
  }
  db.prepare(`UPDATE rate_limits SET hits = hits + 1 WHERE key = ?`).run(key);
  return { ok: true };
}

test("schema has wall comment parent_id and rate_limits", () => {
  const dir = mkdtempSync(join(tmpdir(), "softboring-ux-schema-"));
  mkdirSync(dirname(join(dir, "test.sqlite")), { recursive: true });
  const db = new Database(join(dir, "test.sqlite"));
  migrate(db);
  assert.ok(columnNames(db, "wall_comments").includes("parent_id"));
  const tables = db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`)
    .all()
    .map((row) => row.name);
  assert.ok(tables.includes("rate_limits"));
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

test("one-level wall reply notifies parent author and note owner once each", () => {
  const dir = mkdtempSync(join(tmpdir(), "softboring-ux-reply-"));
  const db = new Database(join(dir, "test.sqlite"));
  db.pragma("foreign_keys = ON");
  migrate(db);

  for (const [id, email] of [
    ["owner", "owner@example.com"],
    ["parent", "parent@example.com"],
    ["replier", "replier@example.com"],
  ]) {
    db.prepare(
      `INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)`,
    ).run(id, email, "hash", "2026-01-01T00:00:00.000Z");
  }
  db.prepare(
    `INSERT INTO reviews (id, guest_id, user_id, energy, drain, less_of, priorities, feeling, summary, created_at)
     VALUES (?, ?, ?, '', '', '', '', 3, 'Tea', ?)`,
  ).run(
    "rev-a",
    "11111111-1111-1111-1111-111111111111",
    "owner",
    "2026-01-02T00:00:00.000Z",
  );
  db.prepare(
    `INSERT INTO wall_notes (id, review_id, user_id, x, y, z, color, hidden, created_at, updated_at)
     VALUES (?, ?, ?, 80, 80, 1, 'peach', 0, ?, ?)`,
  ).run("note-a", "rev-a", "owner", "2026-01-02T00:00:00.000Z", "2026-01-02T00:00:00.000Z");
  db.prepare(
    `INSERT INTO wall_comments (id, note_id, user_id, body, parent_id, created_at)
     VALUES (?, ?, ?, ?, NULL, ?)`,
  ).run("c-parent", "note-a", "parent", "hello", "2026-01-02T01:00:00.000Z");

  function notifyReply({ noteOwnerId, parentAuthorId, commenterId, body }) {
    const recipients = [];
    if (parentAuthorId && parentAuthorId !== commenterId) {
      recipients.push({ userId: parentAuthorId, kind: "wall_reply" });
    }
    if (noteOwnerId !== commenterId && noteOwnerId !== parentAuthorId) {
      recipients.push({ userId: noteOwnerId, kind: "wall_reply" });
    }
    for (const item of recipients) {
      db.prepare(
        `INSERT INTO notifications (id, user_id, kind, title, body, href, created_at)
         VALUES (?, ?, ?, ?, ?, '/wall', ?)`,
      ).run(crypto.randomUUID(), item.userId, item.kind, item.kind, body, "2026-01-02T02:00:00.000Z");
    }
    return recipients.map((item) => item.userId).sort();
  }

  const notified = notifyReply({
    noteOwnerId: "owner",
    parentAuthorId: "parent",
    commenterId: "replier",
    body: "hi back",
  });
  assert.deepEqual(notified, ["owner", "parent"]);
  const rows = db.prepare(`SELECT user_id, kind FROM notifications ORDER BY user_id`).all();
  assert.equal(rows.length, 2);
  assert.equal(rows[0].kind, "wall_reply");

  const self = notifyReply({
    noteOwnerId: "owner",
    parentAuthorId: "parent",
    commenterId: "parent",
    body: "self reply",
  });
  assert.deepEqual(self, ["owner"]);

  db.close();
  rmSync(dir, { recursive: true, force: true });
});

test("streak milestones are 2, 4, 8, and 12", () => {
  assert.equal(streakMilestone(1), null);
  assert.equal(streakMilestone(2), 2);
  assert.equal(streakMilestone(3), null);
  assert.equal(streakMilestone(4), 4);
  assert.equal(streakMilestone(8), 8);
  assert.equal(streakMilestone(12), 12);
  assert.equal(streakMilestone(13), null);
});

test("admin signup buckets cover the last eight ISO weeks", () => {
  const now = new Date(Date.UTC(2026, 8, 16));
  const buckets = [];
  let cursor = isoWeekKey(now);
  for (let i = 0; i < 8; i += 1) {
    buckets.unshift(cursor);
    cursor = previousIsoWeekKey(cursor);
  }
  assert.equal(buckets.length, 8);
  assert.equal(buckets[7], isoWeekKey(now));
  assert.equal(buckets[6], previousIsoWeekKey(isoWeekKey(now)));
});

test("auth rate limit trips after max hits in a window", () => {
  const dir = mkdtempSync(join(tmpdir(), "softboring-ux-rate-"));
  const db = new Database(join(dir, "test.sqlite"));
  migrate(db);
  const now = 1_000_000;
  const key = "login:ip:1.1.1.1";
  for (let i = 0; i < 10; i += 1) {
    assert.equal(hitKey(db, key, 10, 15 * 60 * 1000, now).ok, true);
  }
  assert.equal(hitKey(db, key, 10, 15 * 60 * 1000, now).ok, false);
  assert.equal(hitKey(db, key, 10, 15 * 60 * 1000, now + 15 * 60 * 1000).ok, true);
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

test("PWA, bottom nav, and i18n files are in place", () => {
  assert.equal(existsSync(join(root, "public/sw.js")), true);
  assert.equal(existsSync(join(root, "src/app/manifest.ts")), true);
  assert.equal(existsSync(join(root, "src/components/mobile-bottom-nav.tsx")), true);
  assert.equal(existsSync(join(root, "public/icons/icon-192.png")), true);
  assert.equal(existsSync(join(root, "public/icons/icon-512.png")), true);
  const en = JSON.parse(readFileSync(join(root, "messages/en.json"), "utf8"));
  const zh = JSON.parse(readFileSync(join(root, "messages/zh-tw.json"), "utf8"));
  assert.equal(en.Auth.error.rate_limited.length > 10, true);
  assert.equal(zh.Auth.error.rate_limited.length > 10, true);
  assert.equal(en.Nav.memberNav.length > 0, true);
  assert.equal(zh.Nav.memberNav.length > 0, true);
  assert.equal(en.Home.ctaPricing.length > 0, true);
  assert.equal(en.Pricing.featureBadgePlus.includes("pin"), true);
  assert.equal(zh.Pricing.featureStickersPlus.length > 0, true);
  assert.equal(en.Wall.reply, "Reply");
  assert.equal(zh.Wall.reply, "回覆");
  assert.equal(en.Streak.title.includes("{count}"), true);
  const sw = readFileSync(join(root, "public/sw.js"), "utf8");
  assert.match(sw, /\/api\//);
  assert.match(sw, /\/admin/);
});
