import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

register("./alias-hook.mjs", import.meta.url);

const { collectionsExportPayload, sortExportBookmarks } = await import(
  "../src/lib/collections-export.ts"
);
const { isoWeekKeyInTimeZone } = await import("../src/lib/plus-insights.ts");
const { softShortcutAction, softShortcutSurface } = await import("../src/lib/soft-shortcuts.ts");
const { moodForCurrentWeek, softWeekWeather } = await import("../src/lib/soft-weather.ts");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

test("soft keys stay off the page while typing, and Q or slash stay on their own desk", () => {
  assert.equal(softShortcutSurface("/review"), "review");
  assert.equal(softShortcutSurface("/review/"), "review");
  assert.equal(softShortcutSurface("/wall/saved"), "wall");
  assert.equal(softShortcutSurface("/history"), "other");

  const base = {
    shiftKey: false,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    repeat: false,
    typing: false,
    helpOpen: false,
  };

  assert.equal(
    softShortcutAction({ ...base, key: "?", surface: "review" }),
    "toggle-help",
  );
  assert.equal(
    softShortcutAction({ ...base, key: "/", shiftKey: true, surface: "wall" }),
    "toggle-help",
  );
  assert.equal(
    softShortcutAction({ ...base, key: "Escape", surface: "wall", helpOpen: true }),
    "close-help",
  );
  assert.equal(
    softShortcutAction({ ...base, key: "q", surface: "review" }),
    "quiet-writing",
  );
  assert.equal(softShortcutAction({ ...base, key: "q", surface: "wall" }), null);
  assert.equal(
    softShortcutAction({ ...base, key: "q", surface: "review", typing: true }),
    null,
  );
  assert.equal(
    softShortcutAction({ ...base, key: "q", surface: "review", helpOpen: true }),
    null,
  );
  assert.equal(
    softShortcutAction({ ...base, key: "/", surface: "wall" }),
    "wall-search",
  );
  assert.equal(softShortcutAction({ ...base, key: "/", surface: "review" }), null);
  assert.equal(
    softShortcutAction({ ...base, key: "/", surface: "wall", metaKey: true }),
    null,
  );
  assert.equal(
    softShortcutAction({ ...base, key: "?", surface: "other" }),
    null,
  );
});

test("this week's soft sky follows mood or a pause, and guests keep one still sky", () => {
  assert.equal(softWeekWeather({ signedIn: false, paused: false, mood: null }), "sky");
  assert.equal(softWeekWeather({ signedIn: false, paused: true, mood: "peach" }), "sky");
  assert.equal(softWeekWeather({ signedIn: true, paused: true, mood: "peach" }), "rest");
  assert.equal(softWeekWeather({ signedIn: true, paused: false, mood: null }), "open");
  assert.equal(softWeekWeather({ signedIn: true, paused: false, mood: "peach" }), "sun");
  assert.equal(softWeekWeather({ signedIn: true, paused: false, mood: "mint" }), "breeze");
  assert.equal(softWeekWeather({ signedIn: true, paused: false, mood: "blush" }), "blush");
  assert.equal(softWeekWeather({ signedIn: true, paused: false, mood: "cream" }), "cream");
  assert.equal(softWeekWeather({ signedIn: true, paused: false, mood: "lavender" }), "mist");

  const timeZone = "UTC";
  const now = new Date("2026-09-22T12:00:00.000Z");
  const weekKey = isoWeekKeyInTimeZone(now, timeZone);
  const mood = moodForCurrentWeek({
    weekKey,
    timeZone,
    reviews: [
      { createdAt: "2026-09-22T15:00:00.000Z", mood: null },
      { createdAt: "2026-09-21T15:00:00.000Z", mood: "mint" },
      { createdAt: "2026-08-01T15:00:00.000Z", mood: "blush" },
      { createdAt: "not-a-date", mood: "peach" },
    ],
  });
  assert.equal(mood, "mint");
  assert.equal(moodForCurrentWeek({ weekKey: "nope", timeZone, reviews: [] }), null);
  assert.equal(
    softWeekWeather({ signedIn: true, paused: false, mood }),
    "breeze",
  );
});

test("collections JSON keeps names and bookmark ids, and leaves note text at home", () => {
  const unsorted = [
    { noteId: "b", bookmarkedAt: "2026-09-02T00:00:00.000Z" },
    { noteId: "a", bookmarkedAt: "2026-09-01T00:00:00.000Z" },
    { noteId: "c", bookmarkedAt: "2026-09-01T00:00:00.000Z" },
  ];
  assert.deepEqual(
    sortExportBookmarks(unsorted).map((item) => item.noteId),
    ["a", "c", "b"],
  );

  const payload = collectionsExportPayload({
    exportedAt: "2026-09-22T12:00:00.000Z",
    bookmarks: unsorted,
    collections: [
      {
        id: "col-1",
        name: "Quiet tea",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-03T00:00:00.000Z",
        noteIds: ["a"],
      },
    ],
  });

  assert.equal(payload.kind, "softboring-collections");
  assert.equal(payload.plan, "soft_plus");
  assert.deepEqual(payload.bookmarkedNoteIds, ["a", "c", "b"]);
  assert.equal(payload.bookmarkCount, 3);
  assert.equal(payload.collectionCount, 1);
  assert.equal(payload.collections[0].name, "Quiet tea");
  assert.deepEqual(payload.collections[0].noteIds, ["a"]);
  const serialized = JSON.stringify(payload);
  assert.doesNotMatch(serialized, /email|energy|summary|excerpt/i);
  assert.doesNotMatch(serialized, /sendMail|stripe|smtp/i);
});

test("help sheet, homepage sky, and Soft+ export stay wired without mail or payments", () => {
  const help = read("src/components/soft-shortcuts-help.tsx");
  const weather = read("src/components/soft-week-weather.tsx");
  const home = read("src/app/[locale]/page.tsx");
  const pause = read("src/components/soft-pause-card.tsx");
  const board = read("src/components/wall-board.tsx");
  const panel = read("src/components/wall-collections-panel.tsx");
  const saved = read("src/components/wall-saved-panel.tsx");
  const savedPage = read("src/app/[locale]/wall/saved/page.tsx");
  const route = read("src/app/api/wall/collections/export/route.ts");
  const pricing = read("src/components/pricing-view.tsx");
  const css = read("src/app/globals.css");

  assert.match(help, /data-shortcuts-sheet/);
  assert.match(help, /data-shortcut-group="review"/);
  assert.match(help, /data-shortcut-group="wall"/);
  assert.match(help, /writeQuietWriting/);
  assert.match(help, /data-wall-search/);
  assert.match(help, /prefers-reduced-motion|soft-shortcuts-sheet/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /soft-weather-drift/);
  assert.match(board, /data-wall-search/);

  assert.match(home, /SoftWeekWeather/);
  assert.match(home, /moodForCurrentWeek/);
  assert.match(weather, /softWeekWeather/);
  assert.match(weather, /data-soft-weather/);
  assert.match(weather, /WEEK_PAUSE_CHANGED_EVENT/);
  assert.match(pause, /WEEK_PAUSE_CHANGED_EVENT/);
  assert.doesNotMatch(weather, /open-meteo|weatherapi|api\.openweathermap|forecast/i);
  assert.doesNotMatch(weather, /sendMail|resend|stripe/i);

  assert.match(route, /requireSoftPlus/);
  assert.match(route, /listBookmarksForExport/);
  assert.match(route, /COLLECTIONS_EXPORT_FILENAME/);
  assert.match(read("src/lib/collections-export.ts"), /soft-boring-collections\.json/);
  assert.match(panel, /data-collections-export="tease"/);
  assert.match(panel, /data-collections-export="download"/);
  assert.match(panel, /\/api\/wall\/collections\/export/);
  assert.match(panel, /\/pricing/);
  assert.match(saved, /WallCollectionsTease/);
  assert.match(saved, /WallCollectionsPanel/);
  assert.match(savedPage, /userIsSoftPlus/);
  assert.match(pricing, /featureCollectionExportFree/);
  assert.match(pricing, /featureCollectionExportPlus/);

  const fresh = [help, weather, route, panel, read("src/lib/collections-export.ts")].join("\n");
  assert.doesNotMatch(fresh, /sendMail|resend|nodemailer|SMTP/i);
  assert.doesNotMatch(fresh, /zh-TW/);
});

test("shortcut, weather, and collection export copy exists in en / zh-tw / ja", () => {
  const shortcutKeys = [
    "title",
    "lead",
    "groupShared",
    "groupReview",
    "groupWall",
    "here",
    "toggleHelp",
    "escape",
    "quiet",
    "search",
    "filters",
    "close",
  ];
  const weatherKeys = [
    "decorative",
    "guestEyebrow",
    "title_sky",
    "body_sky",
    "title_open",
    "title_rest",
    "title_sun",
    "title_breeze",
    "title_blush",
    "title_cream",
    "title_mist",
    "body_mist",
  ];
  const exportKeys = ["exportBody", "exportCta", "exportTeaseBody"];
  const locales = ["en", "zh-tw", "ja"].map((locale) => readJson(`messages/${locale}.json`));

  for (const messages of locales) {
    for (const name of shortcutKeys) {
      assert.equal(typeof messages.Shortcuts[name], "string");
      assert.ok(messages.Shortcuts[name].length > 0);
    }
    for (const name of weatherKeys) {
      assert.equal(typeof messages.SoftWeather[name], "string");
      assert.ok(messages.SoftWeather[name].length > 0);
    }
    for (const name of exportKeys) {
      assert.equal(typeof messages.WallCollections[name], "string");
      assert.ok(messages.WallCollections[name].length > 0);
    }
    assert.equal(typeof messages.Pricing.featureCollectionExportFree, "string");
    assert.equal(typeof messages.Pricing.featureCollectionExportPlus, "string");
  }

  const [en, zh, ja] = locales;
  assert.notEqual(en.SoftWeather.title_sky, zh.SoftWeather.title_sky);
  assert.notEqual(en.SoftWeather.title_sky, ja.SoftWeather.title_sky);
  assert.match(en.SoftWeather.decorative, /forecast/i);
  assert.match(zh.SoftWeather.decorative, /預報/);
  assert.match(ja.SoftWeather.decorative, /予報/);
  assert.match(en.WallCollections.exportBody, /No emails/i);
  assert.match(zh.WallCollections.exportBody, /不寄信/);
  assert.match(ja.WallCollections.exportBody, /メールは送らず/);
});
