import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { register } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

register("./alias-hook.mjs", import.meta.url);

const { ensureSoftGratitudeDraws, ensureWallPresenceHours, migrateDb } = await import(
  "../src/db/migrate.ts"
);
const { readMonthlySoftReport } = await import("../src/db/soft-report.ts");
const { applyPresenceVisit, recordPresenceHit } = await import("../src/db/wall-presence.ts");
const { isoWeekKeyFromParts, isoWeekKeyInTimeZone } = await import("../src/lib/plus-insights.ts");
const {
  countInstantsInMonth,
  pauseWeeksTouchingMonth,
} = await import("../src/lib/soft-report.ts");
const {
  SOUNDSCAPE_STORAGE_KEY,
  readSoundscapeEnabled,
  soundscapeClick,
  soundscapeEnabledFromStorage,
  soundscapePeakGain,
  writeSoundscapeEnabled,
} = await import("../src/lib/soft-soundscape.ts");
const {
  claimPresencePing,
  neighborPresenceCount,
  presenceBand,
  presenceCookieOptions,
  presenceHourKey,
  presencePublicView,
  resetPresencePingClaim,
  shouldCountPresenceHit,
} = await import("../src/lib/wall-presence.ts");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

test("soft sound stays off until a gesture, and the pad stays very quiet", () => {
  assert.equal(soundscapeEnabledFromStorage(null), false);
  assert.equal(soundscapeEnabledFromStorage(""), false);
  assert.equal(soundscapeEnabledFromStorage("true"), false);
  assert.equal(soundscapeEnabledFromStorage("{"), false);
  assert.equal(soundscapeEnabledFromStorage('{"enabled":false}'), false);
  assert.equal(soundscapeEnabledFromStorage('{"enabled":1}'), false);
  assert.equal(soundscapeEnabledFromStorage('{"enabled":true}'), true);
  assert.equal(soundscapePeakGain() < 0.03, true);
  assert.equal(soundscapePeakGain() > 0, true);

  assert.equal(soundscapeClick({ playing: false, enabled: false }), "start");
  assert.equal(soundscapeClick({ playing: false, enabled: true }), "resume");
  assert.equal(soundscapeClick({ playing: true, enabled: true }), "stop");
  assert.equal(soundscapeClick({ playing: true, enabled: false }), "stop");

  const bag = new Map();
  const storage = {
    getItem: (key) => bag.get(key) ?? null,
    setItem: (key, value) => bag.set(key, value),
  };
  assert.equal(readSoundscapeEnabled(storage), false);
  writeSoundscapeEnabled(true, storage);
  assert.equal(bag.has(SOUNDSCAPE_STORAGE_KEY), true);
  assert.equal(readSoundscapeEnabled(storage), true);
  writeSoundscapeEnabled(false, storage);
  assert.equal(readSoundscapeEnabled(storage), false);

  const toggle = read("src/components/soft-soundscape-toggle.tsx");
  const effectAt = toggle.indexOf("useEffect");
  const pressAt = toggle.indexOf("function onPress");
  assert.ok(effectAt >= 0 && pressAt > effectAt);
  assert.doesNotMatch(toggle.slice(effectAt, pressAt), /startSoftSoundscape/);
  assert.match(toggle.slice(pressAt), /startSoftSoundscape/);
  assert.match(toggle, /soundscapeClick/);
  assert.match(toggle, /data-soft-soundscape/);
  assert.match(read("src/app/[locale]/review/page.tsx"), /SoftSoundscapeToggle/);
  assert.doesNotMatch(toggle, /softPlus|sendMail|stripe|resend/i);
  assert.match(read("src/app/globals.css"), /\.soft-sound-live/);
});

test("neighbor presence is an anonymous count, with hits or recent warmth", () => {
  assert.equal(presenceHourKey(new Date("2026-09-22T18:10:00.000Z")), "2026-09-22T18");
  assert.equal(presenceHourKey(new Date("nope")), "");
  assert.equal(shouldCountPresenceHit(null, "2026-09-22T18"), true);
  assert.equal(shouldCountPresenceHit("2026-09-22T18", "2026-09-22T18"), false);
  assert.equal(shouldCountPresenceHit("2026-09-22T17", "2026-09-22T18"), true);
  assert.equal(shouldCountPresenceHit("2026-09-22T18", ""), false);

  assert.equal(neighborPresenceCount({ readers: 0, warmth: 0 }), 0);
  assert.equal(neighborPresenceCount({ readers: 0, warmth: 3 }), 3);
  assert.equal(neighborPresenceCount({ readers: 2, warmth: 9 }), 2);
  assert.equal(neighborPresenceCount({ readers: Number.NaN, warmth: -4 }), 0);
  assert.equal(presenceBand(0), "quiet");
  assert.equal(presenceBand(1), "one");
  assert.equal(presenceBand(4), "few");
  assert.equal(presenceBand(5), "circle");
  assert.equal(presenceBand(13), "many");

  const view = presencePublicView({ readers: 0, warmth: 3 });
  assert.deepEqual(Object.keys(view).sort(), ["band", "neighbors", "windowHours"]);
  assert.equal(view.neighbors, 3);
  assert.equal(view.band, "few");
  assert.equal(JSON.stringify(view).includes("user"), false);

  const cookie = presenceCookieOptions();
  assert.equal(cookie.httpOnly, true);
  assert.equal(cookie.sameSite, "lax");

  resetPresencePingClaim();
  assert.equal(claimPresencePing(), true);
  assert.equal(claimPresencePing(), false);
  resetPresencePingClaim();
  assert.equal(claimPresencePing(), true);

  const dir = mkdtempSync(join(tmpdir(), "softboring-presence-"));
  const db = new Database(join(dir, "test.sqlite"));
  db.pragma("foreign_keys = ON");
  migrateDb(db);
  const now = new Date("2026-09-22T18:10:00.000Z");
  db.prepare(`INSERT INTO wall_presence_hours (hour_key, hits) VALUES ('2020-01-01T00', 9)`).run();
  const first = applyPresenceVisit(db, now, { count: true, cookieHour: null });
  assert.equal(first.setCookieHour, "2026-09-22T18");
  assert.equal(first.view.neighbors, 1);
  const again = applyPresenceVisit(db, now, { count: true, cookieHour: first.setCookieHour });
  assert.equal(again.setCookieHour, null);
  assert.equal(again.view.neighbors, 1);
  const nextHour = applyPresenceVisit(db, new Date("2026-09-22T19:05:00.000Z"), {
    count: true,
    cookieHour: first.setCookieHour,
  });
  assert.equal(nextHour.view.neighbors, 2);
  assert.equal(
    db.prepare(`SELECT hits FROM wall_presence_hours WHERE hour_key = '2020-01-01T00'`).get(),
    undefined,
  );
  const columns = db
    .prepare(`PRAGMA table_info(wall_presence_hours)`)
    .all()
    .map((row) => row.name);
  assert.deepEqual(columns, ["hour_key", "hits"]);
  db.close();
  rmSync(dir, { recursive: true, force: true });

  const warmDir = mkdtempSync(join(tmpdir(), "softboring-warmth-"));
  const warm = new Database(join(warmDir, "test.sqlite"));
  warm.pragma("foreign_keys = ON");
  migrateDb(warm);
  const stamp = "2026-09-22T16:00:00.000Z";
  warm.prepare(
    `INSERT INTO users (id, email, password_hash, created_at) VALUES ('member', 'm@example.com', 'x', ?)`,
  ).run(stamp);
  warm.prepare(
    `INSERT INTO users (id, email, password_hash, created_at) VALUES ('other', 'o@example.com', 'x', ?)`,
  ).run(stamp);
  warm.prepare(
    `INSERT INTO reviews (id, guest_id, user_id, created_at) VALUES ('rev', 'guest', 'other', ?)`,
  ).run(stamp);
  warm.prepare(
    `INSERT INTO wall_notes (id, review_id, user_id, created_at, updated_at) VALUES ('note', 'rev', 'other', ?, ?)`,
  ).run(stamp, stamp);
  warm.prepare(
    `INSERT INTO wall_note_thanks (user_id, note_id, created_at) VALUES ('member', 'note', ?)`,
  ).run(stamp);
  warm.prepare(
    `INSERT INTO wall_note_echoes (user_id, note_id, body, created_at, updated_at) VALUES ('other', 'note', 'soft', ?, ?)`,
  ).run(stamp, stamp);
  const warmth = applyPresenceVisit(warm, new Date("2026-09-22T18:10:00.000Z"), { count: false });
  assert.equal(warmth.setCookieHour, null);
  assert.equal(warmth.view.neighbors, 2);
  assert.equal(warmth.view.band, "few");
  warm.close();
  rmSync(warmDir, { recursive: true, force: true });

  const memory = new Database(":memory:");
  memory.exec(`CREATE TABLE users (id TEXT PRIMARY KEY)`);
  ensureWallPresenceHours(memory);
  ensureWallPresenceHours(memory);
  recordPresenceHit(memory, new Date("2026-09-22T18:00:00.000Z"));
  assert.equal(memory.prepare(`SELECT hits FROM wall_presence_hours`).get().hits, 1);
  memory.close();

  const route = read("src/app/api/wall/presence/route.ts");
  const strip = read("src/components/neighbor-presence.tsx");
  const board = read("src/components/wall-board.tsx");
  assert.doesNotMatch(route, /requireSoftPlus|userIsSoftPlus/);
  assert.match(route, /NextResponse\.json\(view\)/);
  assert.doesNotMatch(route, /email|nickname/);
  assert.doesNotMatch(strip, /softPlus|requireSoftPlus/);
  assert.equal((board.match(/<NeighborPresence \/>/g) ?? []).length, 2);
  assert.doesNotMatch([route, strip].join("\n"), /sendMail|resend|stripe|nodemailer/i);
});

test("the monthly soft report counts this timezone's month and stays on Soft+", () => {
  const now = new Date("2026-09-22T04:00:00.000Z");
  const taipei = "Asia/Taipei";
  const currentWeek = isoWeekKeyInTimeZone(now, taipei);
  const borderWeek = isoWeekKeyFromParts(2026, 9, 1);
  const augustOnly = isoWeekKeyFromParts(2026, 8, 24);
  assert.equal(pauseWeeksTouchingMonth([currentWeek, currentWeek, "nope"], now, taipei), 1);
  assert.equal(pauseWeeksTouchingMonth([borderWeek], now, taipei), 1);
  assert.equal(pauseWeeksTouchingMonth([augustOnly, "2026-W02"], now, taipei), 0);

  const edge = new Date("2026-09-01T00:30:00.000Z");
  const midSeptember = isoWeekKeyFromParts(2026, 9, 15);
  assert.equal(pauseWeeksTouchingMonth([midSeptember], edge, "Asia/Taipei"), 1);
  assert.equal(pauseWeeksTouchingMonth([midSeptember], edge, "America/Los_Angeles"), 0);

  assert.equal(
    countInstantsInMonth(
      ["2026-09-01T00:30:00.000Z", "2026-08-31T15:00:00.000Z", "not-a-date"],
      now,
      taipei,
    ),
    1,
  );
  assert.equal(
    countInstantsInMonth(["2026-09-01T00:30:00.000Z"], now, "America/Los_Angeles"),
    0,
  );

  const dir = mkdtempSync(join(tmpdir(), "softboring-report-"));
  const db = new Database(join(dir, "test.sqlite"));
  db.pragma("foreign_keys = ON");
  migrateDb(db);
  const created = "2026-01-01T00:00:00.000Z";
  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at) VALUES ('member', 'm@example.com', 'x', ?)`,
  ).run(created);
  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at) VALUES ('other', 'o@example.com', 'x', ?)`,
  ).run(created);
  db.prepare(
    `INSERT INTO reviews (id, guest_id, user_id, created_at) VALUES ('rev-m', 'g', 'member', ?)`,
  ).run(created);
  db.prepare(
    `INSERT INTO reviews (id, guest_id, user_id, created_at) VALUES ('rev-o', 'g2', 'other', ?)`,
  ).run(created);
  db.prepare(
    `INSERT INTO wall_notes (id, review_id, user_id, created_at, updated_at) VALUES ('note-m', 'rev-m', 'member', ?, ?)`,
  ).run(created, created);
  db.prepare(
    `INSERT INTO wall_notes (id, review_id, user_id, created_at, updated_at) VALUES ('note-o', 'rev-o', 'other', ?, ?)`,
  ).run(created, created);
  db.prepare(
    `INSERT INTO wall_note_thanks (user_id, note_id, created_at) VALUES ('member', 'note-o', '2026-09-10T03:00:00.000Z')`,
  ).run();
  db.prepare(
    `INSERT INTO wall_note_thanks (user_id, note_id, created_at) VALUES ('member', 'note-m', '2026-08-02T03:00:00.000Z')`,
  ).run();
  db.prepare(
    `INSERT INTO wall_note_thanks (user_id, note_id, created_at) VALUES ('other', 'note-m', '2026-09-11T03:00:00.000Z')`,
  ).run();
  db.prepare(
    `INSERT INTO wall_note_echoes (user_id, note_id, body, created_at, updated_at)
     VALUES ('member', 'note-o', 'hello', '2026-09-12T00:00:00.000Z', '2026-09-12T00:00:00.000Z')`,
  ).run();
  db.prepare(
    `INSERT INTO wall_note_echoes (user_id, note_id, body, created_at, updated_at)
     VALUES ('other', 'note-m', 'yo', '2026-09-12T00:00:00.000Z', '2026-09-12T00:00:00.000Z')`,
  ).run();
  db.prepare(
    `INSERT INTO soft_gratitude_draws (id, user_id, created_at) VALUES ('d1', 'member', '2026-09-02T00:00:00.000Z')`,
  ).run();
  db.prepare(
    `INSERT INTO soft_gratitude_draws (id, user_id, created_at) VALUES ('d2', 'member', '2026-08-02T00:00:00.000Z')`,
  ).run();
  db.prepare(
    `INSERT INTO soft_gratitude_draws (id, user_id, created_at) VALUES ('d3', 'other', '2026-09-02T00:00:00.000Z')`,
  ).run();
  db.prepare(`INSERT INTO week_pauses (user_id, week_key, created_at) VALUES ('member', ?, ?)`).run(
    currentWeek,
    created,
  );
  db.prepare(`INSERT INTO week_pauses (user_id, week_key, created_at) VALUES ('member', ?, ?)`).run(
    augustOnly,
    created,
  );
  db.prepare(
    `INSERT INTO week_pauses (user_id, week_key, created_at) VALUES ('other', ?, ?)`,
  ).run(currentWeek, created);

  const report = readMonthlySoftReport(db, "member", now, taipei);
  assert.equal(report.timeZone, taipei);
  assert.equal(report.year, 2026);
  assert.equal(report.month, 9);
  assert.equal(report.thanksGiven, 1);
  assert.equal(report.echoes, 1);
  assert.equal(report.gratitudesDrawn, 1);
  assert.equal(report.pauseWeeks, 1);
  assert.equal(JSON.stringify(report).includes("@"), false);

  const drawColumns = db
    .prepare(`PRAGMA table_info(soft_gratitude_draws)`)
    .all()
    .map((row) => row.name);
  assert.deepEqual(drawColumns, ["id", "user_id", "created_at"]);

  db.prepare(`DELETE FROM users WHERE id = 'member'`).run();
  assert.equal(
    db.prepare(`SELECT COUNT(*) AS n FROM soft_gratitude_draws WHERE user_id = 'member'`).get().n,
    0,
  );
  assert.equal(
    db.prepare(`SELECT COUNT(*) AS n FROM soft_gratitude_draws WHERE user_id = 'other'`).get().n,
    1,
  );
  db.close();
  rmSync(dir, { recursive: true, force: true });

  const fresh = new Database(":memory:");
  fresh.exec(`CREATE TABLE users (id TEXT PRIMARY KEY)`);
  ensureSoftGratitudeDraws(fresh);
  ensureSoftGratitudeDraws(fresh);
  assert.equal(
    fresh
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'soft_gratitude_draws'`,
      )
      .get().name,
    "soft_gratitude_draws",
  );
  fresh.close();

  const page = read("src/app/[locale]/digest/page.tsx");
  const plusAt = page.indexOf("user && softPlus");
  const teaseAt = page.indexOf("<SoftReportTease");
  assert.ok(plusAt > 0 && teaseAt > plusAt);
  assert.match(page.slice(plusAt, teaseAt), /readMonthlySoftReport/);
  assert.doesNotMatch(page.slice(teaseAt), /readMonthlySoftReport/);
  assert.match(page, /userIsSoftPlus/);
  assert.match(page, /data-soft-report="locked"/);
  assert.match(read("src/components/soft-report-section.tsx"), /data-soft-report="open"/);
  assert.match(read("src/components/soft-report-section.tsx"), /data-soft-report="tease"/);
  assert.match(read("src/components/soft-report-section.tsx"), /teaseValue/);
  assert.match(read("src/components/digest-panel.tsx"), /SoftReportSection/);
  assert.match(read("src/app/api/gratitude-jar/route.ts"), /if \(drawn\) recordGratitudeDraw/);
  assert.match(read("src/app/api/gratitude-jar/route.ts"), /userIsSoftPlus/);
  assert.match(read("src/components/pricing-view.tsx"), /featureDigestPlus/);
  assert.match(read("src/components/pricing-view.tsx"), /featureDigestFree/);

  const schema = read("scripts/schema.sql");
  const drawsAt = schema.indexOf("CREATE TABLE IF NOT EXISTS soft_gratitude_draws");
  const presenceAt = schema.indexOf("CREATE TABLE IF NOT EXISTS wall_presence_hours");
  assert.ok(drawsAt > 0 && presenceAt > drawsAt);
  assert.match(schema.slice(drawsAt, presenceAt), /ON DELETE CASCADE/);
  assert.doesNotMatch(schema.slice(drawsAt, presenceAt), /\bbody\b/);
  assert.doesNotMatch(schema.slice(presenceAt), /user_id|email|ip_address/);
  assert.match(read("src/db/migrate.ts"), /ensureSoftGratitudeDraws/);
  assert.match(read("src/db/migrate.ts"), /ensureWallPresenceHours/);
  assert.match(read("scripts/migrate.mjs"), /soft_gratitude_draws/);
  assert.match(read("scripts/migrate.mjs"), /wall_presence_hours/);

  const freshSources = [
    "src/lib/soft-soundscape.ts",
    "src/lib/wall-presence.ts",
    "src/lib/soft-report.ts",
    "src/db/wall-presence.ts",
    "src/db/soft-report.ts",
    "src/components/soft-soundscape-toggle.tsx",
    "src/components/neighbor-presence.tsx",
    "src/components/soft-report-section.tsx",
    "src/app/api/wall/presence/route.ts",
  ]
    .map((path) => read(path))
    .join("\n");
  assert.doesNotMatch(freshSources, /sendMail|resend|stripe|nodemailer|SMTP/i);
  assert.doesNotMatch(freshSources, /zh-TW/);
});

test("soundscape, presence, and soft report copy exists in en / zh-tw / ja", () => {
  const soundKeys = ["title", "hint", "off", "resume", "playing"];
  const presenceKeys = ["kicker", "loading", "error", "quiet", "one", "few", "circle", "many", "window"];
  const reportKeys = [
    "reportTitle",
    "reportLead",
    "thanksLabel",
    "echoesLabel",
    "drawsLabel",
    "pausesLabel",
    "reportHint",
    "teaseTitle",
    "teaseBody",
    "teaseValue",
    "teaseCta",
  ];
  const locales = ["messages/en.json", "messages/zh-tw.json", "messages/ja.json"].map(readJson);
  for (const messages of locales) {
    for (const key of soundKeys) assert.equal(typeof messages.Soundscape[key], "string");
    for (const key of presenceKeys) assert.equal(typeof messages.NeighborPresence[key], "string");
    for (const key of reportKeys) assert.equal(typeof messages.Digest[key], "string");
    assert.equal(messages.Digest.teaseValue, "—");
    assert.match(messages.Pricing.featureDigestFree, /Soft\+/);
    assert.match(messages.Pricing.featureDigestPlus, /Soft\+|ありがとう|謝謝|thanks|エコー|回聲/);
  }
  assert.notEqual(locales[0].Soundscape.title, locales[1].Soundscape.title);
  assert.notEqual(locales[0].NeighborPresence.few, locales[2].NeighborPresence.few);
  assert.notEqual(locales[0].Digest.reportTitle, locales[1].Digest.reportTitle);
});
