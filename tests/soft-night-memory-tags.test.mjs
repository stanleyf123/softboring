import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { register } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import Database from "better-sqlite3";

register("./alias-hook.mjs", import.meta.url);

const { withHistoryAccess } = await import("../src/lib/history-access.ts");
const { pickMemoryLane, sameDayLastMonth } = await import("../src/lib/memory-lane.ts");
const { nightSource, readNightCookie } = await import("../src/lib/night-mode.ts");
const { ensureReviewUserId, ensureUserSettingsColumns, migrateDb } = await import(
  "../src/db/migrate.ts"
);
const {
  SOFT_TAG_LIMIT,
  normalizeSoftTags,
  reviewHasSoftTag,
  uniqueSoftTags,
  visibleSoftTags,
} = await import("../src/lib/soft-tags.ts");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

const now = new Date("2026-09-22T04:00:00.000Z");

test("soft night follows the account, then an explicit cookie", () => {
  assert.equal(readNightCookie("1"), true);
  assert.equal(readNightCookie("0"), false);
  assert.equal(readNightCookie(undefined), false);
  assert.equal(nightSource({ signedIn: true, cookieValue: "0" }), "account");
  assert.equal(nightSource({ signedIn: false, cookieValue: "0" }), "cookie");
  assert.equal(nightSource({ signedIn: false, cookieValue: "1" }), "cookie");
  assert.equal(nightSource({ signedIn: false, cookieValue: undefined }), "local");
});

test("this day last month clamps short months and prefers a wall note", () => {
  assert.deepEqual(sameDayLastMonth(now, "Asia/Taipei"), {
    year: 2026,
    month: 8,
    day: 22,
  });
  assert.deepEqual(sameDayLastMonth(new Date("2026-03-31T04:00:00.000Z"), "Asia/Taipei"), {
    year: 2026,
    month: 2,
    day: 28,
  });
  assert.deepEqual(sameDayLastMonth(new Date("2024-03-31T04:00:00.000Z"), "Asia/Taipei"), {
    year: 2024,
    month: 2,
    day: 29,
  });
  assert.deepEqual(sameDayLastMonth(new Date("2026-01-15T04:00:00.000Z"), "Asia/Taipei"), {
    year: 2025,
    month: 12,
    day: 15,
  });

  assert.equal(
    pickMemoryLane({
      enabled: false,
      reviewsNewestFirst: [],
      notes: [],
      softPlus: true,
      timeZone: "Asia/Taipei",
      now,
    }),
    null,
  );

  const reviews = [
    { id: "new", createdAt: "2026-09-22T02:00:00.000Z", summary: "today", energy: "" },
    {
      id: "then",
      createdAt: "2026-08-21T16:30:00.000Z",
      summary: "peach tea on the desk",
      energy: "",
    },
  ];
  const reviewLane = pickMemoryLane({
    enabled: true,
    reviewsNewestFirst: reviews,
    notes: [],
    softPlus: false,
    timeZone: "Asia/Taipei",
    now,
  });
  assert.equal(reviewLane.source, "review");
  assert.equal(reviewLane.locked, false);
  assert.match(reviewLane.excerpt, /peach tea/);

  const wallLane = pickMemoryLane({
    enabled: true,
    reviewsNewestFirst: reviews,
    notes: [
      {
        id: "note-new",
        reviewId: "then",
        createdAt: "2026-09-01T02:00:00.000Z",
        summary: "not this day",
        energy: "",
        hidden: false,
      },
      {
        id: "note-then",
        reviewId: "then",
        createdAt: "2026-08-22T02:00:00.000Z",
        summary: "a pinned afternoon",
        energy: "",
        hidden: false,
      },
    ],
    softPlus: false,
    timeZone: "Asia/Taipei",
    now,
  });
  assert.equal(wallLane.source, "wall");
  assert.equal(wallLane.noteId, "note-then");
  assert.equal(wallLane.locked, false);
  assert.match(wallLane.excerpt, /pinned afternoon/);

  const older = [
    { id: "a", createdAt: "2026-09-20T02:00:00.000Z", summary: "a", energy: "" },
    { id: "b", createdAt: "2026-09-13T02:00:00.000Z", summary: "b", energy: "" },
    { id: "c", createdAt: "2026-09-06T02:00:00.000Z", summary: "c", energy: "" },
    { id: "d", createdAt: "2026-08-30T02:00:00.000Z", summary: "d", energy: "" },
    {
      id: "then",
      createdAt: "2026-08-21T16:30:00.000Z",
      summary: "secret older week",
      energy: "",
    },
  ];
  const locked = pickMemoryLane({
    enabled: true,
    reviewsNewestFirst: older,
    notes: [],
    softPlus: false,
    timeZone: "Asia/Taipei",
    now,
  });
  assert.equal(locked.locked, true);
  assert.equal(locked.excerpt, "");

  const publicNote = pickMemoryLane({
    enabled: true,
    reviewsNewestFirst: older,
    notes: [
      {
        id: "public",
        reviewId: "then",
        createdAt: "2026-08-22T02:00:00.000Z",
        summary: "already on the wall",
        energy: "",
        hidden: false,
      },
    ],
    softPlus: false,
    timeZone: "Asia/Taipei",
    now,
  });
  assert.equal(publicNote.locked, false);
  assert.match(publicNote.excerpt, /already on the wall/);

  const hiddenNote = pickMemoryLane({
    enabled: true,
    reviewsNewestFirst: older,
    notes: [
      {
        id: "hidden",
        reviewId: "then",
        createdAt: "2026-08-22T02:00:00.000Z",
        summary: "kept off the wall",
        energy: "",
        hidden: true,
      },
    ],
    softPlus: false,
    timeZone: "Asia/Taipei",
    now,
  });
  assert.equal(hiddenNote.locked, true);
  assert.equal(hiddenNote.excerpt, "");
});

test("private soft tags stay within five and stay off free desks", () => {
  assert.equal(SOFT_TAG_LIMIT, 5);
  assert.deepEqual(normalizeSoftTags(["  Peach tea ", "peach tea", "雨"]), {
    ok: true,
    tags: ["Peach tea", "雨"],
  });
  assert.equal(normalizeSoftTags(["ok", "two", "three", "four", "five", "six"]).error, "too_many");
  assert.equal(normalizeSoftTags(["this tag is much too long"]).error, "too_long");
  assert.equal(normalizeSoftTags(["  "]).error, "invalid");
  assert.equal(normalizeSoftTags(["no,commas"]).error, "invalid");
  assert.equal(normalizeSoftTags("peach").error, "invalid");

  assert.deepEqual(visibleSoftTags(["rain"], false, false), []);
  assert.deepEqual(visibleSoftTags(["rain"], true, true), []);
  assert.deepEqual(visibleSoftTags(["rain"], true, false), ["rain"]);
  assert.equal(reviewHasSoftTag(["Rain"], "rain"), true);
  assert.deepEqual(
    uniqueSoftTags([
      { locked: true, softTags: ["secret"] },
      { locked: false, softTags: ["Rain", "rain", "tea"] },
    ]),
    ["Rain", "tea"],
  );

  const reviews = [
    { id: "1", createdAt: "2026-09-01", summary: "open", energy: "", drain: "", lessOf: "", priorities: "", feeling: null, customAnswers: [], softTags: ["open-tag"] },
    { id: "2", createdAt: "2026-08-01", summary: "2", energy: "", drain: "", lessOf: "", priorities: "", feeling: null, customAnswers: [], softTags: ["two"] },
    { id: "3", createdAt: "2026-07-01", summary: "3", energy: "", drain: "", lessOf: "", priorities: "", feeling: null, customAnswers: [], softTags: ["three"] },
    { id: "4", createdAt: "2026-06-01", summary: "4", energy: "", drain: "", lessOf: "", priorities: "", feeling: null, customAnswers: [], softTags: ["four"] },
    { id: "5", createdAt: "2026-05-01", summary: "hidden-week", energy: "secret", drain: "", lessOf: "", priorities: "", feeling: null, customAnswers: [], softTags: ["secret-tag"] },
  ];
  const free = withHistoryAccess(reviews, false);
  assert.deepEqual(free[0].softTags, ["open-tag"]);
  assert.equal(free[4].locked, true);
  assert.equal(free[4].summary, "");
  assert.deepEqual(free[4].softTags, []);
  assert.equal(JSON.stringify(free[4]).includes("secret-tag"), false);
  assert.equal(JSON.stringify(free[4]).includes("hidden-week"), false);
});

test("night, memory lane, and soft tags migrate without mail or payments", () => {
  const schema = read("scripts/schema.sql");
  const migrate = read("src/db/migrate.ts");
  const cli = read("scripts/migrate.mjs");
  assert.match(schema, /night_mode INTEGER NOT NULL DEFAULT 0/);
  assert.match(schema, /memory_lane INTEGER NOT NULL DEFAULT 1/);
  assert.match(schema, /soft_tags TEXT NOT NULL DEFAULT '\[\]'/);
  assert.match(migrate, /night_mode/);
  assert.match(migrate, /memory_lane/);
  assert.match(cli, /soft_tags/);

  const memory = new Database(":memory:");
  memory.exec(`CREATE TABLE user_settings (user_id TEXT PRIMARY KEY)`);
  memory.exec(
    `CREATE TABLE reviews (id TEXT PRIMARY KEY, guest_id TEXT NOT NULL, created_at TEXT NOT NULL)`,
  );
  ensureUserSettingsColumns(memory);
  ensureReviewUserId(memory);
  const settings = memory.prepare(`PRAGMA table_info(user_settings)`).all().map((col) => col.name);
  const reviews = memory.prepare(`PRAGMA table_info(reviews)`).all().map((col) => col.name);
  assert.ok(settings.includes("night_mode"));
  assert.ok(settings.includes("memory_lane"));
  assert.ok(reviews.includes("soft_tags"));
  memory.close();

  const dir = mkdtempSync(join(tmpdir(), "softboring-night-"));
  const db = new Database(join(dir, "test.sqlite"));
  migrateDb(db);
  const fresh = db.prepare(`PRAGMA table_info(user_settings)`).all().map((col) => col.name);
  assert.ok(fresh.includes("night_mode"));
  assert.ok(fresh.includes("memory_lane"));
  assert.ok(db.prepare(`PRAGMA table_info(reviews)`).all().some((col) => col.name === "soft_tags"));
  db.close();
  rmSync(dir, { recursive: true, force: true });

  const tagsRoute = read("src/app/api/reviews/[id]/tags/route.ts");
  const settingsRoute = read("src/app/api/account/settings/route.ts");
  const home = read("src/app/[locale]/page.tsx");
  const layout = read("src/app/[locale]/layout.tsx");
  const account = read("src/components/account-panel.tsx");
  const history = read("src/components/history-list.tsx");
  assert.match(tagsRoute, /soft_plus_required|requireSoftPlus/);
  assert.match(tagsRoute, /normalizeSoftTags/);
  assert.doesNotMatch(tagsRoute, /stripe|nodemailer|resend/i);
  assert.match(settingsRoute, /nightMode/);
  assert.match(settingsRoute, /memoryLane/);
  assert.match(settingsRoute, /NIGHT_COOKIE/);
  assert.doesNotMatch(settingsRoute, /stripe|nodemailer|resend/i);
  assert.match(home, /pickMemoryLane/);
  assert.match(home, /MemoryLaneCard/);
  assert.match(layout, /data-night/);
  assert.match(layout, /NightModeSync/);
  assert.match(account, /nightTitle/);
  assert.match(account, /memoryLaneTitle/);
  assert.match(history, /SoftTagFilter/);
  assert.match(read("src/i18n/routing.ts"), /locales: \["en", "zh-tw", "ja"\]/);

  assert.equal(readJson("messages/zh-tw.json").MemoryLane.title, "上個月的今天");
  assert.equal(readJson("messages/ja.json").Account.nightTitle, "やわらかい夜");
  assert.equal(readJson("messages/en.json").History.tagsTeaseTitle, "Soft tags wait on Soft+");
  for (const locale of ["messages/en.json", "messages/zh-tw.json", "messages/ja.json"]) {
    const messages = readJson(locale);
    for (const key of ["title", "lead", "wallKicker", "openWall", "teaser"]) {
      assert.equal(typeof messages.MemoryLane[key], "string");
    }
    for (const key of ["nightTitle", "nightToggle", "memoryLaneTitle", "memoryLaneToggle"]) {
      assert.equal(typeof messages.Account[key], "string");
    }
    assert.equal(typeof messages.History.tagsNoMatchBody, "string");
    assert.equal(typeof messages.HistoryDetail.tagsAdd, "string");
  }
});
