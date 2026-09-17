import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { DAILY_POOL, SEED_REVIEW_PAIRS } from "./demo-content.mjs";

export const DEMO_EMAIL_DOMAIN = "softboring.demo";
export const DEMO_USER_COUNT = 10;
export const DEFAULT_DEMO_PASSWORD = "softboring-demo-2026";
export const DEMO_LOCALE = "zh-tw";
export const TAIPEI_TZ = "Asia/Taipei";
export const PROTECTED_EMAILS = ["stanleys1225@gmail.com"];
export const BCRYPT_ROUNDS = 10;
export const WALL_PIN_Z = 50_000;
export const WALL_CANVAS = { width: 2800, height: 2000, noteWidth: 216, noteHeight: 236 };
export const WALL_COLORS = ["peach", "blush", "mint", "cream", "lemon", "sky"];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isDemoEmail(email) {
  if (!email || typeof email !== "string") return false;
  return email.trim().toLowerCase().endsWith(`@${DEMO_EMAIL_DOMAIN}`);
}

export function isProtectedEmail(email) {
  if (!email || typeof email !== "string") return false;
  const needle = email.trim().toLowerCase();
  return PROTECTED_EMAILS.some((protectedEmail) => protectedEmail.toLowerCase() === needle);
}

export function padDemoIndex(index) {
  return String(index).padStart(2, "0");
}

/** @param {number} index 1–10 */
export function demoEmail(index) {
  return `demo${padDemoIndex(index)}@${DEMO_EMAIL_DOMAIN}`;
}

export function listDemoEmails() {
  return Array.from({ length: DEMO_USER_COUNT }, (_, i) => demoEmail(i + 1));
}

export function demoUserId(index) {
  return `demo-user-${padDemoIndex(index)}`;
}

export function demoGuestId(index) {
  const n = padDemoIndex(index);
  return `d00000${n}-e000-4000-a000-0000000000${n}`;
}

export function seedReviewId(index, slot) {
  return `demo-seed-${padDemoIndex(index)}-${slot}`;
}

export function seedWallNoteId(index, slot) {
  return `demo-wall-seed-${padDemoIndex(index)}-${slot}`;
}

export function dailyReviewId(index, dateKey) {
  return `demo-daily-${padDemoIndex(index)}-${dateKey}`;
}

export function dailyWallNoteId(index, dateKey) {
  return `demo-wall-daily-${padDemoIndex(index)}-${dateKey}`;
}

export function demoPassword() {
  const fromEnv = process.env.DEMO_PASSWORD?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_DEMO_PASSWORD;
}

export function hashDemoPassword(password = demoPassword()) {
  return bcrypt.hashSync(password, BCRYPT_ROUNDS);
}

export function taipeiDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TAIPEI_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function addTaipeiDays(dateKey, delta) {
  const noon = new Date(`${dateKey}T12:00:00+08:00`);
  noon.setTime(noon.getTime() + delta * 86_400_000);
  return taipeiDateKey(noon);
}

export function hashString(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function dailyPosterCount(dateKey) {
  return 3 + (hashString(`count:${dateKey}`) % 3);
}

/** Pick 3–5 unique demo indexes (0–9) from the calendar day in Taipei. */
export function pickDailyDemoIndexes(dateKey, count = dailyPosterCount(dateKey)) {
  const n = Math.min(DEMO_USER_COUNT, Math.max(3, Math.min(5, count)));
  const rand = mulberry32(hashString(`softboring-daily:${dateKey}`));
  const indexes = Array.from({ length: DEMO_USER_COUNT }, (_, i) => i);
  for (let i = indexes.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
  }
  return indexes.slice(0, n);
}

export function pickDailyContent(userIndex, dateKey) {
  const todayIdx = hashString(`daily:${userIndex}:${dateKey}`) % DAILY_POOL.length;
  const yesterday = addTaipeiDays(dateKey, -1);
  const yesterdayIdx = hashString(`daily:${userIndex}:${yesterday}`) % DAILY_POOL.length;
  const idx = todayIdx === yesterdayIdx ? (todayIdx + 1) % DAILY_POOL.length : todayIdx;
  return DAILY_POOL[idx];
}

export function seedReviewContent(userIndex, slot) {
  const pair = SEED_REVIEW_PAIRS[userIndex - 1];
  return pair[slot - 1];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function wallLayoutForIndex(index) {
  const col = index % 5;
  const row = Math.floor(index / 5) % 4;
  const wave = Math.floor(index / 20);
  const x = 96 + col * 500 + (index % 3) * 28 + ((index * 17) % 36) + (wave % 7) * 18;
  const y = 88 + row * 380 + (index % 2) * 24 + ((index * 29) % 40) + (wave % 5) * 22;
  return {
    x: clamp(x, 24, WALL_CANVAS.width - WALL_CANVAS.noteWidth - 24),
    y: clamp(y, 24, WALL_CANVAS.height - WALL_CANVAS.noteHeight - 24),
    color: WALL_COLORS[index % WALL_COLORS.length],
  };
}

export function resolveSqlitePath() {
  const fromEnv = process.env.SQLITE_PATH?.trim();
  const configured = fromEnv && fromEnv.length > 0 ? fromEnv : "./data/softboring.sqlite";
  if (isAbsolute(configured)) return configured;
  return resolve(process.cwd(), configured);
}

export function openSqlite(sqlitePath = resolveSqlitePath()) {
  mkdirSync(dirname(sqlitePath), { recursive: true });
  const db = new Database(sqlitePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  return db;
}

export function ensureDemoColumn(db) {
  const table = db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'`)
    .get();
  if (!table) {
    throw new Error("users table is missing; run npm run db:migrate first");
  }
  const cols = db.prepare(`PRAGMA table_info(users)`).all().map((col) => col.name);
  if (!cols.includes("is_demo")) {
    db.exec(`ALTER TABLE users ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0`);
  }
}

function userColumnSet(db) {
  return new Set(db.prepare(`PRAGMA table_info(users)`).all().map((col) => col.name));
}

function ensureSettings(db, userId) {
  db.prepare(`INSERT OR IGNORE INTO user_settings (user_id) VALUES (?)`).run(userId);
}

function insertReview(db, { id, guestId, userId, content, createdAt }) {
  db.prepare(
    `INSERT OR IGNORE INTO reviews (
      id, guest_id, user_id, energy, drain, less_of, priorities, feeling, summary, locale, custom_answers, created_at
    ) VALUES (
      @id, @guest_id, @user_id, @energy, @drain, @less_of, @priorities, @feeling, @summary, @locale, @custom_answers, @created_at
    )`,
  ).run({
    id,
    guest_id: guestId,
    user_id: userId,
    energy: content.energy,
    drain: content.drain,
    less_of: content.lessOf,
    priorities: content.priorities,
    feeling: content.feeling,
    summary: content.summary,
    locale: DEMO_LOCALE,
    custom_answers: "[]",
    created_at: createdAt,
  });
}

function nextWallZ(db) {
  const row = db
    .prepare(`SELECT COALESCE(MAX(z), 0) AS z FROM wall_notes WHERE z < ?`)
    .get(WALL_PIN_Z);
  return Math.min(WALL_PIN_Z - 1, (row?.z ?? 0) + 1);
}

function shareWallNote(db, { id, reviewId, userId, layout, createdAt, z }) {
  db.prepare(
    `INSERT OR IGNORE INTO wall_notes (
      id, review_id, user_id, x, y, z, color, hidden, pinned, created_at, updated_at
    ) VALUES (
      @id, @review_id, @user_id, @x, @y, @z, @color, 0, 0, @created_at, @updated_at
    )`,
  ).run({
    id,
    review_id: reviewId,
    user_id: userId,
    x: layout.x,
    y: layout.y,
    z,
    color: layout.color,
    created_at: createdAt,
    updated_at: createdAt,
  });
}

function upsertDemoUser(db, { index, passwordHash, nowIso }) {
  const email = demoEmail(index);
  if (isProtectedEmail(email)) {
    return { skipped: true, reason: "protected" };
  }

  const existing = db
    .prepare(`SELECT id, email FROM users WHERE email = ? COLLATE NOCASE`)
    .get(email);
  const cols = userColumnSet(db);

  if (existing) {
    if (isProtectedEmail(existing.email) || !isDemoEmail(existing.email)) {
      return { skipped: true, reason: "protected", id: existing.id };
    }
    const assignments = [
      "plan = 'soft_plus'",
      "plan_status = 'active'",
      "is_demo = 1",
      "password_hash = @password_hash",
    ];
    if (cols.has("plan_updated_at")) assignments.push("plan_updated_at = @plan_updated_at");
    db.prepare(`UPDATE users SET ${assignments.join(", ")} WHERE id = @id`).run({
      id: existing.id,
      password_hash: passwordHash,
      plan_updated_at: nowIso,
    });
    ensureSettings(db, existing.id);
    return { id: existing.id, created: false, email };
  }

  const id = demoUserId(index);
  const createdAt = new Date(Date.parse(nowIso) - (DEMO_USER_COUNT - index + 8) * 86_400_000).toISOString();
  const insertCols = ["id", "email", "password_hash", "created_at", "plan", "plan_status", "is_demo"];
  const values = {
    id,
    email,
    password_hash: passwordHash,
    created_at: createdAt,
    plan: "soft_plus",
    plan_status: "active",
    is_demo: 1,
  };
  if (cols.has("plan_updated_at")) {
    insertCols.push("plan_updated_at");
    values.plan_updated_at = nowIso;
  }
  db.prepare(
    `INSERT INTO users (${insertCols.join(", ")}) VALUES (${insertCols.map((name) => `@${name}`).join(", ")})`,
  ).run(values);
  ensureSettings(db, id);
  return { id, created: true, email };
}

function seedUserReviews(db, { index, userId, now }) {
  const guestId = demoGuestId(index);
  if (!UUID_RE.test(guestId)) {
    throw new Error(`invalid demo guest id for ${index}`);
  }
  let reviews = 0;
  let notes = 0;
  for (const slot of [1, 2]) {
    const reviewId = seedReviewId(index, slot);
    const existed = db.prepare(`SELECT id FROM reviews WHERE id = ?`).get(reviewId);
    const daysAgo = 4 + (index - 1) * 2 + (slot - 1) * 6;
    const createdAt = new Date(now.getTime() - daysAgo * 86_400_000).toISOString();
    insertReview(db, {
      id: reviewId,
      guestId,
      userId,
      content: seedReviewContent(index, slot),
      createdAt,
    });
    if (!existed) reviews += 1;

    const noteId = seedWallNoteId(index, slot);
    const noteExisted = db.prepare(`SELECT id FROM wall_notes WHERE id = ?`).get(noteId);
    const layoutIndex = (index - 1) * 2 + (slot - 1);
    shareWallNote(db, {
      id: noteId,
      reviewId,
      userId,
      layout: wallLayoutForIndex(layoutIndex),
      createdAt,
      z: layoutIndex + 1,
    });
    if (!noteExisted) notes += 1;
  }
  return { reviews, notes };
}

export function seedDemoAccounts(db, { now = new Date(), password = demoPassword() } = {}) {
  ensureDemoColumn(db);
  const nowIso = now.toISOString();
  const passwordHash = hashDemoPassword(password);
  const result = {
    usersCreated: 0,
    usersUpdated: 0,
    reviewsInserted: 0,
    wallNotesInserted: 0,
    skippedProtected: 0,
  };

  const run = db.transaction(() => {
    for (let index = 1; index <= DEMO_USER_COUNT; index += 1) {
      const user = upsertDemoUser(db, { index, passwordHash, nowIso });
      if (user.skipped) {
        result.skippedProtected += 1;
        continue;
      }
      if (user.created) result.usersCreated += 1;
      else result.usersUpdated += 1;
      const seeded = seedUserReviews(db, { index, userId: user.id, now });
      result.reviewsInserted += seeded.reviews;
      result.wallNotesInserted += seeded.notes;
    }
  });
  run();
  return result;
}

function existingDemoUser(db, index) {
  const email = demoEmail(index);
  return db
    .prepare(
      `SELECT id, email, is_demo FROM users WHERE email = ? COLLATE NOCASE`,
    )
    .get(email);
}

export function postDailyDemoNotes(db, { now = new Date() } = {}) {
  ensureDemoColumn(db);
  const dateKey = taipeiDateKey(now);
  const indexes = pickDailyDemoIndexes(dateKey);
  const nowIso = now.toISOString();
  const result = {
    dateKey,
    selected: indexes.map((i) => demoEmail(i + 1)),
    posted: 0,
    skipped: 0,
    missing: 0,
  };

  const run = db.transaction(() => {
    for (const zeroIndex of indexes) {
      const index = zeroIndex + 1;
      const user = existingDemoUser(db, index);
      if (!user || isProtectedEmail(user.email) || !isDemoEmail(user.email)) {
        result.missing += 1;
        continue;
      }

      const reviewId = dailyReviewId(index, dateKey);
      const already = db.prepare(`SELECT id FROM reviews WHERE id = ?`).get(reviewId);
      if (already) {
        result.skipped += 1;
        continue;
      }

      const content = pickDailyContent(index, dateKey);
      insertReview(db, {
        id: reviewId,
        guestId: demoGuestId(index),
        userId: user.id,
        content,
        createdAt: nowIso,
      });

      const wallCount = db.prepare(`SELECT COUNT(*) AS n FROM wall_notes`).get().n;
      shareWallNote(db, {
        id: dailyWallNoteId(index, dateKey),
        reviewId,
        userId: user.id,
        layout: wallLayoutForIndex(wallCount + index),
        createdAt: nowIso,
        z: nextWallZ(db),
      });
      result.posted += 1;
    }
  });
  run();
  return result;
}

export function listDemoUserRows(db) {
  ensureDemoColumn(db);
  return db
    .prepare(
      `SELECT id, email, plan, plan_status, is_demo
       FROM users
       WHERE email LIKE ? COLLATE NOCASE OR is_demo = 1
       ORDER BY email`,
    )
    .all(`%@${DEMO_EMAIL_DOMAIN}`);
}

export function purgeDemoAccounts(db) {
  ensureDemoColumn(db);
  const rows = listDemoUserRows(db);
  let deleted = 0;
  const run = db.transaction(() => {
    for (const row of rows) {
      if (isProtectedEmail(row.email) || !isDemoEmail(row.email)) continue;
      deleted += db.prepare(`DELETE FROM users WHERE id = ?`).run(row.id).changes;
    }
  });
  run();
  return { deleted };
}
