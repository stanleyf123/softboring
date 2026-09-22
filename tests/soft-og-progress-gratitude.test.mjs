import assert from "node:assert/strict";
import { register } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

register("./alias-hook.mjs", import.meta.url);

const { pageMetadata } = await import("../src/lib/seo.ts");
const {
  toPublicWallNoteOg,
  wallNoteOgCopy,
  wallNoteOgPath,
  wallNoteQueryPath,
  WALL_NOTE_OG_COLORS,
} = await import("../src/lib/wall-note-og.ts");
const { promptHasText, weeklyPromptDots, WEEKLY_TEXT_PROMPTS } = await import(
  "../src/lib/review-progress.ts"
);
const {
  GRATITUDE_SHARE_FILENAME,
  drawGratitudeShareCard,
  gratitudeShareLine,
} = await import("../src/lib/gratitude-share-card.ts");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const NOTE_ID = "123e4567-e89b-42d3-a456-426614174000";

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

test("public wall-note OG keeps excerpt and nickname, and drops private fields", () => {
  const hidden = toPublicWallNoteOg({
    id: NOTE_ID,
    summary: "a private week",
    energy: "tea",
    color: "mint",
    ownerNickname: "mika",
    hidden: true,
  });
  assert.equal(hidden, null);
  assert.equal(
    toPublicWallNoteOg({
      id: "not-a-note",
      summary: "hello",
      energy: "",
      color: "peach",
      ownerNickname: null,
      hidden: false,
    }),
    null,
  );

  const card = toPublicWallNoteOg({
    id: NOTE_ID,
    summary: "  morning light\n on the desk  ",
    energy: "should not win",
    color: "mint",
    ownerNickname: "  mika  ",
    hidden: false,
    email: "secret@example.com",
    userId: "user-1",
    reviewId: "rev-1",
  });
  assert.equal(card.excerpt.includes("morning light"), true);
  assert.equal(card.excerpt.includes("should not win"), false);
  assert.equal(card.author, "mika");
  assert.equal(card.color, "mint");
  assert.equal(card.wash, "#d5e6d8");
  assert.deepEqual(Object.keys(card).sort(), [
    "author",
    "color",
    "excerpt",
    "noteId",
    "wash",
  ]);
  const packed = JSON.stringify(card);
  assert.equal(packed.includes("secret@example.com"), false);
  assert.equal(packed.includes("user-1"), false);
  assert.equal(packed.includes("rev-1"), false);

  const unnamed = toPublicWallNoteOg({
    id: NOTE_ID,
    summary: "",
    energy: "a quiet walk",
    color: "nope",
    ownerNickname: null,
    hidden: false,
    email: "secret@example.com",
  });
  assert.equal(unnamed.excerpt, "a quiet walk");
  assert.equal(unnamed.author, null);
  assert.equal(unnamed.color, "peach");
  assert.equal(JSON.stringify(unnamed).includes("secret@"), false);
});

test("wall-note OG paths stay on en / zh-tw / ja", () => {
  assert.equal(wallNoteOgPath("zh-TW", NOTE_ID), `/zh-tw/og/note/${NOTE_ID}`);
  assert.equal(wallNoteOgPath("ja", NOTE_ID), `/ja/og/note/${NOTE_ID}`);
  assert.equal(wallNoteOgPath("en", "nope"), null);
  assert.equal(wallNoteQueryPath(NOTE_ID), `/wall?note=${NOTE_ID}`);
  assert.equal(wallNoteOgCopy("zh-tw").brand, "softboring.com");
  assert.equal(wallNoteOgCopy("zh-TW").kicker, wallNoteOgCopy("zh-tw").kicker);
  assert.equal(WALL_NOTE_OG_COLORS.background, "#f6ebe3");
  assert.equal(WALL_NOTE_OG_COLORS.blush, "#f4d4c6");
  assert.equal(WALL_NOTE_OG_COLORS.mint, "#d5e6d8");

  const meta = pageMetadata({
    locale: "zh-tw",
    title: "A note",
    description: "morning light",
    path: "/wall",
    socialPath: wallNoteQueryPath(NOTE_ID),
    image: {
      url: wallNoteOgPath("zh-TW", NOTE_ID),
      alt: "morning light",
    },
    requestUrl: "https://softboring.com/",
  });
  assert.match(String(meta.alternates.canonical), /\/zh-tw\/wall$/);
  assert.doesNotMatch(String(meta.alternates.canonical), /note=/);
  assert.doesNotMatch(String(meta.alternates.canonical), /zh-TW/);
  assert.match(String(meta.openGraph.url), /\/zh-tw\/wall\?note=/);
  assert.equal(meta.openGraph.images[0].url.endsWith(`/zh-tw/og/note/${NOTE_ID}`), true);
  assert.equal(meta.openGraph.images[0].url.includes("zh-TW"), false);
  assert.equal(meta.openGraph.images[0].alt, "morning light");

  const fallback = pageMetadata({
    locale: "en",
    title: "Soft Wall",
    description: "A corkboard",
    path: "/wall",
    requestUrl: "https://softboring.com/",
  });
  assert.match(fallback.openGraph.images[0].url, /\/en\/opengraph-image$/);
});

test("wall page points a public note at the cream OG route", () => {
  const page = read("src/app/[locale]/wall/page.tsx");
  const query = read("src/db/wall-note-og.ts");
  const route = read("src/app/[locale]/og/note/[id]/route.tsx");
  assert.match(page, /getPublicWallNoteOg/);
  assert.match(page, /wallNoteOgPath/);
  assert.match(page, /socialPath/);
  assert.match(page, /path: "\/wall"/);
  assert.match(query, /u\.nickname AS owner_nickname/);
  const selectList = query.slice(query.indexOf("SELECT"), query.indexOf("FROM"));
  assert.doesNotMatch(selectList, /email|user_id|review_id/);
  assert.match(route, /#f6ebe3|#f4d4c6|WALL_NOTE_OG_COLORS/);
  assert.match(route, /status: 404/);
  assert.doesNotMatch(route, /stripe|sendMail|nodemailer/i);
  assert.doesNotMatch(read("src/app/sitemap.ts"), /og\/note/);
});

test("review dots mark written prompts without a score", () => {
  assert.equal(promptHasText("  "), false);
  assert.equal(promptHasText("tea"), true);
  assert.equal(promptHasText(3), false);

  const dots = weeklyPromptDots({
    energy: "  ",
    drain: "a long meeting",
    lessOf: "",
    priorities: "one thing",
    summary: "\n",
    feeling: 5,
    customAnswers: [{ id: "c1", answer: "extra" }],
  });
  assert.deepEqual(
    dots.map((dot) => dot.id),
    [...WEEKLY_TEXT_PROMPTS],
  );
  assert.deepEqual(
    dots.map((dot) => dot.filled),
    [false, true, false, true, false],
  );
  assert.equal(JSON.stringify(dots).includes("feeling"), false);
  assert.equal(JSON.stringify(dots).includes("extra"), false);

  const form = read("src/components/review-form.tsx");
  const dotsUi = read("src/components/review-progress-dots.tsx");
  const css = read("src/app/globals.css");
  assert.match(form, /<ReviewProgressDots/);
  assert.match(dotsUi, /data-review-progress="dots"/);
  assert.match(dotsUi, /data-review-progress-dot/);
  assert.doesNotMatch(dotsUi, /softPlus|userIsSoftPlus|\/\s*5|score|streak/i);
  assert.match(css, /\.soft-progress-dot\.is-filled/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test("gratitude share card paints the line and no private meta", () => {
  assert.equal(gratitudeShareLine("  morning\ntea  "), "morning tea");
  assert.equal(gratitudeShareLine(""), "");
  assert.equal(gratitudeShareLine("   "), "");
  assert.equal(gratitudeShareLine("謝".repeat(180)).length, 140);
  assert.equal(GRATITUDE_SHARE_FILENAME, "soft-boring-gratitude.png");
  assert.doesNotMatch(GRATITUDE_SHARE_FILENAME, /@|[0-9a-f]{8}-/i);

  const painted = [];
  const ctx = {
    clearRect() {},
    createLinearGradient() {
      return { addColorStop() {} };
    },
    fillRect() {},
    beginPath() {},
    moveTo() {},
    arcTo() {},
    closePath() {},
    fill() {},
    strokeRect() {},
    measureText(text) {
      return { width: Array.from(text).length * 20 };
    },
    fillText(text) {
      painted.push(text);
    },
    font: "",
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
  };
  drawGratitudeShareCard(ctx, "morning light", {
    brand: "Soft Boring Weekly",
    kind: "a small gratitude",
    footer: "softboring.com",
  });
  const text = painted.join("\n");
  assert.match(text, /morning light/);
  assert.match(text, /softboring\.com/);
  assert.doesNotMatch(text, /@|user-|createdAt|secret/i);

  const card = read("src/components/gratitude-jar-card.tsx");
  const pricing = read("src/components/pricing-view.tsx");
  assert.match(card, /data-gratitude-share="tease"/);
  assert.match(card, /data-gratitude-share="download"/);
  assert.match(card, /gratitudeShareLine\(drawn\?\.body\)/);
  assert.match(card, /GRATITUDE_SHARE_FILENAME/);
  assert.doesNotMatch(card, /renderGratitudeSharePng\(\s*drawn/);
  assert.match(pricing, /featureGratitudeCardFree/);
  assert.match(pricing, /featureGratitudeCardPlus/);
  assert.match(read("src/app/api/gratitude-jar/route.ts"), /userIsSoftPlus/);
  const shareLib = read("src/lib/gratitude-share-card.ts");
  assert.doesNotMatch(shareLib, /stripe|sendMail|nodemailer/i);
  assert.doesNotMatch(shareLib, /createdAt|userId|ownerEmail/);
  assert.match(shareLib, /export function drawGratitudeShareCard/);
});

test("og, dots, and gratitude copy exist in en / zh-tw / ja", () => {
  const keys = {
    Metadata: ["wallNoteTitle", "wallNoteQuiet"],
    Review: ["progressHint", "progressFilled", "progressEmpty"],
    Pricing: ["featureGratitudeCardFree", "featureGratitudeCardPlus"],
    GratitudeJar: ["shareTease", "shareCta", "shareNote", "cardKind", "cardFooter"],
  };
  const locales = ["messages/en.json", "messages/zh-tw.json", "messages/ja.json"].map(readJson);
  for (const messages of locales) {
    for (const [section, names] of Object.entries(keys)) {
      for (const name of names) {
        assert.equal(typeof messages[section][name], "string", `${section}.${name}`);
        assert.equal(messages[section][name].length > 0, true);
      }
    }
    assert.match(messages.GratitudeJar.shareNote, /mail|信|メール/i);
    assert.doesNotMatch(messages.Review.progressHint, /score|分數|点数/);
    assert.equal(messages.GratitudeJar.cardFooter, "softboring.com");
  }
  assert.notEqual(locales[0].Review.progressHint, locales[1].Review.progressHint);
  assert.notEqual(locales[0].GratitudeJar.shareTease, locales[2].GratitudeJar.shareTease);
  assert.equal(locales[1].Metadata.wallNoteTitle.includes("軟軟牆"), true);
  assert.equal(locales[2].Metadata.wallNoteTitle.includes("ソフトウォール"), true);
});
