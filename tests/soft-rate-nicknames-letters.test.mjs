import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import Database from "better-sqlite3";
import { register } from "node:module";

register("./alias-hook.mjs", import.meta.url);

const { isWallRateLimited, noticeWallRateLimit, subscribeWallRateToast } = await import(
  "../src/lib/wall-rate-notice.ts"
);
const { recentPublicNicknames, PUBLIC_NICKNAME_LIMIT } = await import(
  "../src/lib/public-nicknames.ts"
);
const { listRecentPublicNicknameRows } = await import("../src/db/public-nicknames.ts");
const { isPastWeek, parsePastSelfLetterBody, PAST_SELF_LETTER_MAX } = await import(
  "../src/lib/past-self-letter.ts"
);
const {
  getPastSelfLetter,
  listPastSelfLetters,
  savePastSelfLetter,
} = await import("../src/db/past-self-letters.ts");
const { ensurePastSelfLetters } = await import("../src/db/migrate.ts");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const DAY = 24 * 60 * 60 * 1000;

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

test("wall 429 opens a cream toast instead of a sharp alert", () => {
  assert.equal(isWallRateLimited(429), true);
  assert.equal(isWallRateLimited(400, "rate_limited"), true);
  assert.equal(isWallRateLimited(403, "soft_plus_required"), false);
  assert.equal(isWallRateLimited(500, "Could not share"), false);

  let opened = 0;
  const unsubscribe = subscribeWallRateToast(() => {
    opened += 1;
  });
  assert.equal(noticeWallRateLimit(429, "rate_limited"), true);
  assert.equal(noticeWallRateLimit(200, "rate_limited"), true);
  assert.equal(noticeWallRateLimit(400, "invalid"), false);
  assert.equal(opened, 2);
  unsubscribe();
  assert.equal(noticeWallRateLimit(429), true);
  assert.equal(opened, 2);

  const toast = read("src/components/wall-rate-toast.tsx");
  const css = read("src/app/globals.css");
  const layout = read("src/app/[locale]/layout.tsx");
  const quote = read("src/components/wall-quote-button.tsx");
  const echo = read("src/components/wall-echo-panel.tsx");
  const board = read("src/components/wall-board.tsx");
  const share = read("src/components/share-to-wall.tsx");

  assert.match(toast, /role="status"/);
  assert.match(toast, /data-wall-rate-toast="open"/);
  assert.match(toast, /data-soft-rate-motion/);
  assert.doesNotMatch(toast, /role="alert"/);
  assert.match(layout, /WallRateToast/);
  assert.match(css, /\.soft-rate-toast[\s\S]*background:\s*var\(--cream\)/);
  assert.match(css, /border:\s*1px solid var\(--peach\)/);
  assert.match(
    css,
    /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*\.soft-rate-toast[\s\S]*animation: none/,
  );

  assert.match(quote, /noticeWallRateLimit/);
  assert.doesNotMatch(quote, /quoteRate|role="alert"/);
  assert.match(echo, /showWallRateToast/);
  assert.doesNotMatch(echo, /echoRate/);
  assert.match(board, /noticeWallRateLimit/);
  assert.match(share, /noticeWallRateLimit/);
  assert.doesNotMatch(toast, /stripe|resend|nodemailer|sendMail/i);

  const locales = ["en", "zh-tw", "ja"].map((locale) => readJson(`messages/${locale}.json`));
  for (const messages of locales) {
    assert.match(messages.WallRate.title, /\S/);
    assert.match(messages.WallRate.body, /\S/);
    assert.match(messages.WallRate.dismiss, /\S/);
    assert.equal(messages.Wall.echoRate.length > 0, true);
    assert.equal(messages.Wall.quoteRate.length > 0, true);
    assert.doesNotMatch(JSON.stringify(messages.WallRate), /zh-TW/);
  }
  assert.match(locales[1].WallRate.body, /軟軟牆/);
  assert.match(locales[2].WallRate.body, /ソフトウォール/);
});

test("homepage nicknames are recent, public, and never emails", () => {
  const now = Date.parse("2026-09-22T12:00:00.000Z");
  const names = recentPublicNicknames(
    [
      { nickname: "  Moss ", postedAt: new Date(now - 2 * DAY).toISOString() },
      { nickname: "moss", postedAt: new Date(now - DAY).toISOString() },
      { nickname: "secret@example.com", postedAt: new Date(now).toISOString() },
      { nickname: "  ", postedAt: new Date(now).toISOString() },
      { nickname: null, postedAt: new Date(now).toISOString() },
      { nickname: "Rain", postedAt: "not-a-date" },
      { nickname: "Tea", postedAt: new Date(now - 3 * DAY).toISOString() },
    ],
    8,
  );
  assert.deepEqual(names, ["moss", "Tea", "Rain"]);
  assert.equal(names.includes("secret@example.com"), false);
  assert.equal(recentPublicNicknames([], 8).length, 0);
  assert.equal(
    recentPublicNicknames(
      Array.from({ length: 12 }, (_, index) => ({
        nickname: `name-${index}`,
        postedAt: new Date(now - index * 1000).toISOString(),
      })),
      PUBLIC_NICKNAME_LIMIT,
    ).length,
    PUBLIC_NICKNAME_LIMIT,
  );

  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT,
      nickname TEXT
    );
    CREATE TABLE wall_notes (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      hidden INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  db.prepare(`INSERT INTO users (id, email, nickname) VALUES (?, ?, ?)`).run(
    "u-mail",
    "hidden@example.com",
    null,
  );
  db.prepare(`INSERT INTO users (id, email, nickname) VALUES (?, ?, ?)`).run(
    "u-moss",
    "moss@example.com",
    "Moss",
  );
  db.prepare(`INSERT INTO users (id, email, nickname) VALUES (?, ?, ?)`).run(
    "u-old",
    "old@example.com",
    "Moss",
  );
  db.prepare(`INSERT INTO users (id, email, nickname) VALUES (?, ?, ?)`).run(
    "u-hidden",
    "quiet@example.com",
    "Quiet",
  );
  db.prepare(`INSERT INTO users (id, email, nickname) VALUES (?, ?, ?)`).run(
    "u-at",
    "at@example.com",
    "a@b",
  );
  const insertNote = db.prepare(
    `INSERT INTO wall_notes (id, user_id, hidden, created_at) VALUES (?, ?, ?, ?)`,
  );
  insertNote.run("n-mail", "u-mail", 0, "2026-09-22T10:00:00.000Z");
  insertNote.run("n-moss", "u-moss", 0, "2026-09-22T09:00:00.000Z");
  insertNote.run("n-old", "u-old", 0, "2026-09-01T09:00:00.000Z");
  insertNote.run("n-hidden", "u-hidden", 1, "2026-09-22T11:00:00.000Z");
  insertNote.run("n-at", "u-at", 0, "2026-09-22T12:00:00.000Z");

  const rows = listRecentPublicNicknameRows(db, 48);
  const publicNames = recentPublicNicknames(rows, 8);
  assert.deepEqual(publicNames, ["Moss"]);
  assert.equal(JSON.stringify(rows).includes("example.com"), false);
  assert.equal(JSON.stringify(rows).includes("Quiet"), false);
  db.close();

  const source = read("src/db/public-nicknames.ts");
  const sql = source.slice(source.indexOf("SELECT"), source.indexOf("LIMIT ?"));
  assert.match(sql, /u\.nickname AS nickname/);
  assert.match(sql, /n\.hidden = 0/);
  assert.doesNotMatch(sql, /email/i);
  assert.doesNotMatch(source, /stripe|resend|nodemailer|sendMail/i);

  const home = read("src/app/[locale]/page.tsx");
  const strip = read("src/components/public-nickname-strip.tsx");
  assert.match(home, /PublicNicknameStrip/);
  assert.match(home, /listRecentPublicNicknames/);
  assert.match(strip, /data-public-nicknames/);
  assert.match(strip, /data-public-nickname/);
  assert.match(strip, /href="\/wall"/);
  assert.doesNotMatch(strip, /email|zh-TW/);
  assert.doesNotMatch(home, /zh-TW/);

  const locales = ["en", "zh-tw", "ja"].map((locale) => readJson(`messages/${locale}.json`));
  for (const messages of locales) {
    assert.match(messages.PublicNicknames.title, /\S/);
    assert.match(messages.PublicNicknames.lead, /\S/);
    assert.match(messages.PublicNicknames.empty, /\S/);
    assert.match(messages.PublicNicknames.privacy, /\S/);
    assert.match(messages.PublicNicknames.wall, /\S/);
    assert.doesNotMatch(JSON.stringify(messages.PublicNicknames), /zh-TW/);
  }
  assert.match(locales[1].PublicNicknames.wall, /軟軟牆/);
  assert.match(locales[2].PublicNicknames.wall, /ソフトウォール/);
});

test("Soft+ letters to a past week stay in the app and off the current week", () => {
  const now = new Date("2026-09-22T04:00:00.000Z");
  assert.equal(isPastWeek(new Date(now.getTime() - 8 * DAY).toISOString(), now, "Asia/Taipei"), true);
  assert.equal(isPastWeek(now.toISOString(), now, "Asia/Taipei"), false);
  assert.equal(isPastWeek(new Date(now.getTime() + 8 * DAY).toISOString(), now, "UTC"), false);
  assert.equal(isPastWeek("not-a-date", now, "UTC"), false);
  assert.equal(isPastWeek("2025-12-20T00:00:00.000Z", new Date("2026-01-06T00:00:00.000Z"), "UTC"), true);

  assert.equal(parsePastSelfLetterBody("  hello  "), "hello");
  assert.equal(parsePastSelfLetterBody("   "), null);
  assert.equal(parsePastSelfLetterBody(12), null);
  const long = "字".repeat(PAST_SELF_LETTER_MAX + 40);
  assert.equal(Array.from(parsePastSelfLetterBody(long)).length, PAST_SELF_LETTER_MAX);
  assert.equal(parsePastSelfLetterBody("字".repeat(4)), "字字字字");

  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY);
    CREATE TABLE reviews (
      id TEXT PRIMARY KEY,
      summary TEXT,
      created_at TEXT
    );
  `);
  ensurePastSelfLetters(db);
  db.prepare(`INSERT INTO users (id) VALUES (?)`).run("member");
  db.prepare(`INSERT INTO users (id) VALUES (?)`).run("other");
  db.prepare(`INSERT INTO reviews (id, summary, created_at) VALUES (?, ?, ?)`).run(
    "week-old",
    "A rainy shelf",
    "2026-09-01T00:00:00.000Z",
  );

  assert.equal(savePastSelfLetter(db, { userId: "member", reviewId: "week-old", body: null }), null);
  const saved = savePastSelfLetter(db, {
    userId: "member",
    reviewId: "week-old",
    body: "Dear earlier me, the rain was enough.",
  });
  assert.equal(saved.body, "Dear earlier me, the rain was enough.");
  assert.equal(getPastSelfLetter(db, "member", "week-old").body, saved.body);
  assert.equal(getPastSelfLetter(db, "other", "week-old"), null);

  const updated = savePastSelfLetter(db, {
    userId: "member",
    reviewId: "week-old",
    body: "A softer line.",
  });
  assert.equal(updated.id, saved.id);
  assert.equal(updated.body, "A softer line.");

  db.prepare(`INSERT INTO reviews (id, summary, created_at) VALUES (?, ?, ?)`).run(
    "week-older",
    "",
    "2026-08-01T00:00:00.000Z",
  );
  const stamp = Date.now();
  while (Date.now() === stamp) {
    // Keep the next letter a later updated_at so newest-first is observable.
  }
  savePastSelfLetter(db, { userId: "member", reviewId: "week-older", body: "Older still." });
  const listed = listPastSelfLetters(db, "member");
  assert.equal(listed[0].reviewId, "week-older");
  assert.equal(listed[0].summary, "");
  assert.equal(listed[1].summary, "A rainy shelf");
  assert.equal(JSON.stringify(listed).includes("@"), false);

  assert.equal(savePastSelfLetter(db, { userId: "member", reviewId: "week-old", body: null }), null);
  assert.equal(getPastSelfLetter(db, "member", "week-old"), null);
  db.close();

  const api = read("src/app/api/past-letters/route.ts");
  const letters = read("src/db/past-self-letters.ts");
  const migrate = read("src/db/migrate.ts");
  const history = read("src/app/[locale]/history/page.tsx");
  const list = read("src/components/history-list.tsx");
  const detail = read("src/components/history-detail.tsx");
  const shelf = read("src/components/past-self-letter-shelf.tsx");
  const card = read("src/components/past-self-letter-card.tsx");
  const pricing = read("src/components/pricing-view.tsx");
  const exportRoute = read("src/app/api/account/export/route.ts");

  assert.match(api, /userIsSoftPlus/);
  assert.match(api, /soft_plus_required/);
  assert.match(api, /not_past/);
  assert.match(api, /getReviewForOwner/);
  assert.doesNotMatch(api, /stripe|resend|nodemailer|sendMail/i);
  assert.doesNotMatch(letters, /email/i);
  assert.match(letters, /UNIQUE|review_id/);
  assert.match(migrate, /ensurePastSelfLetters/);
  assert.match(migrate, /UNIQUE \(user_id, review_id\)/);
  assert.match(history, /PastSelfLetterShelf/);
  assert.match(history, /data-past-self-shelf|PastSelfLetterShelf/);
  assert.match(shelf, /data-past-self-shelf="tease"/);
  assert.match(shelf, /data-past-self-shelf="guest"/);
  assert.match(shelf, /data-past-self-shelf="open"/);
  assert.match(shelf, /href="\/pricing"/);
  assert.match(list, /#past-self-letter/);
  assert.match(list, /data-past-letter-link/);
  assert.match(list, /access\?\.softPlus/);
  assert.match(detail, /PastSelfLetterCard/);
  assert.match(card, /id="past-self-letter"/);
  assert.match(card, /data-past-self-letter="tease"/);
  assert.match(card, /data-past-self-letter=\{past \? "editor" : "current"\}/);
  assert.match(pricing, /featurePastLetterFree/);
  assert.match(pricing, /featurePastLetterPlus/);
  assert.doesNotMatch(exportRoute, /past_self_letters|past-letters/);
  assert.doesNotMatch(card, /stripe|resend|nodemailer|sendMail|zh-TW/i);
  assert.doesNotMatch(history, /zh-TW/);

  const locales = ["en", "zh-tw", "ja"].map((locale) => readJson(`messages/${locale}.json`));
  const keys = [
    "title",
    "lead",
    "inApp",
    "archiveTitle",
    "historyLink",
    "teaseTitle",
    "teaseBody",
    "teaseCta",
    "guestBody",
    "notPast",
    "save",
    "weekLabel",
  ];
  for (const messages of locales) {
    for (const key of keys) {
      assert.equal(messages.PastLetter[key].length > 0, true);
    }
    assert.match(messages.PastLetter.weekLabel, /\{week\}/);
    assert.match(messages.PastLetter.count, /\{count\}/);
    assert.match(messages.Pricing.featurePastLetterFree, /\S/);
    assert.match(messages.Pricing.featurePastLetterPlus, /\S/);
    assert.doesNotMatch(JSON.stringify(messages.PastLetter), /zh-TW/);
  }
  assert.match(locales[1].PastLetter.teaseCta, /Soft\+/);
  assert.match(locales[2].PastLetter.inApp, /メール/);
});
