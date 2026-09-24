import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

register("./alias-hook.mjs", import.meta.url);

const { timezoneChangePending } = await import("../src/lib/timezone-confirm.ts");
const {
  INTENTION_EXPORT_FILENAME,
  INTENTION_EXPORT_KIND,
  intentionExportBody,
  intentionExportPayload,
} = await import("../src/lib/soft-intention-export.ts");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

test("Soft Wall first paint is a cream skeleton, not an empty board", () => {
  const skeleton = read("src/components/empty-state.tsx");
  const board = read("src/components/wall-board.tsx");
  const css = read("src/app/globals.css");

  assert.match(skeleton, /data-wall-skeleton="cream"/);
  assert.match(skeleton, /data-wall-skeleton-card/);
  assert.match(skeleton, /bg-cream/);
  assert.match(skeleton, /aria-busy="true"/);
  assert.doesNotMatch(skeleton, /absolute left-/);
  assert.match(board, /data-wall-loading="skeleton"/);
  assert.match(board, /<WallSkeleton label=\{t\("loading"\)\} \/>/);
  assert.match(css, /@keyframes soft-wall-skeleton/);
  assert.match(css, /\.soft-wall-skeleton__bar/);
  assert.match(css, /\.soft-wall-skeleton__card/);
  const motion = css.slice(css.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(motion, /\.soft-wall-skeleton__bar/);
  assert.match(motion, /animation: none !important/);
});

test("a timezone change stays pending until the member confirms", () => {
  assert.equal(timezoneChangePending("Asia/Taipei", "Asia/Taipei"), false);
  assert.equal(timezoneChangePending("Asia/Taipei", " Asia/Taipei "), false);
  assert.equal(timezoneChangePending("Asia/Taipei", "UTC"), true);
  assert.equal(timezoneChangePending("UTC", "  "), false);
  assert.equal(timezoneChangePending("Europe/London", "Asia/Tokyo"), true);

  const panel = read("src/components/account-panel.tsx");
  const selectAt = panel.indexOf('data-timezone-select=""');
  const confirmAt = panel.indexOf('data-timezone-confirm="pending"');
  assert.ok(selectAt > 0);
  assert.ok(confirmAt > selectAt);
  const choosing = panel.slice(selectAt, confirmAt);
  assert.doesNotMatch(choosing, /fetch\(/);
  assert.match(choosing, /timezoneChangePending\(savedZone, zone\)/);
  assert.match(panel, /timezoneChangeConfirm/);
  assert.match(panel, /timezoneChangeHint/);
  assert.match(panel, /timezoneChangeKeep/);
  assert.match(panel.slice(confirmAt), /JSON\.stringify\(\{ timezone: zone \}\)/);
  assert.match(panel.slice(confirmAt), /setSavedZone\(zone\)/);
  assert.match(panel, /setZone\(savedZone\)/);
  assert.doesNotMatch(read("src/lib/timezone-confirm.ts"), /stripe|resend|nodemailer|sendMail/i);
});

test("Soft+ intention JSON is earlier weeks only and stays gated", () => {
  const rows = [
    {
      id: "now",
      weekKey: "2026-W38",
      body: "this week stays on the card",
      updatedAt: "2026-09-20T00:00:00.000Z",
      email: "quiet@example.com",
    },
    {
      id: "tea",
      weekKey: "2026-W37",
      body: "  a cup of tea  ",
      updatedAt: "2026-09-13T00:00:00.000Z",
      userId: "secret-user",
    },
    {
      id: "blank",
      weekKey: "2026-W36",
      body: "   ",
      updatedAt: "2026-09-06T00:00:00.000Z",
    },
    {
      id: "walk",
      weekKey: "2026-W10",
      body: "a slow walk",
      updatedAt: "2026-03-01T00:00:00.000Z",
    },
  ];

  const payload = intentionExportPayload(rows, "2026-W38", "2026-09-23T00:00:00.000Z");
  assert.equal(payload.kind, INTENTION_EXPORT_KIND);
  assert.equal(payload.plan, "soft_plus");
  assert.equal(payload.exportedAt, "2026-09-23T00:00:00.000Z");
  assert.equal(payload.count, 2);
  assert.deepEqual(
    payload.items.map((item) => item.weekKey),
    ["2026-W37", "2026-W10"],
  );
  assert.equal(payload.items[0].body, "a cup of tea");
  assert.deepEqual(Object.keys(payload.items[0]).sort(), ["body", "id", "updatedAt", "weekKey"]);
  const serialized = JSON.stringify(payload);
  assert.equal(serialized.includes("secret-user"), false);
  assert.equal(serialized.includes("quiet@example.com"), false);
  assert.equal(serialized.includes("this week stays"), false);

  const body = intentionExportBody(rows, "2026-W38", "2026-09-23T00:00:00.000Z");
  assert.equal(body.endsWith("\n"), true);
  assert.equal(JSON.parse(body).count, 2);
  assert.equal(INTENTION_EXPORT_FILENAME, "soft-boring-intentions.json");

  const route = read("src/app/api/soft-intentions/export/route.ts");
  const history = read("src/components/soft-intention-history.tsx");
  assert.match(route, /requireSoftPlus/);
  assert.match(route, /intentionExportBody/);
  assert.match(route, /INTENTION_EXPORT_FILENAME/);
  assert.match(route, /Cache-Control": "no-store"/);
  assert.doesNotMatch(route, /stripe|resend|nodemailer|sendMail/i);
  assert.match(history, /data-intention-export="download"/);
  assert.match(history, /data-intention-export="tease"/);
  assert.match(history, /data-intention-export="guest"/);
  assert.match(history, /href="\/api\/soft-intentions\/export"/);
  assert.match(history, /data-intention-history="open"/);
  assert.match(history, /data-intention-history="tease"/);
  assert.match(read("src/components/pricing-view.tsx"), /featureIntentionExportFree/);
  assert.match(read("src/components/pricing-view.tsx"), /featureIntentionExportPlus/);
  assert.doesNotMatch(history, /zh-TW/);
  assert.doesNotMatch(route, /zh-TW/);
});

test("copy exists in en, zh-tw, and ja without a zh-TW path", () => {
  const locales = ["messages/en.json", "messages/zh-tw.json", "messages/ja.json"].map(readJson);
  for (const messages of locales) {
    assert.match(messages.Account.timezoneChangeConfirm, /\{zone\}/);
    assert.equal(messages.Account.timezoneChangeHint.length > 8, true);
    assert.equal(messages.Account.timezoneChangeKeep.length > 2, true);
    assert.equal(messages.SoftIntention.exportTitle.length > 2, true);
    assert.equal(messages.SoftIntention.exportBody.length > 8, true);
    assert.equal(messages.SoftIntention.exportCta.length > 2, true);
    assert.equal(messages.SoftIntention.exportTeaseTitle.length > 2, true);
    assert.equal(messages.SoftIntention.exportTeaseBody.length > 8, true);
    assert.equal(messages.SoftIntention.exportGuestBody.length > 8, true);
    assert.equal(messages.Pricing.featureIntentionExportFree.length > 4, true);
    assert.equal(messages.Pricing.featureIntentionExportPlus.length > 4, true);
    assert.equal(messages.Wall.loading.length > 2, true);
  }
  assert.match(locales[0].Account.timezoneChangeConfirm, /digest/i);
  assert.match(locales[1].Account.timezoneChangeConfirm, /摘要/);
  assert.match(locales[2].Account.timezoneChangeConfirm, /ダイジェスト/);
  assert.match(locales[1].SoftIntention.exportCta, /JSON/);
  assert.match(read("src/i18n/routing.ts"), /"en", "zh-tw", "ja"/);

  assert.match(read("src/components/wall-board.tsx"), /DemoNeighborBadge/);
  assert.match(read("src/components/review-form.tsx"), /ReviewSoftLimitHint/);
  assert.match(read("src/lib/soft-intention-history.ts"), /historyLocked: true/);
});
