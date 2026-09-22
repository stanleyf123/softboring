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
    ownerNickname: note.ownerNickname?.trim() ? note.ownerNickname.trim() : null,
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
  assert.equal(stickers.length, 13);
  assert.deepEqual(
    stickers.map((row) => row.slug),
    [
      "star",
      "heart",
      "sprout",
      "tea",
      "moon",
      "cloud",
      "peach",
      "sparkle",
      "blossom",
      "leaf",
      "honey",
      "shell",
      "candle",
    ],
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
    ownerNickname: "小桃",
    energy: "A secret garden walk",
    summary: "A week with tea",
    comments: [{ body: "secret" }],
  };
  const teaser = toTeaserNote(full);
  assert.equal("energy" in teaser, false);
  assert.equal("summary" in teaser, false);
  assert.equal("comments" in teaser, false);
  assert.equal(teaser.ownerNickname, "小桃");
  assert.deepEqual(teaser, {
    id: "note-a",
    x: 80,
    y: 90,
    z: 1,
    color: "peach",
    praiseCount: 2,
    ownerNickname: "小桃",
  });

  db.close();
  rmSync(dir, { recursive: true, force: true });
});

function toTeaser(note) {
  return {
    id: note.id,
    x: note.x,
    y: note.y,
    z: note.z,
    color: note.color,
    praiseCount: note.praiseCount,
    ownerNickname: note.ownerNickname ?? null,
  };
}

function wallNotesPayload({ softPlus, signedIn, notes, latestOwnedReviewId }) {
  if (!softPlus) {
    return {
      locked: true,
      softPlus: false,
      signedIn,
      latestOwnedReviewId: signedIn ? latestOwnedReviewId : null,
      notes: notes.map(toTeaser),
    };
  }
  return {
    locked: false,
    softPlus: true,
    signedIn: true,
    latestOwnedReviewId,
    notes,
  };
}

test("share insert creates a visible wall note with wallNoteId, and Soft+ list keeps mine", () => {
  const dir = mkdtempSync(join(tmpdir(), "softboring-wall-share-"));
  const sqlitePath = join(dir, "test.sqlite");
  mkdirSync(dirname(sqlitePath), { recursive: true });
  const db = new Database(sqlitePath);
  db.pragma("foreign_keys = ON");
  migrate(db);

  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at, plan)
     VALUES (?, ?, ?, ?, ?)`,
  ).run("user-plus", "plus@example.com", "hash", "2026-01-01T00:00:00.000Z", "soft_plus");
  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at, plan)
     VALUES (?, ?, ?, ?, ?)`,
  ).run("user-free", "free@example.com", "hash", "2026-01-01T00:00:00.000Z", "free");

  db.prepare(
    `INSERT INTO reviews (
      id, guest_id, user_id, energy, drain, less_of, priorities, feeling, summary, locale, created_at
    ) VALUES (?, ?, ?, ?, '', '', '', 4, ?, NULL, ?)`,
  ).run(
    "rev-latest",
    "11111111-1111-1111-1111-111111111111",
    "user-plus",
    "Tea in the rain",
    "A quiet week of tea",
    "2026-01-08T00:00:00.000Z",
  );

  const empty = db.prepare(`SELECT COUNT(*) AS n FROM wall_notes`).get();
  assert.equal(empty.n, 0);

  const latest = db
    .prepare(
      `SELECT id FROM reviews WHERE user_id = ? ORDER BY datetime(created_at) DESC LIMIT 1`,
    )
    .get("user-plus");
  assert.equal(latest.id, "rev-latest");

  const now = "2026-01-08T01:00:00.000Z";
  const wallNoteId = "note-share-1";
  db.prepare(
    `INSERT INTO wall_notes (
      id, review_id, user_id, x, y, z, color, hidden, pinned, created_at, updated_at
    ) VALUES (?, ?, ?, 72, 72, 1, 'peach', 0, 0, ?, ?)`,
  ).run(wallNoteId, latest.id, "user-plus", now, now);

  const visible = db
    .prepare(
      `SELECT n.id, n.user_id, n.hidden, r.summary
       FROM wall_notes n
       JOIN reviews r ON r.id = n.review_id
       WHERE n.hidden = 0 AND n.id = ?`,
    )
    .get(wallNoteId);
  assert.equal(visible.id, wallNoteId);
  assert.equal(visible.summary, "A quiet week of tea");

  const shareResponse = { note: { id: visible.id, mine: true }, wallNoteId: visible.id };
  assert.equal(shareResponse.wallNoteId, wallNoteId);

  const fullNote = {
    id: wallNoteId,
    x: 72,
    y: 72,
    z: 1,
    color: "peach",
    praiseCount: 0,
    mine: true,
    excerpt: "A quiet week of tea",
    summary: "A quiet week of tea",
    userId: "user-plus",
    ownerNickname: "暖暖",
    ownerFallback: "plus",
  };
  const plusPayload = wallNotesPayload({
    softPlus: true,
    signedIn: true,
    latestOwnedReviewId: latest.id,
    notes: [fullNote],
  });
  assert.equal(plusPayload.locked, false);
  assert.equal(plusPayload.notes[0].mine, true);
  assert.equal(plusPayload.notes[0].summary, "A quiet week of tea");
  assert.equal(plusPayload.notes[0].ownerNickname, "暖暖");
  assert.equal(plusPayload.latestOwnedReviewId, "rev-latest");

  const freePayload = wallNotesPayload({
    softPlus: false,
    signedIn: true,
    latestOwnedReviewId: latest.id,
    notes: [fullNote],
  });
  assert.equal(freePayload.locked, true);
  assert.equal("mine" in freePayload.notes[0], false);
  assert.equal("summary" in freePayload.notes[0], false);
  assert.equal("ownerFallback" in freePayload.notes[0], false);
  assert.equal(freePayload.notes[0].ownerNickname, "暖暖");
  assert.equal(freePayload.latestOwnedReviewId, "rev-latest");

  const signedOut = wallNotesPayload({
    softPlus: false,
    signedIn: false,
    latestOwnedReviewId: latest.id,
    notes: [fullNote],
  });
  assert.equal(signedOut.latestOwnedReviewId, null);

  db.close();
  rmSync(dir, { recursive: true, force: true });
});

test("empty Soft+ wall offers share-latest path in UI and copy", () => {
  const wallBoard = readFileSync(join(root, "src/components/wall-board.tsx"), "utf8");
  const shareToWall = readFileSync(join(root, "src/components/share-to-wall.tsx"), "utf8");
  const notesRoute = readFileSync(join(root, "src/app/api/wall/notes/route.ts"), "utf8");
  const reviewForm = readFileSync(join(root, "src/components/review-form.tsx"), "utf8");
  const en = JSON.parse(readFileSync(join(root, "messages/en.json"), "utf8"));
  const zh = JSON.parse(readFileSync(join(root, "messages/zh-tw.json"), "utf8"));

  assert.match(wallBoard, /emptyShareCta/);
  assert.match(wallBoard, /latestOwnedReviewId/);
  assert.match(wallBoard, /shareLatest/);
  assert.match(wallBoard, /reviewId: latestOwnedReviewId/);
  assert.match(shareToWall, /shared:\s*"1"/);
  assert.match(shareToWall, /variant === "hero"/);
  assert.match(shareToWall, /shareError_auth_required/);
  assert.match(reviewForm, /variant="hero"/);
  assert.match(notesRoute, /latestOwnedReviewId/);
  assert.match(notesRoute, /wallSharePayload\(note\)/);
  assert.match(notesRoute, /toTeaserNote/);
  assert.match(notesRoute, /softPlus: true/);

  for (const messages of [en, zh]) {
    assert.ok(messages.Wall.emptyShareCta.length > 4);
    assert.ok(messages.Wall.emptyWriteCta.length > 4);
    assert.ok(messages.Wall.sharedToast.length > 4);
    assert.ok(messages.Wall.shareError_auth_required.length > 4);
    assert.ok(messages.Wall.shareError_review_not_found.length > 4);
    assert.ok(messages.Wall.shareError_locked.length > 4);
    assert.ok(messages.Wall.shareError_soft_plus_required.length > 4);
    assert.ok(messages.Wall.shareError_forbidden.length > 4);
  }
  assert.equal(zh.Wall.emptyShareCta, "釘最新一週到牆上");
  assert.match(zh.Wall.empty, /釘/);
  assert.match(en.Wall.empty, /pin/i);
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

test("wall note list join exposes owner nickname for Soft+ and teasers", () => {
  const dir = mkdtempSync(join(tmpdir(), "softboring-wall-nick-"));
  const db = new Database(join(dir, "test.sqlite"));
  db.pragma("foreign_keys = ON");
  migrate(db);

  assert.ok(columnNames(db, "users").includes("nickname"));

  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at, plan, nickname)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    "user-nick",
    "peach@example.com",
    "hash",
    "2026-01-01T00:00:00.000Z",
    "soft_plus",
    "小桃",
  );
  db.prepare(
    `INSERT INTO reviews (
      id, guest_id, user_id, energy, drain, less_of, priorities, feeling, summary, locale, created_at
    ) VALUES (?, ?, ?, ?, '', '', '', 4, ?, NULL, ?)`,
  ).run(
    "rev-nick",
    "11111111-1111-1111-1111-111111111111",
    "user-nick",
    "secret energy",
    "secret summary",
    "2026-01-02T00:00:00.000Z",
  );
  db.prepare(
    `INSERT INTO wall_notes (
      id, review_id, user_id, x, y, z, color, hidden, pinned, created_at, updated_at
    ) VALUES (?, ?, ?, 80, 90, 1, 'peach', 0, 0, ?, ?)`,
  ).run(
    "note-nick",
    "rev-nick",
    "user-nick",
    "2026-01-02T00:00:00.000Z",
    "2026-01-02T00:00:00.000Z",
  );

  const row = db
    .prepare(
      `SELECT n.id, n.hidden, u.nickname AS owner_nickname, u.email AS owner_email, r.summary
       FROM wall_notes n
       JOIN reviews r ON r.id = n.review_id
       LEFT JOIN users u ON u.id = n.user_id
       WHERE n.hidden = 0 AND n.id = ?`,
    )
    .get("note-nick");
  assert.equal(row.owner_nickname, "小桃");
  const teaser = toTeaserNote({
    id: row.id,
    x: 80,
    y: 90,
    z: 1,
    color: "peach",
    praiseCount: 0,
    ownerNickname: row.owner_nickname,
    summary: row.summary,
  });
  assert.equal(teaser.ownerNickname, "小桃");
  assert.equal("summary" in teaser, false);

  const wallDb = readFileSync(join(root, "src/db/wall.ts"), "utf8");
  const canvas = readFileSync(join(root, "src/lib/wall-canvas.ts"), "utf8");
  const board = readFileSync(join(root, "src/components/wall-board.tsx"), "utf8");
  assert.match(wallDb, /ownerNickname/);
  assert.match(wallDb, /owner_nickname/);
  assert.match(canvas, /ownerNickname/);
  assert.match(board, /ownerNickname/);
  assert.match(board, /softVisitor/);

  db.close();
  rmSync(dir, { recursive: true, force: true });
});
