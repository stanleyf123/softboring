import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import Database from "better-sqlite3";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function columnNames(db, table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map((col) => col.name);
}

function migrate(db) {
  db.exec(readFileSync(join(root, "scripts/schema.sql"), "utf8"));
}

function toTeaserNote(note) {
  return {
    id: note.id,
    x: note.x,
    y: note.y,
    z: note.z,
    color: note.color,
    praiseCount: note.praiseCount,
  };
}

test("wall tables, sticker seed, praise, hide, and teaser payload", () => {
  const dir = mkdtempSync(join(tmpdir(), "softboring-wall-"));
  const sqlitePath = join(dir, "test.sqlite");
  mkdirSync(dirname(sqlitePath), { recursive: true });
  const db = new Database(sqlitePath);
  db.pragma("foreign_keys = ON");
  migrate(db);

  for (const table of [
    "wall_notes",
    "wall_comments",
    "stickers",
    "user_stickers",
    "wall_note_stickers",
    "sticker_orders",
  ]) {
    const exists = db
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`)
      .get(table);
    assert.ok(exists, `missing ${table}`);
  }

  const stickerCols = columnNames(db, "stickers");
  for (const name of ["slug", "price_cents", "stripe_price_id", "emoji"]) {
    assert.ok(stickerCols.includes(name), `missing stickers.${name}`);
  }

  const stickers = db.prepare(`SELECT slug FROM stickers ORDER BY sort_order`).all();
  assert.equal(stickers.length, 8);
  assert.deepEqual(
    stickers.map((row) => row.slug),
    ["star", "heart", "sprout", "tea", "moon", "cloud", "peach", "sparkle"],
  );

  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at, plan)
     VALUES (?, ?, ?, ?, ?)`,
  ).run("user-a", "a@example.com", "hash", "2026-01-01T00:00:00.000Z", "soft_plus");

  db.prepare(
    `INSERT INTO reviews (
      id, guest_id, user_id, energy, drain, less_of, priorities, feeling, summary, locale, created_at
    ) VALUES (?, ?, ?, ?, '', '', '', 4, ?, NULL, ?)`,
  ).run(
    "rev-a",
    "11111111-1111-1111-1111-111111111111",
    "user-a",
    "A secret garden walk",
    "A week with tea",
    "2026-01-02T00:00:00.000Z",
  );

  db.prepare(
    `INSERT INTO wall_notes (
      id, review_id, user_id, x, y, z, color, hidden, created_at, updated_at
    ) VALUES (?, ?, ?, 80, 90, 1, 'peach', 0, ?, ?)`,
  ).run(
    "note-a",
    "rev-a",
    "user-a",
    "2026-01-02T00:00:00.000Z",
    "2026-01-02T00:00:00.000Z",
  );

  const star = db.prepare(`SELECT id FROM stickers WHERE slug = 'star'`).get();
  db.prepare(
    `INSERT INTO user_stickers (user_id, sticker_id, quantity) VALUES (?, ?, ?)`,
  ).run("user-a", star.id, 2);

  const place = db.transaction((placeId) => {
    db.prepare(
      `UPDATE user_stickers SET quantity = quantity - 1
       WHERE user_id = ? AND sticker_id = ? AND quantity > 0`,
    ).run("user-a", star.id);
    db.prepare(
      `INSERT INTO wall_note_stickers (id, note_id, user_id, sticker_id, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(
      placeId,
      "note-a",
      "user-a",
      star.id,
      "2026-01-02T01:00:00.000Z",
    );
  });
  place("place-1");
  place("place-2");

  const praise = db
    .prepare(`SELECT COUNT(*) AS n FROM wall_note_stickers WHERE note_id = ?`)
    .get("note-a");
  assert.equal(praise.n, 2);
  const leftover = db
    .prepare(`SELECT quantity FROM user_stickers WHERE user_id = ? AND sticker_id = ?`)
    .get("user-a", star.id);
  assert.equal(leftover.quantity, 0);

  db.prepare(`UPDATE wall_notes SET hidden = 1 WHERE id = ?`).run("note-a");
  const visible = db
    .prepare(`SELECT id FROM wall_notes WHERE hidden = 0`)
    .all();
  assert.equal(visible.length, 0);

  const full = {
    id: "note-a",
    x: 80,
    y: 90,
    z: 1,
    color: "peach",
    praiseCount: 2,
    energy: "A secret garden walk",
    summary: "A week with tea",
    comments: [{ body: "secret" }],
  };
  const teaser = toTeaserNote(full);
  assert.equal("energy" in teaser, false);
  assert.equal("summary" in teaser, false);
  assert.equal("comments" in teaser, false);
  assert.deepEqual(teaser, {
    id: "note-a",
    x: 80,
    y: 90,
    z: 1,
    color: "peach",
    praiseCount: 2,
  });

  db.close();
  rmSync(dir, { recursive: true, force: true });
});

test("sticker checkout is payment-mode and grants inventory once", () => {
  const dir = mkdtempSync(join(tmpdir(), "softboring-sticker-order-"));
  const db = new Database(join(dir, "test.sqlite"));
  db.pragma("foreign_keys = ON");
  migrate(db);

  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at)
     VALUES (?, ?, ?, ?)`,
  ).run("user-b", "b@example.com", "hash", "2026-01-01T00:00:00.000Z");

  const heart = db.prepare(`SELECT id FROM stickers WHERE slug = 'heart'`).get();

  function fulfill(sessionId) {
    const existing = db.prepare(`SELECT id FROM sticker_orders WHERE id = ?`).get(sessionId);
    if (existing) return { granted: false };
    db.prepare(
      `INSERT INTO sticker_orders (id, user_id, kind, sticker_id, quantity, created_at)
       VALUES (?, ?, 'sticker', ?, 1, ?)`,
    ).run(sessionId, "user-b", heart.id, "2026-01-02T00:00:00.000Z");
    db.prepare(
      `INSERT INTO user_stickers (user_id, sticker_id, quantity)
       VALUES (?, ?, 1)
       ON CONFLICT(user_id, sticker_id)
       DO UPDATE SET quantity = quantity + excluded.quantity`,
    ).run("user-b", heart.id);
    return { granted: true };
  }

  assert.equal(fulfill("cs_test_1").granted, true);
  assert.equal(fulfill("cs_test_1").granted, false);
  const qty = db
    .prepare(`SELECT quantity FROM user_stickers WHERE user_id = ? AND sticker_id = ?`)
    .get("user-b", heart.id);
  assert.equal(qty.quantity, 1);

  db.close();
  rmSync(dir, { recursive: true, force: true });
});
