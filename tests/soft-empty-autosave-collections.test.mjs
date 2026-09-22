import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import Database from "better-sqlite3";
import { ensureWallNoteCollections, migrateDb } from "../src/db/migrate.ts";
import {
  autosaveMinutesAgo,
  autosaveMoment,
  autosaveView,
  draftHasContent,
  readDraftSavedAt,
  writeDraftSavedAt,
} from "../src/lib/review-autosave.ts";
import {
  COLLECTION_CAP,
  COLLECTION_NAME_MAX,
  collectionMembershipAllowed,
  collectionNameTakenExcept,
  parseCollectionId,
  parseCollectionName,
} from "../src/lib/wall-collections.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

test("a collection name stays one short gentle line", () => {
  assert.equal(COLLECTION_NAME_MAX, 32);
  assert.equal(COLLECTION_CAP, 8);
  assert.equal(parseCollectionName("  quiet tea  "), "quiet tea");
  assert.equal(parseCollectionName("line\ntea"), "line tea");
  assert.equal(parseCollectionName("   "), null);
  assert.equal(parseCollectionName(4), null);
  const long = "茶".repeat(40);
  assert.equal(Array.from(parseCollectionName(long)).length, 32);
});

test("collection names collide quietly, and only saved visible notes can join", () => {
  const shelf = [
    { id: "a", name: "Quiet tea" },
    { id: "b", name: "Neighbors" },
  ];
  assert.equal(collectionNameTakenExcept(shelf, " quiet TEA "), true);
  assert.equal(collectionNameTakenExcept(shelf, "quiet tea", "a"), false);
  assert.equal(collectionNameTakenExcept(shelf, "Morning light"), false);
  assert.equal(parseCollectionId("not-an-id"), null);
  assert.equal(
    parseCollectionId("11111111-1111-4111-8111-111111111111"),
    "11111111-1111-4111-8111-111111111111",
  );
  assert.equal(collectionMembershipAllowed({ bookmarked: true, hidden: false }), true);
  assert.equal(collectionMembershipAllowed({ bookmarked: false, hidden: false }), false);
  assert.equal(collectionMembershipAllowed({ bookmarked: true, hidden: true }), false);
});

test("review autosave speaks in a quiet relative time", () => {
  const now = Date.parse("2026-09-22T12:00:00.000Z");
  assert.equal(autosaveMoment(now, now), "just");
  assert.equal(autosaveMoment(now - 9_000, now), "just");
  assert.equal(autosaveMoment(now - 10_000, now), "moment");
  assert.equal(autosaveMoment(now - 119_000, now), "moment");
  assert.equal(autosaveMoment(now - 120_000, now), "minutes");
  assert.equal(autosaveMinutesAgo(now - 120_000, now), 2);
  assert.equal(autosaveMoment(now - 59 * 60_000, now), "minutes");
  assert.equal(autosaveMoment(now - 60 * 60_000, now), "later");
  assert.equal(autosaveMoment(now + 2_000, now), "just");
  assert.equal(autosaveMoment(Number.NaN, now), "later");

  assert.deepEqual(autosaveView("saving", now, now), {
    phase: "saving",
    moment: "none",
    minutes: 0,
  });
  assert.equal(autosaveView("idle", null, now).phase, "idle");
  assert.equal(autosaveView("saved", null, now).moment, "later");
  assert.equal(autosaveView("saved", now - 30_000, now).moment, "moment");
  assert.equal(autosaveView("saved", now - 5 * 60_000, now).minutes, 5);

  assert.equal(draftHasContent({ energy: "  ", feeling: null }), false);
  assert.equal(draftHasContent({ summary: "tea" }), true);
  assert.equal(draftHasContent({ feeling: 3 }), true);
  assert.equal(draftHasContent({ mood: "calm" }), true);
  assert.equal(draftHasContent({ customAnswers: [{ answer: "  " }] }), false);
  assert.equal(draftHasContent({ customAnswers: [{ answer: "one line" }] }), true);

  const bag = new Map();
  const storage = {
    getItem: (key) => bag.get(key) ?? null,
    setItem: (key, value) => bag.set(key, value),
    removeItem: (key) => bag.delete(key),
  };
  writeDraftSavedAt(storage, now);
  assert.equal(readDraftSavedAt(storage), now);
  writeDraftSavedAt(storage, Number.NaN);
  assert.equal(readDraftSavedAt(storage), now);
});

test("old desks gain private wall-note collections that leave with the member", () => {
  const memory = new Database(":memory:");
  ensureWallNoteCollections(memory);
  ensureWallNoteCollections(memory);
  const tables = memory
    .prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('wall_note_collections', 'wall_note_collection_items')`,
    )
    .all()
    .map((row) => row.name);
  assert.deepEqual(tables.sort(), ["wall_note_collection_items", "wall_note_collections"]);
  memory.close();

  const dir = mkdtempSync(join(tmpdir(), "softboring-collections-"));
  const db = new Database(join(dir, "test.sqlite"));
  db.pragma("foreign_keys = ON");
  migrateDb(db);
  const stamp = "2026-09-22T00:00:00.000Z";
  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at) VALUES ('member', 'm@example.com', 'x', ?)`,
  ).run(stamp);
  db.prepare(
    `INSERT INTO reviews (id, guest_id, user_id, created_at) VALUES ('rev', 'guest', 'member', ?)`,
  ).run(stamp);
  db.prepare(
    `INSERT INTO wall_notes (id, review_id, user_id, created_at, updated_at) VALUES ('note', 'rev', 'member', ?, ?)`,
  ).run(stamp, stamp);
  db.prepare(
    `INSERT INTO wall_note_bookmarks (user_id, note_id, created_at) VALUES ('member', 'note', ?)`,
  ).run(stamp);
  db.prepare(
    `INSERT INTO wall_note_collections (id, user_id, name, created_at, updated_at) VALUES ('col', 'member', 'Quiet tea', ?, ?)`,
  ).run(stamp, stamp);
  db.prepare(
    `INSERT INTO wall_note_collection_items (collection_id, note_id, created_at) VALUES ('col', 'note', ?)`,
  ).run(stamp);

  assert.throws(() => {
    db.prepare(
      `INSERT INTO wall_note_collections (id, user_id, name, created_at, updated_at) VALUES ('col-2', 'member', 'quiet tea', ?, ?)`,
    ).run(stamp, stamp);
  });

  db.prepare(`DELETE FROM wall_note_collections WHERE id = 'col'`).run();
  assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM wall_note_collection_items`).get().n, 0);
  assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM wall_note_bookmarks`).get().n, 1);

  db.prepare(
    `INSERT INTO wall_note_collections (id, user_id, name, created_at, updated_at) VALUES ('col', 'member', 'Quiet tea', ?, ?)`,
  ).run(stamp, stamp);
  db.prepare(
    `INSERT INTO wall_note_collection_items (collection_id, note_id, created_at) VALUES ('col', 'note', ?)`,
  ).run(stamp);
  db.prepare(`DELETE FROM users WHERE id = 'member'`).run();
  assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM wall_note_collections`).get().n, 0);
  assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM wall_note_collection_items`).get().n, 0);
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

test("empty states, autosave, and collections are wired without mail or payments", () => {
  const empty = read("src/components/empty-state.tsx");
  const illu = read("src/components/soft-empty-illu.tsx");
  const css = read("src/app/globals.css");
  const wall = read("src/components/wall-board.tsx");
  const history = read("src/components/history-list.tsx");
  const activity = read("src/components/soft-activity-timeline.tsx");
  const review = read("src/components/review-form.tsx");
  const saved = read("src/components/wall-saved-panel.tsx");
  const panel = read("src/components/wall-collections-panel.tsx");
  const savedPage = read("src/app/[locale]/wall/saved/page.tsx");
  const listApi = read("src/app/api/wall/collections/route.ts");
  const itemApi = read("src/app/api/wall/collections/[id]/route.ts");
  const memberApi = read("src/app/api/wall/collections/[id]/items/route.ts");
  const db = read("src/db/wall-collections.ts");
  const bookmarks = read("src/db/wall-bookmarks.ts");
  const schema = read("scripts/schema.sql");
  const migrate = read("src/db/migrate.ts");
  const cli = read("scripts/migrate.mjs");
  const pricing = read("src/components/pricing-view.tsx");

  assert.match(illu, /data-empty-illu/);
  assert.match(css, /\.soft-empty-illu/);
  assert.match(css, /var\(--blush\)/);
  assert.match(css, /var\(--mint\)/);
  assert.doesNotMatch(illu, /<img|url\(/);
  assert.match(empty, /SoftCssEmpty/);
  assert.match(empty, /data-empty-state/);
  assert.match(wall, /data-empty-state="wall"/);
  assert.match(wall, /emptyWhisper/);
  assert.match(wall, /illustration="wall"/);
  assert.match(history, /illustration="history"/);
  assert.match(history, /emptyWhisper/);
  assert.match(activity, /illustration="activity"/);
  assert.match(activity, /emptyWhisper/);
  assert.match(activity, /emptyTitle/);
  assert.doesNotMatch(activity, /requireSoftPlus|softPlus/);

  assert.match(review, /data-review-autosave/);
  assert.match(review, /autosaveMoment/);
  assert.match(review, /autosaveSaving/);
  assert.match(review, /role="status"/);
  assert.doesNotMatch(review, /sendMail|resend|stripe/i);

  assert.match(schema, /CREATE TABLE IF NOT EXISTS wall_note_collections/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS wall_note_collection_items/);
  assert.match(schema, /ON DELETE CASCADE/);
  assert.match(migrate, /ensureWallNoteCollections/);
  assert.match(cli, /wall_note_collections/);
  assert.match(bookmarks, /wall_note_collection_items/);
  assert.match(db, /collectionMembershipAllowed/);
  assert.match(db, /COLLECTION_CAP/);

  assert.match(listApi, /requireSoftPlus/);
  assert.match(itemApi, /requireSoftPlus/);
  assert.match(memberApi, /requireSoftPlus/);
  assert.match(listApi, /soft_plus_required|requireSoftPlus/);
  assert.match(saved, /data-wall-collections="tease"|WallCollectionsTease/);
  assert.match(saved, /WallCollectionsPanel/);
  assert.match(panel, /data-wall-collections="tease"/);
  assert.match(panel, /data-wall-collections="open"/);
  assert.match(panel, /\/pricing/);
  assert.match(savedPage, /WallCollectionsTease/);
  assert.match(savedPage, /userIsSoftPlus/);
  assert.match(pricing, /featureCollectionsPlus/);
  assert.match(pricing, /featureCollectionsFree/);

  const fresh = [listApi, itemApi, memberApi, db, panel, saved].join("\n");
  assert.doesNotMatch(fresh, /sendMail|resend|stripe|nodemailer|SMTP/i);
  assert.doesNotMatch(fresh, /zh-TW/);
});

test("empty, autosave, and collection copy exists in en / zh-tw / ja", () => {
  const keys = {
    Review: ["autosaveSaving", "autosaveJustNow", "autosaveMoment", "autosaveMinutes", "autosaveLater", "draftHint"],
    History: ["emptyTitle", "emptyBody", "emptyWhisper"],
    Wall: ["emptyTitle", "empty", "emptyWhisper"],
    SoftActivity: ["emptyTitle", "emptyBody", "emptyWhisper"],
    Pricing: ["featureCollectionsFree", "featureCollectionsPlus"],
    WallCollections: [
      "teaseTitle",
      "teaseBody",
      "teaseCta",
      "title",
      "privacy",
      "all",
      "create",
      "emptyCollectionTitle",
      "full",
      "duplicate",
    ],
  };

  const locales = ["en", "zh-tw", "ja"].map((locale) => readJson(`messages/${locale}.json`));
  for (const messages of locales) {
    for (const [namespace, names] of Object.entries(keys)) {
      for (const name of names) {
        assert.equal(typeof messages[namespace][name], "string");
        assert.ok(messages[namespace][name].length > 0);
      }
    }
    assert.match(messages.WallCollections.privacy, /mail|信|メール/i);
  }

  const [en, zh, ja] = locales;
  assert.equal(en.Review.autosaveMoment, "Saved a moment ago");
  assert.equal(en.Review.autosaveSaving, "Saving…");
  assert.equal(zh.Review.autosaveMoment, "片刻前已存好");
  assert.equal(ja.Review.autosaveMoment, "少し前に保存しました");
  assert.equal(zh.WallCollections.title, "柔軟小集");
  assert.equal(ja.WallCollections.title, "やわらかい集まり");
  assert.notEqual(en.History.emptyWhisper, zh.History.emptyWhisper);
  assert.notEqual(en.History.emptyWhisper, ja.History.emptyWhisper);
  assert.equal(zh.SoftActivity.title, "柔軟足跡");
  assert.match(ja.SoftActivity.lead, /メールは送りません/);
});
