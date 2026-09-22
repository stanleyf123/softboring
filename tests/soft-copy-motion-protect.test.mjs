import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { register } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import Database from "better-sqlite3";

register("./alias-hook.mjs", import.meta.url);

const {
  copyShareText,
  digestSharePath,
  inviteSharePath,
  postcardSharePath,
  resolveShareHref,
  wallNoteSharePath,
  withWallNoteQuery,
} = await import("../src/lib/soft-copy-link.ts");
const { decorativeMotion, prefersReducedMotion } = await import("../src/lib/reduced-motion.ts");
const { saveBloomClasses } = await import("../src/lib/soft-bloom.ts");
const { BREATH_STILL_SCALE, breathDisplayScale } = await import("../src/lib/soft-breath.ts");
const { wallShuffleFeelClass } = await import("../src/lib/wall-shuffle.ts");
const {
  describeStreakRisk,
  monthKeyInTimeZone,
  shouldShowStreakProtectChip,
  streakProtectView,
  weekHasReview,
} = await import("../src/lib/streak-protect.ts");
const { ensureStreakProtectTokens } = await import("../src/db/migrate.ts");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const noteId = "11111111-1111-4111-8111-111111111111";
const reviewId = "22222222-2222-4222-8222-222222222222";

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

test("share links stay on en, zh-tw, or ja and copy quietly", async () => {
  assert.equal(postcardSharePath("zh-TW", reviewId), `/zh-tw/history/${reviewId}`);
  assert.equal(postcardSharePath("EN", reviewId), `/en/history/${reviewId}`);
  assert.equal(digestSharePath("zh-TW"), "/zh-tw/digest");
  assert.equal(
    wallNoteSharePath("ja", noteId),
    `/ja/wall?note=${encodeURIComponent(noteId)}`,
  );
  assert.equal(inviteSharePath("zh-TW", " ABCDEFGHJ2 "), "/zh-tw/register?invite=abcdefghj2");
  assert.equal(postcardSharePath("zh-tw", "not-a-note"), null);
  assert.equal(wallNoteSharePath("ja", "note"), null);
  assert.equal(inviteSharePath("en", "abcdefghij"), null);
  assert.equal(digestSharePath("zh-CN"), null);

  const absolute = resolveShareHref({
    href: `https://softboring.com/zh-TW/wall?note=${noteId}`,
  });
  assert.equal(absolute, `https://softboring.com/zh-tw/wall?note=${noteId}`);
  assert.equal(absolute.includes("zh-TW"), false);
  assert.equal(
    resolveShareHref({ path: `/zh-TW/history/${reviewId}`, origin: "https://softboring.com/" }),
    `https://softboring.com/zh-tw/history/${reviewId}`,
  );
  assert.equal(resolveShareHref({ href: "javascript:alert(1)" }), null);

  const withNote = withWallNoteQuery(`https://softboring.com/zh-TW/wall?shared=1`, noteId);
  assert.equal(withNote.includes("zh-TW"), false);
  assert.match(withNote, /\/zh-tw\/wall\?/);
  assert.match(withNote, new RegExp(`note=${noteId}`));
  assert.match(withNote, /shared=1/);
  assert.equal(withWallNoteQuery(withNote, null).includes("note="), false);

  assert.equal(await copyShareText("", { writeText: async () => {} }), false);
  assert.equal(await copyShareText("https://softboring.com/en/wall", null), false);
  let written = "";
  assert.equal(
    await copyShareText(" https://softboring.com/ja/digest ", {
      writeText: async (value) => {
        written = value;
      },
    }),
    true,
  );
  assert.equal(written, "https://softboring.com/ja/digest");
  assert.equal(
    await copyShareText("https://softboring.com/en", {
      writeText: async () => {
        throw new Error("blocked");
      },
    }),
    false,
  );

  const postcard = read("src/components/soft-postcard-button.tsx");
  const history = read("src/components/history-detail.tsx");
  const wall = read("src/components/wall-board.tsx");
  const account = read("src/components/account-panel.tsx");
  const auth = read("src/components/auth-form.tsx");
  const button = read("src/components/soft-copy-link.tsx");
  assert.match(postcard, /kind="postcard"/);
  assert.match(postcard, /digestSharePath/);
  assert.match(postcard, /postcardSharePath/);
  assert.match(history, /kind="postcard"/);
  assert.match(history, /!softPlus/);
  assert.match(wall, /kind="wall-note"/);
  assert.match(wall, /wallNoteSharePath/);
  assert.match(account, /kind="invite"/);
  assert.match(auth, /kind="invite"/);
  assert.match(auth, /inviteSharePath/);
  assert.match(button, /data-soft-copy-link/);
  assert.match(button, /data-soft-copy-toast="open"/);
  assert.doesNotMatch(button, /stripe|resend|nodemailer|sendMail/i);
  assert.doesNotMatch(read("src/lib/soft-copy-link.ts"), /stripe|resend|sendMail/i);
});

test("bloom, breathe, and shuffle stay still when motion is reduced", () => {
  assert.equal(prefersReducedMotion(true), true);
  assert.equal(prefersReducedMotion(false), false);
  assert.equal(decorativeMotion(true), "still");
  assert.equal(decorativeMotion(false), "move");

  const quiet = saveBloomClasses(true, true);
  assert.equal(quiet.motion, "still");
  assert.equal(quiet.wrap, "");
  assert.equal(quiet.card, "");
  const blooming = saveBloomClasses(true, false);
  assert.equal(blooming.motion, "bloom");
  assert.equal(blooming.wrap, "soft-save-bloom");
  assert.equal(blooming.card, "soft-save-bloom-card");
  assert.equal(saveBloomClasses(false, false).motion, "still");

  assert.equal(breathDisplayScale(1, true), BREATH_STILL_SCALE);
  assert.equal(breathDisplayScale(0.7, false), 0.7);
  assert.equal(breathDisplayScale(Number.NaN, false), BREATH_STILL_SCALE);

  assert.equal(wallShuffleFeelClass(true, true), "relative");
  assert.equal(wallShuffleFeelClass(false, false), "relative");
  assert.equal(wallShuffleFeelClass(true, false), "relative soft-wall-settle");

  const css = read("src/app/globals.css");
  const motionBlock = css.slice(css.lastIndexOf("prefers-reduced-motion: reduce"));
  assert.match(motionBlock, /\.soft-save-bloom::before/);
  assert.match(motionBlock, /\.soft-save-bloom-card/);
  assert.match(motionBlock, /\.soft-wall-settle \.soft-wall-note/);
  assert.match(motionBlock, /\[data-breath-circle\]/);
  assert.match(motionBlock, /animation: none !important/);
  assert.match(motionBlock, /transition: none !important/);

  const bloom = read("src/components/soft-save-bloom.tsx");
  const breath = read("src/components/soft-breath-card.tsx");
  const wall = read("src/components/wall-board.tsx");
  assert.match(bloom, /saveBloomClasses/);
  assert.match(bloom, /data-soft-bloom-motion/);
  assert.match(bloom, /usePrefersReducedMotion/);
  assert.match(breath, /breathDisplayScale/);
  assert.match(breath, /data-breath-motion/);
  assert.match(wall, /wallShuffleFeelClass/);
  assert.match(wall, /data-wall-shuffle-motion/);
});

test("a streak is at risk only while this week is still open", () => {
  const now = new Date("2026-09-22T04:00:00.000Z");
  const previous = "2026-09-15T04:00:00.000Z";
  const older = "2026-09-08T04:00:00.000Z";
  const zone = "Asia/Taipei";
  const open = describeStreakRisk({
    createdAts: [previous, older],
    now,
    timeZone: zone,
  });
  assert.equal(open.atRisk, true);
  assert.equal(open.streak, 2);
  assert.equal(open.currentWeekWritten, false);
  assert.equal(open.monthKey, "2026-09");
  assert.equal(weekHasReview([now.toISOString()], open.weekKey, zone), true);

  const written = describeStreakRisk({
    createdAts: [now.toISOString(), previous],
    now,
    timeZone: zone,
  });
  assert.equal(written.atRisk, false);
  assert.equal(written.currentWeekWritten, true);

  const paused = describeStreakRisk({
    createdAts: [previous, older],
    pausedWeeks: [open.weekKey],
    now,
    timeZone: zone,
  });
  assert.equal(paused.atRisk, false);
  assert.equal(paused.paused ?? paused.currentWeekPaused, true);
  assert.equal(paused.streak, 2);

  assert.equal(
    describeStreakRisk({ createdAts: [], now, timeZone: zone }).atRisk,
    false,
  );

  const edge = new Date("2026-09-30T16:30:00.000Z");
  assert.equal(monthKeyInTimeZone(edge, "Asia/Taipei"), "2026-10");
  assert.equal(monthKeyInTimeZone(edge, "UTC"), "2026-09");

  const tease = streakProtectView({ softPlus: false, risk: open, usedThisMonth: false });
  assert.equal(tease.available, false);
  assert.equal(tease.atRisk, true);
  assert.equal(shouldShowStreakProtectChip(tease), true);
  const ready = streakProtectView({ softPlus: true, risk: open, usedThisMonth: false });
  assert.equal(ready.available, true);
  const spent = streakProtectView({ softPlus: true, risk: open, usedThisMonth: true });
  assert.equal(spent.available, false);
  assert.equal(spent.usedThisMonth, true);
  assert.equal(
    shouldShowStreakProtectChip(streakProtectView({ softPlus: true, risk: written, usedThisMonth: false })),
    false,
  );
});

test("Soft+ can spend one pause-instead token a month, and a plain pause does not", async () => {
  const memory = new Database(":memory:");
  ensureStreakProtectTokens(memory);
  ensureStreakProtectTokens(memory);
  const table = memory
    .prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'streak_protect_tokens'`,
    )
    .get();
  assert.equal(table.name, "streak_protect_tokens");
  memory.close();

  assert.match(read("scripts/schema.sql"), /CREATE TABLE IF NOT EXISTS streak_protect_tokens/);
  assert.match(read("scripts/migrate.mjs"), /streak_protect_tokens/);
  assert.match(read("src/db/migrate.ts"), /ensureStreakProtectTokens/);

  const dir = mkdtempSync(join(tmpdir(), "softboring-protect-"));
  const previousPath = process.env.SQLITE_PATH;
  process.env.SQLITE_PATH = join(dir, "test.sqlite");
  if (globalThis.__softboringSqlite) {
    globalThis.__softboringSqlite.close();
    delete globalThis.__softboringSqlite;
  }

  try {
    const { readStreakProtect, spendStreakProtectToken } = await import(
      "../src/db/streak-protect.ts"
    );
    const { setWeekPaused } = await import("../src/db/week-pauses.ts");
    const { getDb } = await import("../src/db/client.ts");
    const db = getDb();
    const now = new Date("2026-09-22T04:00:00.000Z");
    db.prepare(
      `INSERT INTO users (id, email, password_hash, created_at, plan, plan_status)
       VALUES ('member', 'protect@example.com', 'x', '2026-09-01T00:00:00.000Z', 'soft_plus', 'active')`,
    ).run();
    db.prepare(
      `INSERT INTO reviews (id, guest_id, user_id, summary, created_at) VALUES (?, 'g', 'member', '', ?)`,
    ).run("r1", "2026-09-15T04:00:00.000Z");
    db.prepare(
      `INSERT INTO reviews (id, guest_id, user_id, summary, created_at) VALUES (?, 'g', 'member', '', ?)`,
    ).run("r2", "2026-09-08T04:00:00.000Z");

    const before = readStreakProtect("member", true, now);
    assert.equal(before.atRisk, true);
    assert.equal(before.available, true);
    assert.equal(before.streak, 2);

    const denied = spendStreakProtectToken("member", false, now);
    assert.equal(denied.ok, false);
    assert.equal(denied.reason, "soft_plus_required");
    assert.equal(
      db.prepare(`SELECT COUNT(*) AS n FROM streak_protect_tokens`).get().n,
      0,
    );
    assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM week_pauses`).get().n, 0);

    const plain = "33333333-3333-4333-8333-333333333333";
    db.prepare(
      `INSERT INTO users (id, email, password_hash, created_at) VALUES ('plain', 'plain@example.com', 'x', '2026-09-01T00:00:00.000Z')`,
    ).run();
    const plainWeek = readStreakProtect("plain", false, now).weekKey;
    setWeekPaused("plain", plainWeek, true);
    assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM streak_protect_tokens`).get().n, 0);
    assert.equal(readStreakProtect("plain", false, now).atRisk, false);

    const used = spendStreakProtectToken("member", true, now);
    assert.equal(used.ok, true);
    assert.equal(used.view.paused, true);
    assert.equal(used.view.atRisk, false);
    assert.equal(used.view.usedThisMonth, true);
    assert.equal(used.view.available, false);
    assert.equal(
      db.prepare(`SELECT week_key FROM week_pauses WHERE user_id = 'member'`).get().week_key,
      before.weekKey,
    );

    const again = spendStreakProtectToken("member", true, now);
    assert.equal(again.ok, false);
    assert.equal(again.reason, "not_at_risk");
    setWeekPaused("member", before.weekKey, false);
    const spent = spendStreakProtectToken("member", true, now);
    assert.equal(spent.ok, false);
    assert.equal(spent.reason, "already_used");
    assert.equal(readStreakProtect("member", true, now).available, false);
    assert.equal(
      db.prepare(`SELECT COUNT(*) AS n FROM streak_protect_tokens WHERE user_id = 'member'`).get()
        .n,
      1,
    );

    const october = new Date("2026-10-06T04:00:00.000Z");
    db.prepare(
      `INSERT INTO reviews (id, guest_id, user_id, summary, created_at) VALUES (?, 'g', 'member', '', ?)`,
    ).run("r3", "2026-09-29T04:00:00.000Z");
    const nextMonth = spendStreakProtectToken("member", true, october);
    assert.equal(nextMonth.ok, true);
    assert.equal(nextMonth.view.monthKey, "2026-10");
    assert.equal(
      db.prepare(`SELECT COUNT(*) AS n FROM streak_protect_tokens WHERE user_id = 'member'`).get()
        .n,
      2,
    );

    db.prepare(`DELETE FROM users WHERE id = 'member'`).run();
    assert.equal(
      db.prepare(`SELECT COUNT(*) AS n FROM streak_protect_tokens WHERE user_id = 'member'`).get()
        .n,
      0,
    );
    assert.equal(
      db.prepare(`SELECT COUNT(*) AS n FROM week_pauses WHERE user_id = 'member'`).get().n,
      0,
    );
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
});

test("streak protect stays in-app, Soft+ gated, and translated", () => {
  const route = read("src/app/api/streak-protect/route.ts");
  const chip = read("src/components/streak-protect-chip.tsx");
  const home = read("src/app/[locale]/page.tsx");
  const review = read("src/app/[locale]/review/page.tsx");
  const pricing = read("src/components/pricing-view.tsx");
  const pauseRoute = read("src/app/api/week-pause/route.ts");

  assert.match(route, /userIsSoftPlus/);
  assert.match(route, /soft_plus_required/);
  assert.match(route, /spendStreakProtectToken/);
  assert.doesNotMatch(route, /stripe|resend|nodemailer|sendMail/i);
  assert.doesNotMatch(read("src/lib/streak-protect.ts"), /stripe|resend|sendMail/i);
  assert.doesNotMatch(read("src/db/streak-protect.ts"), /stripe|resend|sendMail/i);
  assert.doesNotMatch(pauseRoute, /streak-protect|streak_protect/);

  assert.match(chip, /data-streak-protect="tease"/);
  assert.match(chip, /data-streak-protect="ready"/);
  assert.match(chip, /data-streak-protect="used"/);
  assert.match(chip, /data-streak-protect="kept"/);
  assert.match(chip, /href="\/pricing"/);
  assert.match(chip, /WEEK_PAUSE_CHANGED_EVENT/);
  assert.match(home, /StreakProtectChip/);
  assert.match(review, /StreakProtectChip/);
  assert.match(pricing, /featureStreakProtectFree/);
  assert.match(pricing, /featureStreakProtectPlus/);

  const locales = ["en", "zh-tw", "ja"].map((locale) => readJson(`messages/${locale}.json`));
  for (const copy of locales) {
    assert.equal(typeof copy.SoftCopy.copy, "string");
    assert.equal(typeof copy.SoftCopy.copied, "string");
    assert.equal(typeof copy.SoftCopy.hintPostcard, "string");
    assert.equal(typeof copy.SoftCopy.hintWall, "string");
    assert.equal(typeof copy.SoftCopy.hintInvite, "string");
    assert.equal(typeof copy.StreakProtect.chip, "string");
    assert.equal(typeof copy.StreakProtect.use, "string");
    assert.equal(typeof copy.StreakProtect.tease, "string");
    assert.equal(typeof copy.StreakProtect.privacy, "string");
    assert.equal(typeof copy.Pricing.featureStreakProtectFree, "string");
    assert.equal(typeof copy.Pricing.featureStreakProtectPlus, "string");
    assert.equal(copy.StreakProtect.chip.includes("{count}"), true);
  }
  assert.equal(locales[0].SoftCopy.copied, "Copied.");
  assert.equal(locales[1].SoftCopy.copy, "複製連結");
  assert.equal(locales[2].SoftCopy.copy, "リンクをコピー");
  assert.equal(locales[1].StreakProtect.privacy.includes("不寄信"), true);
  assert.equal(locales[2].StreakProtect.privacy.includes("メール"), true);
  assert.equal(locales[0].Pricing.featureStreakProtectPlus.includes("no email"), true);
});
