import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { register } from "node:module";
import test from "node:test";
import Database from "better-sqlite3";

register("./alias-hook.mjs", import.meta.url);

const { PUBLIC_SEO_PATHS } = await import("../src/lib/seo.ts");
const { buildPublicSitemap, renderSitemapXml, sitemapXmlFor } = await import(
  "../src/lib/sitemap-build.ts"
);
const { loadSitemapNotesFromDatabase, readOptionalSitemapNotes } = await import(
  "../src/lib/sitemap-notes.ts"
);

const VISIBLE = "11111111-1111-4111-8111-111111111111";
const HIDDEN = "22222222-2222-4222-8222-222222222222";
const UNDATED = "33333333-3333-4333-8333-333333333333";

function resetSqliteCache() {
  const cached = globalThis.__softboringSqlite;
  if (cached) cached.close();
  delete globalThis.__softboringSqlite;
}

test("sitemap xml builds for empty and partial wall notes", () => {
  const now = new Date("2026-09-24T00:00:00.000Z");
  const evil = {};
  Object.defineProperty(evil, "id", {
    get() {
      throw new Error("partial note");
    },
  });

  const xml = sitemapXmlFor({
    origin: "https://softboring.com/",
    paths: PUBLIC_SEO_PATHS,
    now,
    notes: [
      null,
      {},
      { id: "not-a-note", hidden: 0, email: "secret@example.com" },
      { id: HIDDEN, hidden: 1, updated_at: "2026-03-03T00:00:00.000Z" },
      { id: HIDDEN, hidden: true },
      { id: UNDATED, updated_at: "not-a-date", user_id: "user-1" },
      { id: VISIBLE, hidden: 0, updated_at: "2026-02-02T03:04:05.000Z", email: "secret@example.com" },
      { updated_at: "2026-01-01T00:00:00.000Z" },
      evil,
    ],
  });

  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<\/urlset>\n$/);
  assert.match(xml, /<loc>https:\/\/softboring\.com\/en\/digest<\/loc>/);
  assert.match(xml, /<loc>https:\/\/softboring\.com\/en\/year<\/loc>/);
  assert.match(xml, /<loc>https:\/\/softboring\.com\/en\/wall<\/loc>/);
  assert.match(xml, /hreflang="zh-TW" href="https:\/\/softboring\.com\/zh-tw\/digest"/);
  assert.match(xml, /hreflang="ja" href="https:\/\/softboring\.com\/ja\/year"/);
  assert.match(xml, /hreflang="en" href="https:\/\/softboring\.com\/en\/wall"/);
  assert.match(xml, /hreflang="x-default"/);
  assert.match(xml, new RegExp(`/en/wall\\?note=${VISIBLE}`));
  assert.match(xml, new RegExp(`/zh-tw/wall\\?note=${VISIBLE}`));
  assert.match(xml, new RegExp(`/ja/wall\\?note=${VISIBLE}`));
  assert.match(xml, new RegExp(`/en/wall\\?note=${UNDATED}`));
  assert.match(xml, /<lastmod>2026-02-02T03:04:05.000Z<\/lastmod>/);
  assert.doesNotMatch(xml, new RegExp(HIDDEN));
  assert.doesNotMatch(xml, /not-a-note/);
  assert.doesNotMatch(xml, /secret@example\.com/);
  assert.doesNotMatch(xml, /user-1/);
  assert.doesNotMatch(xml, /\/og\/note/);
  assert.doesNotMatch(xml, /\/admin/);
  assert.doesNotMatch(xml, /\/account/);
  assert.doesNotMatch(xml, /\/zh-TW/);

  const empty = sitemapXmlFor({
    origin: "https://softboring.com",
    paths: [...PUBLIC_SEO_PATHS],
    notes: [],
    now,
  });
  assert.match(empty, /\/en\/digest/);
  assert.match(empty, /\/zh-tw\/year/);
  assert.match(empty, /\/ja\/guidelines/);
  assert.doesNotMatch(empty, /wall\?note=/);

  const missing = sitemapXmlFor({
    origin: "not a url",
    paths: null,
    notes: null,
    now: new Date("not-a-date"),
  });
  assert.match(missing, /<loc>https:\/\/softboring\.com\/en\/digest<\/loc>/);
  assert.match(missing, /hreflang="ja" href="https:\/\/softboring\.com\/ja\/year"/);
  assert.match(missing, /<loc>https:\/\/softboring\.com\/en\/year<\/loc>/);
  assert.doesNotThrow(() => renderSitemapXml([{ url: "https://softboring.com/en", lastModified: new Date("nope") }]));
});

test("sitemap note query tolerates a missing table and a short schema", () => {
  const bare = new Database(":memory:");
  assert.deepEqual(loadSitemapNotesFromDatabase(bare), []);
  bare.close();

  const partial = new Database(":memory:");
  partial.exec(`CREATE TABLE wall_notes (id TEXT, hidden INTEGER)`);
  partial.prepare(`INSERT INTO wall_notes (id, hidden) VALUES (?, ?)`).run(VISIBLE, 0);
  partial.prepare(`INSERT INTO wall_notes (id, hidden) VALUES (?, ?)`).run(HIDDEN, 1);
  partial.prepare(`INSERT INTO wall_notes (id, hidden) VALUES (?, NULL)`).run(UNDATED);
  const notes = loadSitemapNotesFromDatabase(partial);
  partial.close();

  assert.equal(notes.some((note) => note.id === VISIBLE), true);
  assert.equal(notes.some((note) => note.id === UNDATED), true);
  assert.equal(notes.some((note) => note.id === HIDDEN), false);

  const xml = renderSitemapXml(
    buildPublicSitemap({
      origin: "https://softboring.com",
      paths: ["/digest", "/year", "/wall", "/account/activity"],
      notes,
    }),
  );
  assert.match(xml, /\/en\/digest/);
  assert.match(xml, /\/en\/year/);
  assert.match(xml, new RegExp(VISIBLE));
  assert.doesNotMatch(xml, /account\/activity/);
  assert.doesNotMatch(xml, new RegExp(HIDDEN));

  assert.deepEqual(
    readOptionalSitemapNotes(() => {
      throw new Error("database is locked");
    }),
    [],
  );
  assert.deepEqual(readOptionalSitemapNotes(() => "nope"), []);
  assert.deepEqual(readOptionalSitemapNotes(() => null), []);
});

test("sitemap() still builds xml when the database is empty or partial", async () => {
  const dir = mkdtempSync(join(tmpdir(), "softboring-sitemap-"));
  const previous = process.env.SQLITE_PATH;
  process.env.SQLITE_PATH = join(dir, "empty.sqlite");
  resetSqliteCache();

  try {
    const { default: sitemap } = await import("../src/app/sitemap.ts");
    const emptyEntries = await sitemap();
    const emptyXml = renderSitemapXml(emptyEntries);
    assert.match(emptyXml, /\/en\/digest/);
    assert.match(emptyXml, /\/zh-tw\/year/);
    assert.match(emptyXml, /\/ja\/wall/);
    assert.doesNotMatch(emptyXml, /wall\?note=/);

    const { getDb } = await import("../src/db/client.ts");
    const db = getDb();
    const reviewId = "44444444-4444-4444-8444-444444444444";
    db.prepare(
      `INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)`,
    ).run("user-sitemap", "secret@example.com", "x", "2026-01-01T00:00:00.000Z");
    const hiddenReviewId = "55555555-5555-4555-8555-555555555555";
    db.prepare(
      `INSERT INTO reviews (id, guest_id, user_id, created_at) VALUES (?, ?, ?, ?)`,
    ).run(reviewId, "guest-sitemap", "user-sitemap", "2026-01-01T00:00:00.000Z");
    db.prepare(
      `INSERT INTO reviews (id, guest_id, user_id, created_at) VALUES (?, ?, ?, ?)`,
    ).run(hiddenReviewId, "guest-sitemap-hidden", "user-sitemap", "2026-01-02T00:00:00.000Z");
    db.prepare(
      `INSERT INTO wall_notes (id, review_id, user_id, created_at, updated_at, hidden)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(VISIBLE, reviewId, "user-sitemap", "2026-01-01T00:00:00.000Z", "2026-02-02T03:04:05.000Z", 0);
    db.prepare(
      `INSERT INTO wall_notes (id, review_id, user_id, created_at, updated_at, hidden)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(HIDDEN, hiddenReviewId, "user-sitemap", "2026-01-01T00:00:00.000Z", "2026-03-03T00:00:00.000Z", 1);

    const filled = renderSitemapXml(await sitemap());
    assert.match(filled, new RegExp(`/zh-tw/wall\\?note=${VISIBLE}`));
    assert.match(filled, /\/ja\/digest/);
    assert.match(filled, /\/en\/year/);
    assert.doesNotMatch(filled, new RegExp(HIDDEN));
    assert.doesNotMatch(filled, new RegExp(hiddenReviewId));
    assert.doesNotMatch(filled, /secret@example\.com/);
    assert.doesNotMatch(filled, /user-sitemap/);
    assert.doesNotMatch(filled, /\/og\/note/);
  } finally {
    resetSqliteCache();
    if (previous === undefined) delete process.env.SQLITE_PATH;
    else process.env.SQLITE_PATH = previous;
    rmSync(dir, { recursive: true, force: true });
  }
});
