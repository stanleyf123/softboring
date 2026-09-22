import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

const WALL_COLORS = ["peach", "blush", "mint", "cream", "lemon", "sky"];

function isWallColor(value) {
  return WALL_COLORS.includes(value);
}

function resolveShareColor(requested, preferred, index) {
  if (requested && isWallColor(requested)) return requested;
  if (preferred && isWallColor(preferred)) return preferred;
  return WALL_COLORS[((index % WALL_COLORS.length) + WALL_COLORS.length) % WALL_COLORS.length];
}

test("soft week print wires Soft+ history detail and print CSS", () => {
  const button = read("src/components/soft-postcard-button.tsx");
  const print = read("src/components/soft-week-print.tsx");
  const detail = read("src/components/history-detail.tsx");
  const css = read("src/app/globals.css");
  const en = readJson("messages/en.json");
  const zh = readJson("messages/zh-tw.json");
  const ja = readJson("messages/ja.json");

  assert.match(button, /printWeek/);
  assert.match(button, /window\.print/);
  assert.match(button, /SoftWeekPrintPostcard/);
  assert.match(print, /soft-week-print/);
  assert.match(print, /kindWeek/);
  assert.match(detail, /print:hidden/);
  assert.match(detail, /SoftPostcardFromReview/);
  assert.match(css, /\.soft-week-print/);
  assert.match(css, /print-color-adjust:\s*exact/);
  assert.equal(en.Postcard.printWeek, "Print this week");
  assert.ok(en.Postcard.printWeekHint);
  assert.ok(zh.Postcard.printWeek);
  assert.ok(ja.Postcard.printWeek);
  assert.doesNotMatch(button, /stripe|RESEND|SMTP/i);
});

test("preferred wall color resolves Soft+ preference then palette", () => {
  assert.equal(resolveShareColor("mint", "peach", 0), "mint");
  assert.equal(resolveShareColor(null, "sky", 2), "sky");
  assert.equal(resolveShareColor("nope", null, 0), "peach");
  assert.equal(resolveShareColor(null, null, 1), "blush");

  const schema = read("scripts/schema.sql");
  const migrate = read("src/db/migrate.ts");
  const settings = read("src/db/user-settings.ts");
  const wall = read("src/db/wall.ts");
  const api = read("src/app/api/wall/notes/route.ts");
  const settingsApi = read("src/app/api/account/settings/route.ts");
  const share = read("src/components/share-to-wall.tsx");
  const en = readJson("messages/en.json");

  assert.match(schema, /preferred_wall_color/);
  assert.match(migrate, /preferred_wall_color/);
  assert.match(settings, /preferredWallColor/);
  assert.match(wall, /input\.color/);
  assert.match(api, /preferredWallColor/);
  assert.match(api, /requestedColor/);
  assert.match(settingsApi, /preferredWallColor/);
  assert.match(share, /colorPreferTitle/);
  assert.match(share, /WALL_COLORS/);
  assert.match(share, /preferredWallColor/);
  assert.ok(en.Wall.colorPreferTitle);
  assert.ok(en.Wall.color_mint);
  assert.equal(readJson("messages/zh-tw.json").Wall.color_sky.length > 0, true);
  assert.equal(readJson("messages/ja.json").Wall.colorPreferHint.length > 0, true);
});

test("onboarding checklist is home/account only with soft first steps", () => {
  const card = read("src/components/onboarding-card.tsx");
  const layout = read("src/app/[locale]/layout.tsx");
  const en = readJson("messages/en.json");
  const zh = readJson("messages/zh-tw.json");
  const ja = readJson("messages/ja.json");

  assert.match(card, /VISIBLE_PATHS/);
  assert.match(card, /"\/"/);
  assert.match(card, /"\/account"/);
  assert.match(card, /nicknameTitle/);
  assert.match(card, /inviteTitle/);
  assert.match(card, /softPlus/);
  assert.match(card, /hasNickname/);
  assert.match(card, /hasInvite/);
  assert.match(card, /items\.every/);
  assert.match(layout, /getInviteCodeForUser/);
  assert.match(layout, /hasNickname/);
  assert.match(layout, /hasInvite/);
  assert.ok(en.Onboarding.nicknameTitle);
  assert.ok(en.Onboarding.inviteTitle);
  assert.ok(en.Onboarding.done);
  assert.ok(zh.Onboarding.nicknameCta);
  assert.ok(ja.Onboarding.inviteBody);
  assert.doesNotMatch(card, /stripe|RESEND|SMTP/i);
});

test("bookmarks intentions year compare stay wired after this round", () => {
  assert.match(read("src/db/wall-bookmarks.ts"), /listBookmarkedWallNotes/);
  assert.match(read("src/db/soft-intentions.ts"), /soft_intentions/);
  assert.match(read("src/lib/soft-year.ts"), /softYearFromReviews/);
  assert.match(read("src/lib/history-compare.ts"), /feelingDelta/);
  assert.match(read("src/lib/history-compare.ts"), /canComparePair/);
  assert.match(read("src/components/soft-postcard-button.tsx"), /exportWeek/);
  assert.match(read("src/components/soft-postcard-button.tsx"), /printWeek/);
});
