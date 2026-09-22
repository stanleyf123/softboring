import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import Database from "better-sqlite3";
import { register } from "node:module";

register("./alias-hook.mjs", import.meta.url);

const { BOOKMARKS_EXPORT_FILENAME, bookmarksExportPayload } = await import(
  "../src/lib/bookmarks-export.ts"
);
const { presentSoftSessions, softSessionRecency } = await import("../src/lib/soft-sessions.ts");
const { readOpenSessionSummary } = await import("../src/db/sessions.ts");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-09-22T12:00:00.000Z");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

test("missing pages stay cream, illustrated, and linked home and to the wall", () => {
  const locale = read("src/app/[locale]/not-found.tsx");
  const rootPage = read("src/app/not-found.tsx");
  const css = read("src/app/globals.css");
  const illu = read("src/components/soft-lost-illu.tsx");

  const catchAll = read("src/app/[locale]/[...rest]/page.tsx");
  assert.match(catchAll, /assertLocale/);
  assert.match(catchAll, /notFound\(\)/);
  assert.doesNotMatch(catchAll, /zh-TW/);

  assert.match(locale, /data-soft-not-found/);
  assert.match(locale, /SoftLostIllustration/);
  assert.match(locale, /bg-cream/);
  assert.match(locale, /href="\/"/);
  assert.match(locale, /href="\/wall"/);
  assert.match(locale, /t\("home"\)/);
  assert.match(locale, /t\("wall"\)/);
  assert.doesNotMatch(locale, /zh-TW|stripe|resend|nodemailer/i);

  assert.match(rootPage, /data-soft-not-found/);
  assert.match(rootPage, /href: "\/en"/);
  assert.match(rootPage, /wall: "\/en\/wall"/);
  assert.match(rootPage, /href: "\/zh-tw"/);
  assert.match(rootPage, /wall: "\/zh-tw\/wall"/);
  assert.match(rootPage, /href: "\/ja"/);
  assert.match(rootPage, /wall: "\/ja\/wall"/);
  assert.doesNotMatch(rootPage, /zh-TW/);

  assert.match(illu, /data-soft-lost/);
  assert.match(illu, /soft-lost-cup/);
  assert.match(illu, /soft-lost-card/);
  assert.match(css, /\.soft-lost-illu/);
  assert.match(css, /var\(--blush\)/);
  assert.match(css, /var\(--peach\)/);
  assert.match(css, /var\(--mint\)/);
  assert.match(css, /var\(--cream\)/);
  assert.match(
    css,
    /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*\.soft-lost-illu \{[\s\S]*animation: none/,
  );

  const locales = ["en", "zh-tw", "ja"].map((locale) => readJson(`messages/${locale}.json`));
  for (const messages of locales) {
    assert.match(messages.NotFound.title, /\S/);
    assert.match(messages.NotFound.body, /\S/);
    assert.match(messages.NotFound.home, /\S/);
    assert.match(messages.NotFound.wall, /\S/);
    assert.doesNotMatch(JSON.stringify(messages.NotFound), /zh-TW/);
  }
  assert.match(locales[1].NotFound.wall, /軟軟牆/);
  assert.match(locales[2].NotFound.wall, /ソフトウォール/);
});

test("signed-in desks are a count and a vague recency, never a device list", () => {
  assert.equal(softSessionRecency("2026-09-22T11:00:00.000Z", now), "today");
  assert.equal(softSessionRecency("2026-09-22T12:30:00.000Z", now), "today");
  assert.equal(softSessionRecency(new Date(now.getTime() - DAY + 1).toISOString(), now), "today");
  assert.equal(softSessionRecency(new Date(now.getTime() - DAY).toISOString(), now), "thisWeek");
  assert.equal(softSessionRecency(new Date(now.getTime() - 6 * DAY).toISOString(), now), "thisWeek");
  assert.equal(softSessionRecency(new Date(now.getTime() - 7 * DAY).toISOString(), now), "earlier");
  assert.equal(softSessionRecency("not-a-date", now), "earlier");

  assert.deepEqual(presentSoftSessions(null, now), { mode: "tip" });
  assert.deepEqual(presentSoftSessions({ count: 0, newestCreatedAt: null }, now), { mode: "tip" });
  assert.deepEqual(
    presentSoftSessions({ count: 2, newestCreatedAt: "2026-09-20T12:00:00.000Z" }, now),
    { mode: "count", count: 2, recency: "thisWeek" },
  );

  const missing = new Database(":memory:");
  assert.equal(readOpenSessionSummary(missing, "member", now), null);
  missing.close();

  const thin = new Database(":memory:");
  thin.exec(`CREATE TABLE sessions (id TEXT PRIMARY KEY)`);
  assert.equal(readOpenSessionSummary(thin, "member", now), null);
  thin.close();

  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
  const insert = db.prepare(
    `INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`,
  );
  insert.run("secret-current", "member", "2026-10-01T00:00:00.000Z", "2026-09-22T08:00:00.000Z");
  insert.run("secret-older", "member", "2026-10-01T00:00:00.000Z", "2026-09-01T08:00:00.000Z");
  insert.run("secret-expired", "member", "2026-09-01T00:00:00.000Z", "2026-09-21T08:00:00.000Z");
  insert.run("secret-other", "neighbor", "2026-10-01T00:00:00.000Z", "2026-09-22T09:00:00.000Z");

  const summary = readOpenSessionSummary(db, "member", now);
  assert.deepEqual(summary, {
    count: 2,
    newestCreatedAt: "2026-09-22T08:00:00.000Z",
  });
  assert.equal(JSON.stringify(summary).includes("secret"), false);
  assert.deepEqual(presentSoftSessions(summary, now), {
    mode: "count",
    count: 2,
    recency: "today",
  });
  db.close();

  const sessions = read("src/db/sessions.ts");
  assert.match(sessions, /SELECT created_at AS createdAt, expires_at AS expiresAt/);
  assert.doesNotMatch(sessions, /user_agent|ip_address|SELECT id/);
  const account = read("src/app/[locale]/account/page.tsx");
  const panel = read("src/components/account-panel.tsx");
  assert.match(account, /presentSoftSessions/);
  assert.match(account, /summarizeOpenSessions/);
  assert.match(panel, /data-soft-sessions=\{softSessions\.mode\}/);
  assert.match(panel, /sessionsDevicesTip/);
  assert.doesNotMatch(panel, /userAgent|navigator\.|session\.id/);

  const locales = ["en", "zh-tw", "ja"].map((locale) => readJson(`messages/${locale}.json`));
  for (const messages of locales) {
    assert.match(messages.Account.sessionsTitle, /\S/);
    assert.match(messages.Account.sessionsCount, /\{count[,}]/);
    assert.match(messages.Account.sessionsRecencyToday, /\S/);
    assert.match(messages.Account.sessionsRecencyThisWeek, /\S/);
    assert.match(messages.Account.sessionsRecencyEarlier, /\S/);
    assert.match(messages.Account.sessionsTip, /\S/);
    assert.match(messages.Account.sessionsDevicesTip, /\S/);
    assert.doesNotMatch(messages.Account.sessionsTip, /zh-TW/);
  }
});

test("Soft+ bookmark export keeps ids and collection membership, not note text", async () => {
  const exportedAt = "2026-09-22T12:00:00.000Z";
  const payload = bookmarksExportPayload({
    exportedAt,
    bookmarks: [
      { noteId: "note-b", bookmarkedAt: "2026-09-02T00:00:00.000Z" },
      { noteId: "note-a", bookmarkedAt: "2026-09-01T00:00:00.000Z" },
    ],
    memberships: [
      { noteId: "note-a", collectionId: "col-tea", name: "  Tea shelf " },
      { noteId: "note-a", collectionId: "col-tea", name: "Tea shelf" },
      { noteId: "note-a", collectionId: "col-rain", name: "Rain" },
      { noteId: "note-missing", collectionId: "col-other", name: "Not saved" },
      { noteId: "note-b", collectionId: " ", name: "Blank" },
    ],
  });

  assert.equal(payload.kind, "softboring-bookmarks");
  assert.equal(payload.plan, "soft_plus");
  assert.equal(payload.exportedAt, exportedAt);
  assert.equal(payload.bookmarkCount, 2);
  assert.deepEqual(payload.bookmarks, [
    {
      noteId: "note-a",
      bookmarkedAt: "2026-09-01T00:00:00.000Z",
      collections: [
        { id: "col-rain", name: "Rain" },
        { id: "col-tea", name: "Tea shelf" },
      ],
    },
    {
      noteId: "note-b",
      bookmarkedAt: "2026-09-02T00:00:00.000Z",
      collections: [],
    },
  ]);
  const serialized = JSON.stringify(payload);
  assert.equal(serialized.includes("Not saved"), false);
  assert.equal(serialized.includes("excerpt"), false);
  assert.equal(serialized.includes("warm week"), false);

  const dir = mkdtempSync(join(tmpdir(), "softboring-bookmarks-"));
  const previousPath = process.env.SQLITE_PATH;
  process.env.SQLITE_PATH = join(dir, "test.sqlite");
  if (globalThis.__softboringSqlite) {
    globalThis.__softboringSqlite.close();
    delete globalThis.__softboringSqlite;
  }

  try {
    const { getDb } = await import("../src/db/client.ts");
    const { listBookmarksForExport, listBookmarkMembershipsForExport } = await import(
      "../src/db/wall-bookmarks.ts"
    );
    const db = getDb();
    const stamp = "2026-09-01T00:00:00.000Z";
    db.prepare(
      `INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, 'x', ?)`,
    ).run("member", "member@example.com", stamp);
    db.prepare(
      `INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, 'x', ?)`,
    ).run("neighbor", "neighbor@example.com", stamp);
    db.prepare(
      `INSERT INTO reviews (id, guest_id, user_id, summary, created_at) VALUES ('rev-a', 'g', 'member', 'warm week', ?)`,
    ).run(stamp);
    db.prepare(
      `INSERT INTO reviews (id, guest_id, user_id, summary, created_at) VALUES ('rev-b', 'g', 'neighbor', 'their week', ?)`,
    ).run(stamp);
    db.prepare(
      `INSERT INTO wall_notes (id, review_id, user_id, created_at, updated_at) VALUES ('note-a', 'rev-a', 'member', ?, ?)`,
    ).run(stamp, stamp);
    db.prepare(
      `INSERT INTO wall_notes (id, review_id, user_id, created_at, updated_at) VALUES ('note-b', 'rev-b', 'neighbor', ?, ?)`,
    ).run(stamp, stamp);
    db.prepare(
      `INSERT INTO wall_note_bookmarks (user_id, note_id, created_at) VALUES ('member', 'note-a', ?)`,
    ).run("2026-09-03T00:00:00.000Z");
    db.prepare(
      `INSERT INTO wall_note_bookmarks (user_id, note_id, created_at) VALUES ('neighbor', 'note-b', ?)`,
    ).run(stamp);
    db.prepare(
      `INSERT INTO wall_note_collections (id, user_id, name, created_at, updated_at)
       VALUES ('col-tea', 'member', 'Tea shelf', ?, ?)`,
    ).run(stamp, stamp);
    db.prepare(
      `INSERT INTO wall_note_collection_items (collection_id, note_id, created_at) VALUES ('col-tea', 'note-a', ?)`,
    ).run(stamp);
    db.prepare(
      `INSERT INTO wall_note_collections (id, user_id, name, created_at, updated_at)
       VALUES ('col-other', 'neighbor', 'Neighbor pile', ?, ?)`,
    ).run(stamp, stamp);
    db.prepare(
      `INSERT INTO wall_note_collection_items (collection_id, note_id, created_at) VALUES ('col-other', 'note-b', ?)`,
    ).run(stamp);

    const fromDb = bookmarksExportPayload({
      bookmarks: listBookmarksForExport("member"),
      memberships: listBookmarkMembershipsForExport("member"),
      exportedAt,
    });
    assert.equal(fromDb.bookmarkCount, 1);
    assert.equal(fromDb.bookmarks[0].noteId, "note-a");
    assert.deepEqual(fromDb.bookmarks[0].collections, [{ id: "col-tea", name: "Tea shelf" }]);
    assert.equal(JSON.stringify(fromDb).includes("warm week"), false);
    assert.equal(JSON.stringify(fromDb).includes("Neighbor"), false);
  } finally {
    const live = globalThis.__softboringSqlite;
    if (live) {
      live.close();
      delete globalThis.__softboringSqlite;
    }
    if (previousPath === undefined) delete process.env.SQLITE_PATH;
    else process.env.SQLITE_PATH = previousPath;
    rmSync(dir, { recursive: true, force: true });
  }

  const route = read("src/app/api/wall/bookmarks/export/route.ts");
  const card = read("src/components/wall-bookmarks-export.tsx");
  const saved = read("src/app/[locale]/wall/saved/page.tsx");
  const pricing = read("src/components/pricing-view.tsx");
  assert.match(route, /requireSoftPlus/);
  assert.match(route, /bookmarksExportBody/);
  assert.equal(BOOKMARKS_EXPORT_FILENAME, "soft-boring-bookmarks.json");
  assert.match(route, /BOOKMARKS_EXPORT_FILENAME/);
  assert.doesNotMatch(route, /stripe|resend|nodemailer|excerpt|summary/i);
  assert.match(card, /data-bookmarks-export="tease"/);
  assert.match(card, /data-bookmarks-export="download"/);
  assert.match(card, /href="\/pricing"/);
  assert.match(card, /\/api\/wall\/bookmarks\/export/);
  assert.match(saved, /WallBookmarksExport/);
  assert.match(saved, /Boolean\(user\) && softPlus/);
  assert.match(pricing, /featureBookmarkExportFree/);
  assert.match(pricing, /featureBookmarkExportPlus/);

  const locales = ["en", "zh-tw", "ja"].map((locale) => readJson(`messages/${locale}.json`));
  for (const messages of locales) {
    assert.match(messages.WallBookmarks.exportTeaseBody, /Soft\+/);
    assert.match(messages.WallBookmarks.exportCta, /JSON/);
    assert.match(messages.WallBookmarks.exportBody, /\S/);
    assert.match(messages.Pricing.featureBookmarkExportFree, /Soft\+/);
    assert.match(messages.Pricing.featureBookmarkExportPlus, /\S/);
    assert.doesNotMatch(JSON.stringify(messages.WallBookmarks), /zh-TW/);
  }
  assert.match(locales[0].WallBookmarks.exportBody, /No note text/);
  assert.match(locales[1].WallBookmarks.exportBody, /沒有便利貼內文/);
  assert.match(locales[2].WallBookmarks.exportBody, /本文は入らず/);
});
