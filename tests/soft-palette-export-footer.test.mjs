import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { FREE_HISTORY_LIMIT, PLAN_FREE, PLAN_SOFT_PLUS } from "../src/lib/plan.ts";
import {
  accountDownloadBody,
  accountDownloadFilename,
  accountDownloadPayload,
  reviewsForAccountDownload,
} from "../src/lib/review-export.ts";
import { WALL_COLORS } from "../src/lib/wall-canvas.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function leafKeys(value, prefix = "") {
  const out = new Set();
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      const next = prefix ? `${prefix}.${key}` : key;
      if (child && typeof child === "object" && !Array.isArray(child)) {
        for (const item of leafKeys(child, next)) out.add(item);
      } else {
        out.add(next);
      }
    }
    return out;
  }
  out.add(prefix);
  return out;
}

function sampleReview(id, createdAt, summary) {
  return {
    id,
    createdAt,
    energy: `energy-${id}`,
    drain: `drain-${id}`,
    lessOf: "",
    priorities: "",
    feeling: 3,
    summary,
    customAnswers: [],
    locale: "en",
    guestId: "should-not-export",
    email: "secret@example.com",
  };
}

test("Soft+ wall mood legend explains colors without scores or hex", () => {
  assert.deepEqual(WALL_COLORS, ["peach", "blush", "mint", "cream", "lemon", "sky"]);

  const legend = read("src/components/wall-mood-legend.tsx");
  assert.match(legend, /WALL_COLORS/);
  assert.match(legend, /paletteTitle/);
  assert.match(legend, /palette_/);
  assert.doesNotMatch(legend, /#[0-9a-fA-F]{3,8}/);
  assert.doesNotMatch(legend, /rgb\(/);

  const board = read("src/components/wall-board.tsx");
  assert.match(board, /softPlus && !locked \? <WallMoodLegend \/>/);
  assert.match(board, /sortNewest/);
  assert.match(board, /sortMostPraised/);
  assert.match(board, /sortPinnedFirst/);

  const messages = ["en", "zh-tw", "ja"].map((locale) =>
    JSON.parse(read(`messages/${locale}.json`)),
  );
  for (const color of WALL_COLORS) {
    assert.ok(messages[0].Wall[`palette_${color}`]);
    assert.ok(messages[0].Wall[`color_${color}`]);
    assert.doesNotMatch(messages[0].Wall[`palette_${color}`], /#|rgb|token/i);
  }
  assert.match(messages[0].Wall.paletteLead, /not a score/);
  assert.match(messages[1].Wall.paletteLead, /不是分數/);
  assert.match(messages[2].Wall.paletteLead, /点数ではありません/);
  assert.match(messages[1].Wall.paletteTitle, /顏色/);
  assert.match(messages[2].Wall.palette_mint, /水/);
});

test("free account download is the latest four reviews as JSON", () => {
  assert.equal(FREE_HISTORY_LIMIT, 4);
  const reviews = [
    sampleReview("old", "2026-01-01T00:00:00.000Z", "oldest-secret"),
    sampleReview("mid", "2026-03-01T00:00:00.000Z", "mid-secret"),
    sampleReview("newer", "2026-04-01T00:00:00.000Z", "newer-week"),
    sampleReview("new", "2026-05-01T00:00:00.000Z", "newest-week"),
    sampleReview("older", "2026-02-01T00:00:00.000Z", "older-secret"),
    sampleReview("newest", "2026-06-01T00:00:00.000Z", "this-week"),
  ];

  const free = reviewsForAccountDownload(reviews, false, FREE_HISTORY_LIMIT);
  assert.deepEqual(
    free.map((review) => review.id),
    ["newest", "new", "newer", "mid"],
  );
  const payload = accountDownloadPayload(
    reviews,
    false,
    "2026-09-22T00:00:00.000Z",
    FREE_HISTORY_LIMIT,
  );
  assert.equal(payload.plan, PLAN_FREE);
  assert.equal(payload.limit, 4);
  assert.equal(payload.included, 4);
  const body = accountDownloadBody(
    reviews,
    false,
    "2026-09-22T00:00:00.000Z",
    FREE_HISTORY_LIMIT,
  );
  assert.equal(body.endsWith("\n"), true);
  assert.doesNotMatch(body, /oldest-secret|older-secret|secret@example.com|guestId|should-not-export/);
  const parsed = JSON.parse(body);
  assert.deepEqual(Object.keys(parsed.reviews[0]).sort(), [
    "createdAt",
    "customAnswers",
    "drain",
    "energy",
    "feeling",
    "id",
    "lessOf",
    "locale",
    "priorities",
    "summary",
  ]);

  const plus = accountDownloadPayload(reviews, true, "2026-09-22T00:00:00.000Z", FREE_HISTORY_LIMIT);
  assert.equal(plus.plan, PLAN_SOFT_PLUS);
  assert.equal(plus.limit, null);
  assert.equal(plus.included, 6);
  assert.equal(accountDownloadFilename(false), "soft-boring-latest-four.json");
  assert.equal(accountDownloadFilename(true), "soft-boring-reviews.json");

  const route = read("src/app/api/account/export/route.ts");
  assert.match(route, /requireUser/);
  assert.match(route, /FREE_HISTORY_LIMIT/);
  assert.match(route, /Cache-Control": "no-store"/);
  assert.match(route, /accountDownloadBody/);
  assert.doesNotMatch(route, /stripe|nodemailer|RESEND/i);

  const account = read("src/components/account-panel.tsx");
  assert.match(account, /dataDownloadCta/);
  assert.match(account, /href="\/api\/account\/export"/);
  assert.match(account, /planGiftExpiringSoon/);
  assert.match(account, /href="\/history\/export"/);

  const history = read("src/components/history-list.tsx");
  assert.match(history, /freeDownload/);
  assert.match(history, /href="\/api\/account\/export"/);
  assert.match(history, /exportCsv/);
  assert.match(history, /href="\/api\/reviews\/export"/);
});

test("footer cluster is guidelines, privacy, terms, then languages", () => {
  const footer = read("src/components/site-footer.tsx");
  const guidelines = footer.indexOf('href="/guidelines"');
  const privacy = footer.indexOf('href="/privacy"');
  const terms = footer.indexOf('href="/terms"');
  const languages = footer.indexOf('t("languages")');
  assert.ok(guidelines > 0 && guidelines < privacy && privacy < terms && terms < languages);
  assert.match(footer, /LocaleSwitcher variant="footer"/);
  assert.match(footer, /href="\/thanks"/);
  assert.match(footer, /thanksLink/);
  assert.match(footer, /SITE_SHELL_CLASS/);

  const switcher = read("src/components/locale-switcher.tsx");
  const en = switcher.indexOf('locale="en"');
  const zh = switcher.indexOf('locale="zh-tw"');
  const ja = switcher.indexOf('locale="ja"');
  assert.ok(en > 0 && en < zh && zh < ja);
  assert.match(switcher, /variant === "footer"/);

  const messages = ["en", "zh-tw", "ja"].map((locale) =>
    JSON.parse(read(`messages/${locale}.json`)),
  );
  const [enKeys, zhKeys, jaKeys] = messages.map((item) => leafKeys(item));
  assert.deepEqual(enKeys, zhKeys);
  assert.deepEqual(enKeys, jaKeys);
  assert.equal(messages[0].Footer.languages, "Languages");
  assert.equal(messages[1].Footer.languages, "語言");
  assert.equal(messages[2].Footer.languages, "言語");
  assert.match(messages[0].Footer.navLabel, /languages/i);
  assert.match(messages[1].Footer.navLabel, /語言/);
  assert.match(messages[2].Footer.navLabel, /言語/);
  assert.match(messages[0].Privacy.s6Body, /JSON/);
  assert.match(messages[1].Privacy.s6Body, /JSON/);
  assert.match(messages[2].Privacy.s6Body, /JSON/);
  assert.match(read("src/db/gift-codes.ts"), /redeemGiftCode/);
  assert.match(read("src/lib/wall-filters.ts"), /sortWallNotes/);
});
