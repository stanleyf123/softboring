import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { register } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

register("./alias-hook.mjs", import.meta.url);

const { ensureSoftWeekReflections } = await import("../src/db/migrate.ts");
const { nextPublicWallCount, PUBLIC_WALL_NOTE_TTL_MS } = await import(
  "../src/lib/public-wall-count.ts"
);
const {
  emptySoftReflection,
  parseSoftReflectionChecks,
  parseSoftReflectionPayload,
  reflectionCheckedCount,
  SOFT_REFLECTION_ITEMS,
} = await import("../src/lib/soft-reflection.ts");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

test("skip link reveals for keyboard focus and chrome keeps a cream ring", () => {
  const layout = read("src/app/[locale]/layout.tsx");
  const css = read("src/app/globals.css");
  const header = read("src/components/site-header.tsx");
  const footer = read("src/components/site-footer.tsx");
  const mobile = read("src/components/mobile-bottom-nav.tsx");
  const focus = read("src/lib/soft-focus.ts");

  assert.match(layout, /skipToContent/);
  assert.match(layout, /soft-skip-link/);
  assert.match(layout, /data-soft-skip/);
  assert.match(layout, /id="main-content"/);
  assert.match(layout, /tabIndex=\{-1\}/);
  assert.match(css, /\.soft-skip-link:focus-visible/);
  assert.match(css, /outline: 3px solid var\(--accent\)/);
  assert.match(css, /\.soft-chrome-focus:focus-visible/);
  assert.match(css, /#main-content:focus/);
  assert.match(focus, /soft-chrome-focus/);
  assert.match(header, /SOFT_CHROME_FOCUS/);
  assert.match(footer, /SOFT_CHROME_FOCUS/);
  assert.match(mobile, /SOFT_CHROME_FOCUS/);
  assert.match(read("src/components/locale-switcher.tsx"), /SOFT_CHROME_FOCUS/);
  assert.match(read("src/components/notification-bell.tsx"), /SOFT_CHROME_FOCUS/);
  assert.doesNotMatch(layout, /zh-TW/);
});

test("public wall count is cached, hidden notes stay out, and the homepage shows it", () => {
  let loads = 0;
  const first = nextPublicWallCount({
    cache: null,
    now: 1_000,
    ttl: 1_000,
    load: () => {
      loads += 1;
      return 12.9;
    },
  });
  assert.equal(first.fresh, true);
  assert.equal(first.value, 12);
  assert.equal(loads, 1);

  const again = nextPublicWallCount({
    cache: first.cache,
    now: 1_500,
    ttl: 1_000,
    load: () => {
      loads += 1;
      return 99;
    },
  });
  assert.equal(again.fresh, false);
  assert.equal(again.value, 12);
  assert.equal(loads, 1);

  const later = nextPublicWallCount({
    cache: again.cache,
    now: 2_000,
    ttl: 1_000,
    load: () => {
      loads += 1;
      return -4;
    },
  });
  assert.equal(later.fresh, true);
  assert.equal(later.value, 0);
  assert.equal(loads, 2);

  const backward = nextPublicWallCount({
    cache: later.cache,
    now: 100,
    ttl: PUBLIC_WALL_NOTE_TTL_MS,
    load: () => 3,
  });
  assert.equal(backward.fresh, true);
  assert.equal(backward.value, 3);

  const stats = read("src/db/soft-stats.ts");
  assert.match(stats, /hidden = 0/);
  assert.match(stats, /publicWallNotes/);
  assert.match(stats, /nextPublicWallCount/);
  assert.doesNotMatch(stats, /SELECT[^`]*email/i);
  assert.doesNotMatch(stats, /\bsummary\b/);

  const home = read("src/app/[locale]/page.tsx");
  assert.match(home, /PublicWallCounter/);
  assert.match(home, /wallCountAria/);
  assert.match(home, /HomeSoftStats/);
  assert.match(read("src/components/public-wall-counter.tsx"), /href="\/wall"/);
  assert.match(read("src/components/soft-stats-strip.tsx"), /publicWallNotes/);
  assert.doesNotMatch(read("src/components/public-wall-counter.tsx"), /stripe|nodemailer|resend/i);
});

test("soft reflection checklist is three optional Soft+ marks kept with the week", () => {
  assert.deepEqual(SOFT_REFLECTION_ITEMS, ["noticed", "unfinished", "kind"]);
  assert.equal(reflectionCheckedCount(emptySoftReflection()), 0);
  assert.deepEqual(parseSoftReflectionChecks({ noticed: true, unfinished: false, kind: true }), {
    noticed: true,
    unfinished: false,
    kind: true,
  });
  assert.equal(parseSoftReflectionChecks({ noticed: true, unfinished: false }), null);
  assert.equal(parseSoftReflectionChecks({ noticed: "yes", unfinished: false, kind: false }), null);
  assert.equal(parseSoftReflectionPayload({ checks: { noticed: false, unfinished: false, kind: false } })?.kind, false);
  assert.equal(parseSoftReflectionPayload({ noticed: true }), null);
  assert.equal(reflectionCheckedCount({ noticed: true, unfinished: true, kind: false }), 2);

  const memory = new Database(":memory:");
  ensureSoftWeekReflections(memory);
  ensureSoftWeekReflections(memory);
  const columns = memory.prepare(`PRAGMA table_info(soft_week_reflections)`).all().map((col) => col.name);
  for (const name of ["week_key", "noticed", "unfinished", "kind"]) {
    assert.ok(columns.includes(name));
  }
  memory.close();

  assert.match(read("scripts/schema.sql"), /CREATE TABLE IF NOT EXISTS soft_week_reflections/);
  assert.match(read("scripts/migrate.mjs"), /soft_week_reflections/);
  assert.match(read("src/db/migrate.ts"), /ensureSoftWeekReflections/);

  const api = read("src/app/api/soft-reflections/route.ts");
  assert.match(api, /userIsSoftPlus/);
  assert.match(api, /soft_plus_required/);
  assert.match(api, /auth_required/);
  assert.match(api, /PUT/);
  assert.doesNotMatch(api, /stripe|nodemailer|resend/i);

  const card = read("src/components/soft-reflection-card.tsx");
  assert.match(card, /data-soft-reflection="tease"/);
  assert.match(card, /data-soft-reflection="guest"/);
  assert.match(card, /data-soft-reflection="ready"/);
  assert.match(card, /href="\/pricing"/);
  assert.match(card, /SOFT_REFLECTION_ITEMS/);
  assert.match(card, /\/api\/soft-reflections/);
  assert.doesNotMatch(card, /stripe|nodemailer|resend/i);

  const review = read("src/app/[locale]/review/page.tsx");
  assert.match(review, /SoftReflectionCard/);
  assert.match(review, /softPlus=\{softPlus\}/);
  assert.match(read("src/components/pricing-view.tsx"), /featureReflectionPlus/);
  assert.match(read("src/components/pricing-view.tsx"), /featureReflectionFree/);
});

test("reflection rows stay on their own week and leave with the member", async () => {
  const dir = mkdtempSync(join(tmpdir(), "softboring-reflection-"));
  const previousPath = process.env.SQLITE_PATH;
  process.env.SQLITE_PATH = join(dir, "test.sqlite");
  if (globalThis.__softboringSqlite) {
    globalThis.__softboringSqlite.close();
    delete globalThis.__softboringSqlite;
  }

  try {
    const { getDb } = await import("../src/db/client.ts");
    const { getSoftReflectionForWeek, saveSoftReflectionForWeek } = await import(
      "../src/db/soft-reflections.ts"
    );
    const db = getDb();
    db.prepare(
      `INSERT INTO users (id, email, password_hash, created_at)
       VALUES ('member', 'marks@example.com', 'x', '2026-09-22T00:00:00.000Z')`,
    ).run();

    const first = saveSoftReflectionForWeek({
      userId: "member",
      weekKey: "2026-W10",
      checks: { noticed: true, unfinished: false, kind: false },
      now: new Date("2026-03-02T00:00:00.000Z"),
    });
    assert.equal(first.checks.noticed, true);
    assert.equal(first.weekKey, "2026-W10");

    const second = saveSoftReflectionForWeek({
      userId: "member",
      weekKey: "2026-W11",
      checks: { noticed: false, unfinished: false, kind: true },
      now: new Date("2026-03-09T00:00:00.000Z"),
    });
    assert.equal(second.checks.kind, true);

    const again = saveSoftReflectionForWeek({
      userId: "member",
      weekKey: "2026-W10",
      checks: { noticed: true, unfinished: true, kind: false },
      now: new Date("2026-03-03T00:00:00.000Z"),
    });
    assert.equal(again.checks.unfinished, true);
    assert.equal(getSoftReflectionForWeek("member", "2026-W11")?.checks.kind, true);
    assert.equal(getSoftReflectionForWeek("member", "2026-W11")?.checks.noticed, false);
    assert.equal(getSoftReflectionForWeek("member", "2026-W12"), null);
    assert.equal(
      db.prepare(`SELECT COUNT(*) AS n FROM soft_week_reflections WHERE user_id = ?`).get("member").n,
      2,
    );

    db.prepare(`DELETE FROM users WHERE id = 'member'`).run();
    assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM soft_week_reflections`).get().n, 0);
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

test("skip, counter, and reflection copy exists in en / zh-tw / ja", () => {
  const en = readJson("messages/en.json");
  const zh = readJson("messages/zh-tw.json");
  const ja = readJson("messages/ja.json");

  for (const messages of [en, zh, ja]) {
    assert.equal(typeof messages.Nav.skipToContent, "string");
    assert.equal(typeof messages.Home.wallCountLabel, "string");
    assert.equal(typeof messages.Home.wallCountAria, "string");
    assert.equal(typeof messages.Home.statsWallPublic, "string");
    assert.equal(typeof messages.Pricing.featureReflectionFree, "string");
    assert.equal(typeof messages.Pricing.featureReflectionPlus, "string");
    assert.equal(messages.SoftReflection.items.noticed.length > 0, true);
    assert.equal(messages.SoftReflection.items.unfinished.length > 0, true);
    assert.equal(messages.SoftReflection.items.kind.length > 0, true);
    assert.equal(typeof messages.SoftReflection.lockedBody, "string");
  }

  assert.notEqual(en.SoftReflection.title, zh.SoftReflection.title);
  assert.notEqual(en.SoftReflection.title, ja.SoftReflection.title);
  assert.notEqual(en.Home.wallCountAria, zh.Home.wallCountAria);
  assert.notEqual(en.Home.wallCountAria, ja.Home.wallCountAria);
  assert.match(zh.Home.wallCountAria, /軟軟牆/);
  assert.match(ja.Home.wallCountAria, /ソフトウォール/);
});

test("recent FAQ, wall hover, and thanks history stay wired", () => {
  assert.match(read("src/components/soft-faq.tsx"), /data-soft-faq=/);
  assert.match(read("src/components/pricing-view.tsx"), /<SoftFaq \/>/);
  assert.match(read("src/lib/wall-note-preview.ts"), /WALL_NOTE_PREVIEW_LINES/);
  assert.match(read("src/lib/soft-thanks-history.ts"), /SOFT_THANKS_HISTORY_LIMIT/);
  assert.match(read("src/components/soft-thanks-history.tsx"), /SoftThanksHistory/);
});
