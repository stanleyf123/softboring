import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

register("./alias-hook.mjs", import.meta.url);

const { toTeaserNote } = await import("../src/lib/wall-canvas.ts");
const { pickSoftWallSpotlight, toPublicSpotlightCard } = await import(
  "../src/lib/wall-spotlight.ts"
);
const { REVIEW_FIELD_SOFT_HINT_AT, reviewFieldLength, reviewFieldNeedsSoftHint } =
  await import("../src/lib/review-soft-limit.ts");
const {
  SOFT_INTENTION_HISTORY_LIMIT,
  intentionHistoryView,
  pastSoftIntentions,
} = await import("../src/lib/soft-intention-history.ts");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

test("free wall teasers keep a demo flag and drop emails", () => {
  const teaser = toTeaserNote({
    id: "note-demo",
    x: 12,
    y: 20,
    z: 1,
    color: "cream",
    praiseCount: 1,
    ownerNickname: "小桃",
    ownerIsDemo: true,
    ownerEmail: "demo01@softboring.demo",
    energy: "a secret garden",
    summary: "hidden week",
  });
  assert.equal(teaser.ownerIsDemo, true);
  assert.equal(teaser.ownerNickname, "小桃");
  assert.equal("energy" in teaser, false);
  assert.equal("summary" in teaser, false);
  assert.equal("ownerEmail" in teaser, false);
  assert.equal(JSON.stringify(teaser).includes("softboring.demo"), false);
  assert.equal(JSON.stringify(teaser).includes("secret"), false);

  const real = toTeaserNote({
    id: "note-real",
    x: 1,
    y: 2,
    z: 3,
    color: "peach",
    praiseCount: 0,
    ownerIsDemo: false,
  });
  assert.equal(real.ownerIsDemo, false);

  const board = read("src/components/wall-board.tsx");
  const guest = read("src/components/guest-wall-spotlight.tsx");
  const strip = read("src/components/wall-spotlight-strip.tsx");
  assert.match(board, /data-demo-neighbor-legend/);
  assert.match(board, /DemoNeighborBadge/);
  assert.match(board, /DemoNeighborNote/);
  assert.match(guest, /DemoNeighborBadge/);
  assert.match(strip, /DemoNeighborBadge/);
  assert.match(read("src/lib/wall-canvas.ts"), /ownerIsDemo: Boolean\(note\.ownerIsDemo\)/);
  assert.match(read("src/db/wall.ts"), /isDemoEmail/);
  assert.match(read("src/app/globals.css"), /\.soft-demo-neighbor/);
});

test("spotlight cards mark demo neighbors without an email", () => {
  const source = {
    id: "demo-note",
    summary: "午後的茶",
    energy: "walk",
    praiseCount: 2,
    pinned: true,
    feeling: 4,
    createdAt: "2026-09-01T00:00:00.000Z",
    ownerNickname: "小桃",
    ownerEmail: "demo02@softboring.demo",
  };
  const [pick] = pickSoftWallSpotlight([source]);
  assert.equal(pick.ownerIsDemo, true);
  const card = toPublicSpotlightCard({ ...pick, ownerEmail: source.ownerEmail });
  assert.equal(card.ownerIsDemo, true);
  assert.equal(Object.hasOwn(card, "ownerEmail"), false);
  assert.equal(JSON.stringify(card).includes("@"), false);
  assert.equal(JSON.stringify(card).includes("softboring.demo"), false);

  const real = pickSoftWallSpotlight([
    {
      ...source,
      id: "real-note",
      ownerEmail: "neighbor@example.com",
      ownerIsDemo: false,
    },
  ]);
  assert.equal(real[0].ownerIsDemo, false);
  assert.match(read("src/db/wall-spotlight.ts"), /owner_is_demo/);
  assert.match(read("src/app/api/wall/spotlight/guest/route.ts"), /toPublicSpotlightCard/);
});

test("a long review field hints without becoming a hard stop", () => {
  assert.equal(REVIEW_FIELD_SOFT_HINT_AT, 400);
  assert.equal(reviewFieldNeedsSoftHint("a".repeat(399)), false);
  assert.equal(reviewFieldNeedsSoftHint("a".repeat(400)), true);
  assert.equal(reviewFieldNeedsSoftHint("週".repeat(400)), true);
  assert.equal(reviewFieldLength("🌿"), 1);
  assert.equal(reviewFieldNeedsSoftHint(""), false);

  const form = read("src/components/review-form.tsx");
  const hint = read("src/components/review-soft-limit-hint.tsx");
  assert.match(form, /ReviewSoftLimitHint/);
  assert.match(form, /data-soft-limit=/);
  assert.match(form, /data-review-field=/);
  assert.doesNotMatch(form, /maxLength/);
  assert.match(hint, /data-soft-limit="hint"/);
  assert.doesNotMatch(hint, /maxLength|disabled|soft_plus_required/);
  assert.match(read("src/lib/review-input.ts"), /MAX_TEXT = 10_000/);
});

test("earlier soft intentions stay on Soft+ and skip the current week", () => {
  const rows = [
    { id: "c", weekKey: "2026-W38", body: "  this week  ", updatedAt: "2026-09-20T00:00:00.000Z" },
    { id: "b", weekKey: "2026-W37", body: "tea", updatedAt: "2026-09-13T00:00:00.000Z" },
    { id: "a", weekKey: "2026-W10", body: "walk", updatedAt: "2026-03-01T00:00:00.000Z" },
    { id: "d", weekKey: "2025-W52", body: "   ", updatedAt: "2025-12-20T00:00:00.000Z" },
    { id: "e", weekKey: "2026-W36", body: "rain", updatedAt: "2026-09-06T00:00:00.000Z" },
  ];
  const past = pastSoftIntentions(rows, "2026-W38");
  assert.deepEqual(
    past.map((item) => item.weekKey),
    ["2026-W37", "2026-W36", "2026-W10"],
  );
  assert.equal(past[0].body, "tea");
  assert.equal(past.some((item) => item.weekKey === "2026-W38"), false);

  const locked = intentionHistoryView(rows, "2026-W38", false);
  assert.equal(locked.history, null);
  assert.equal(locked.historyLocked, true);
  assert.equal(JSON.stringify(locked).includes("tea"), false);

  const open = intentionHistoryView(rows, "2026-W38", true);
  assert.equal(open.historyLocked, false);
  assert.equal(open.history.length, 3);
  assert.equal(SOFT_INTENTION_HISTORY_LIMIT, 24);
  assert.equal(pastSoftIntentions(rows, "2026-W38", 1).length, 1);

  const route = read("src/app/api/soft-intentions/route.ts");
  const history = read("src/components/soft-intention-history.tsx");
  assert.match(route, /userIsSoftPlus/);
  assert.match(route, /intentionHistoryView/);
  assert.match(route, /softPlus \? listSoftIntentionsForUser/);
  assert.match(read("src/lib/soft-intention-history.ts"), /historyLocked: true/);
  assert.match(read("src/lib/soft-intention-history.ts"), /history: null/);
  assert.match(history, /data-intention-history="tease"/);
  assert.match(history, /data-intention-history="open"/);
  assert.match(history, /data-intention-history="guest"/);
  assert.match(history, /href="\/pricing"/);
  assert.match(read("src/app/[locale]/review/page.tsx"), /SoftIntentionHistory/);
  assert.match(read("src/components/account-panel.tsx"), /SoftIntentionHistory/);
  assert.match(read("src/components/pricing-view.tsx"), /featureIntentionHistoryPlus/);
  assert.match(read("src/components/pricing-view.tsx"), /featureIntentionHistoryFree/);
  assert.doesNotMatch(route, /stripe|resend|nodemailer|sendMail/i);
  assert.doesNotMatch(history, /stripe|resend|nodemailer/i);
});

test("copy exists in en, zh-tw, and ja, and earlier quiet features stay wired", () => {
  const locales = ["messages/en.json", "messages/zh-tw.json", "messages/ja.json"].map(readJson);
  for (const messages of locales) {
    assert.equal(messages.Wall.demoNeighbor.length > 0, true);
    assert.equal(messages.Wall.demoNeighborHint.length > 0, true);
    assert.equal(messages.Wall.demoNeighborLegend.length > 0, true);
    assert.equal(messages.Review.softLimitHint.length > 0, true);
    assert.equal(messages.SoftIntention.historyTitle.length > 0, true);
    assert.equal(messages.SoftIntention.historyTeaseBody.length > 0, true);
    assert.equal(messages.SoftIntention.historyPrivacy.length > 0, true);
    assert.equal(messages.Pricing.featureDemoNeighbor.length > 0, true);
    assert.equal(messages.Pricing.featureSoftLimit.length > 0, true);
    assert.equal(messages.Pricing.featureIntentionHistoryFree.length > 0, true);
    assert.equal(messages.Pricing.featureIntentionHistoryPlus.length > 0, true);
  }
  assert.match(locales[0].Review.softLimitHint, /still save/i);
  assert.match(locales[1].Review.softLimitHint, /可以存/);
  assert.match(locales[2].Review.softLimitHint, /保存できます/);
  assert.match(locales[1].Wall.demoNeighbor, /示範/);
  assert.equal(locales[0].Wall.demoNeighbor, "Demo neighbor");

  assert.match(read("src/lib/security-headers.ts"), /Content-Security-Policy/);
  assert.match(read("next.config.ts"), /softSecurityHeaders/);
  assert.match(read("src/lib/soft-escape.ts"), /wallEscapeAction/);
  assert.match(read("src/lib/reflection-export.ts"), /softPlus/);
  assert.match(read("src/i18n/routing.ts"), /"en", "zh-tw", "ja"/);
  assert.doesNotMatch(read("src/components/soft-intention-history.tsx"), /zh-TW/);
});
