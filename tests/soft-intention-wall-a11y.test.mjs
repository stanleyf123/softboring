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

function inventoryTotal(inventory) {
  return Object.values(inventory).reduce((sum, qty) => sum + Math.max(0, qty), 0);
}

function previousIsoWeekKey(key) {
  const match = /^(\d{4})-W(\d{2})$/.exec(key);
  if (!match) return key;
  const year = Number(match[1]);
  const week = Number(match[2]);
  if (week > 1) return `${year}-W${String(week - 1).padStart(2, "0")}`;
  return `${year - 1}-W52`;
}

test("soft intention is signed-in, one sentence, and surfaces last on review", () => {
  const schema = read("scripts/schema.sql");
  const migrate = read("src/db/migrate.ts");
  const db = read("src/db/soft-intentions.ts");
  const api = read("src/app/api/soft-intentions/route.ts");
  const card = read("src/components/soft-intention-card.tsx");
  const review = read("src/app/[locale]/review/page.tsx");
  const account = read("src/components/account-panel.tsx");

  assert.match(schema, /CREATE TABLE IF NOT EXISTS soft_intentions/);
  assert.match(schema, /UNIQUE \(user_id, week_key\)/);
  assert.match(migrate, /ensureSoftIntentions/);
  assert.match(db, /SOFT_INTENTION_MAX/);
  assert.match(db, /getLastSoftIntention/);
  assert.match(db, /saveCurrentSoftIntention/);
  assert.match(api, /getCurrentUser/);
  assert.match(api, /auth_required/);
  assert.match(api, /PUT/);
  assert.match(card, /LastIntentionNudge/);
  assert.match(card, /\/api\/soft-intentions/);
  assert.doesNotMatch(card, /todo|checklist|ShareToWall/i);
  assert.match(review, /SoftIntentionCard/);
  assert.match(review, /LastIntentionNudge/);
  assert.match(account, /SoftIntentionCard/);
});

test("previous ISO week helper walks back across year boundary", () => {
  assert.equal(previousIsoWeekKey("2026-W02"), "2026-W01");
  assert.equal(previousIsoWeekKey("2026-W01"), "2025-W52");
});

test("sticker inventory empty states and monthly placement are wired", () => {
  const stickersDb = read("src/db/stickers.ts");
  const api = read("src/app/api/wall/stickers/route.ts");
  const board = read("src/components/wall-board.tsx");

  assert.match(stickersDb, /countPlacedStickersThisMonth/);
  assert.match(stickersDb, /inventoryTotal/);
  assert.match(api, /placedThisMonth/);
  assert.match(api, /inventoryCount/);
  assert.match(board, /inventoryEmptyTitle/);
  assert.match(board, /inventoryEmptyPlace/);
  assert.match(board, /placedThisMonth/);
  assert.equal(inventoryTotal({ a: 2, b: 0, c: 3 }), 5);
  assert.equal(inventoryTotal({}), 0);
});

test("Soft Wall dialogs support Escape and filter/spotlight aria", () => {
  const board = read("src/components/wall-board.tsx");
  const spotlight = read("src/components/wall-spotlight-strip.tsx");

  assert.match(board, /Escape/);
  assert.match(board, /closeNoteDetail/);
  assert.match(board, /aria-labelledby="wall-filter-title"/);
  assert.match(board, /role="search"/);
  assert.match(board, /focus-visible:outline/);
  assert.match(board, /noteCloseRef/);
  assert.match(spotlight, /aria-labelledby="wall-spotlight-title"/);
  assert.match(spotlight, /listAria/);
});

test("soft intention / inventory / a11y copy exists in en / zh-tw / ja", () => {
  const en = readJson("messages/en.json");
  const zh = readJson("messages/zh-tw.json");
  const ja = readJson("messages/ja.json");

  for (const messages of [en, zh, ja]) {
    assert.equal(typeof messages.SoftIntention.title, "string");
    assert.equal(typeof messages.SoftIntention.lastLead, "string");
    assert.equal(typeof messages.Wall.placedThisMonth, "string");
    assert.equal(typeof messages.Wall.inventoryEmptyTitle, "string");
    assert.equal(typeof messages.Wall.inventoryEmptyPlace, "string");
    assert.equal(typeof messages.WallSpotlight.listAria, "string");
  }

  assert.notEqual(en.SoftIntention.title, zh.SoftIntention.title);
  assert.notEqual(en.SoftIntention.title, ja.SoftIntention.title);
  assert.notEqual(en.Wall.inventoryEmptyTitle, zh.Wall.inventoryEmptyTitle);
});

test("prior Soft+ postcard / spotlight / compare surfaces stay wired", () => {
  assert.match(read("src/lib/soft-postcard.ts"), /drawSoftPostcard/);
  assert.match(read("src/components/wall-spotlight-strip.tsx"), /WallSpotlight/);
  assert.match(read("src/app/[locale]/history/compare/page.tsx"), /HistoryCompare/);
});
