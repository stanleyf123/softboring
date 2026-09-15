import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import Database from "better-sqlite3";
import { listDueReminderUsers } from "../scripts/dispatch-reminders.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function migrate(db) {
  db.exec(readFileSync(join(root, "scripts/schema.sql"), "utf8"));
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

test("password reset tokens expire and can be consumed once", () => {
  const dir = mkdtempSync(join(tmpdir(), "softboring-reset-"));
  mkdirSync(dirname(join(dir, "test.sqlite")), { recursive: true });
  const db = new Database(join(dir, "test.sqlite"));
  db.pragma("foreign_keys = ON");
  migrate(db);

  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)`,
  ).run("user-a", "a@example.com", "hash", "2026-01-01T00:00:00.000Z");

  const token = "a".repeat(64);
  const tokenHash = hashToken(token);
  db.prepare(
    `INSERT INTO password_reset_tokens (token_hash, user_id, expires_at, created_at)
     VALUES (?, ?, ?, ?)`,
  ).run(
    tokenHash,
    "user-a",
    "2026-01-01T00:30:00.000Z",
    "2026-01-01T00:00:00.000Z",
  );

  const expired = db
    .prepare(
      `SELECT token_hash FROM password_reset_tokens
       WHERE token_hash = ? AND used_at IS NULL AND datetime(expires_at) > datetime(?)`,
    )
    .get(tokenHash, "2026-01-01T01:00:00.000Z");
  assert.equal(expired, undefined);

  db.prepare(`UPDATE password_reset_tokens SET expires_at = ? WHERE token_hash = ?`).run(
    "2026-01-01T02:00:00.000Z",
    tokenHash,
  );
  const valid = db
    .prepare(
      `SELECT user_id FROM password_reset_tokens
       WHERE token_hash = ? AND used_at IS NULL AND datetime(expires_at) > datetime(?)`,
    )
    .get(tokenHash, "2026-01-01T01:00:00.000Z");
  assert.equal(valid.user_id, "user-a");

  db.prepare(`UPDATE password_reset_tokens SET used_at = ? WHERE token_hash = ?`).run(
    "2026-01-01T01:05:00.000Z",
    tokenHash,
  );
  const reused = db
    .prepare(
      `SELECT token_hash FROM password_reset_tokens
       WHERE token_hash = ? AND used_at IS NULL AND datetime(expires_at) > datetime(?)`,
    )
    .get(tokenHash, "2026-01-01T01:10:00.000Z");
  assert.equal(reused, undefined);

  db.close();
  rmSync(dir, { recursive: true, force: true });
});

test("wall comment notifies the note owner, not the commenter", () => {
  const dir = mkdtempSync(join(tmpdir(), "softboring-notify-"));
  const db = new Database(join(dir, "test.sqlite"));
  db.pragma("foreign_keys = ON");
  migrate(db);

  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)`,
  ).run("owner", "owner@example.com", "hash", "2026-01-01T00:00:00.000Z");
  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)`,
  ).run("neighbor", "n@example.com", "hash", "2026-01-01T00:00:00.000Z");
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
  ).run(
    "note-a",
    "rev-a",
    "owner",
    "2026-01-02T00:00:00.000Z",
    "2026-01-02T00:00:00.000Z",
  );

  function notifyIfOther(ownerId, commenterId, body) {
    if (ownerId === commenterId) return 0;
    db.prepare(
      `INSERT INTO notifications (id, user_id, kind, title, body, href, created_at)
       VALUES (?, ?, 'wall_comment', 'wall_comment', ?, '/wall', ?)`,
    ).run(crypto.randomUUID(), ownerId, body, "2026-01-02T01:00:00.000Z");
    return 1;
  }

  assert.equal(notifyIfOther("owner", "owner", "self"), 0);
  assert.equal(notifyIfOther("owner", "neighbor", "hello"), 1);
  const rows = db.prepare(`SELECT user_id, body FROM notifications`).all();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].user_id, "owner");
  assert.equal(rows[0].body, "hello");

  db.close();
  rmSync(dir, { recursive: true, force: true });
});

test("reminder dispatch selects due users and no-ops without email", () => {
  const dir = mkdtempSync(join(tmpdir(), "softboring-remind-"));
  const db = new Database(join(dir, "test.sqlite"));
  db.pragma("foreign_keys = ON");
  migrate(db);

  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)`,
  ).run("user-due", "due@example.com", "hash", "2026-01-01T00:00:00.000Z");
  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)`,
  ).run("user-off", "off@example.com", "hash", "2026-01-01T00:00:00.000Z");
  db.prepare(`INSERT INTO user_settings (user_id, reminder_enabled, reminder_weekday) VALUES (?, 1, 2)`).run(
    "user-due",
  );
  db.prepare(`INSERT INTO user_settings (user_id, reminder_enabled, reminder_weekday) VALUES (?, 0, 2)`).run(
    "user-off",
  );

  const tuesday = new Date(2026, 8, 15);
  while (tuesday.getDay() !== 2) {
    tuesday.setDate(tuesday.getDate() + 1);
  }
  const due = listDueReminderUsers(db, tuesday);
  assert.equal(due.length, 1);
  assert.equal(due[0].email, "due@example.com");

  db.prepare(`UPDATE user_settings SET reminder_last_sent_at = ? WHERE user_id = ?`).run(
    tuesday.toISOString(),
    "user-due",
  );
  const again = listDueReminderUsers(db, tuesday);
  assert.equal(again.length, 0);

  db.close();
  rmSync(dir, { recursive: true, force: true });
});

test("schema includes settings, reset tokens, and notifications", () => {
  const dir = mkdtempSync(join(tmpdir(), "softboring-schema-extra-"));
  const db = new Database(join(dir, "test.sqlite"));
  migrate(db);
  const tables = db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`)
    .all()
    .map((row) => row.name);
  for (const name of ["user_settings", "password_reset_tokens", "notifications"]) {
    assert.ok(tables.includes(name), `missing ${name}`);
  }
  db.close();
  rmSync(dir, { recursive: true, force: true });
});
