import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { register } from "node:module";

register("./alias-hook.mjs", import.meta.url);

const { copyReviewAnswers, reviewDraftExcerpt } = await import("../src/lib/review-autosave.ts");
const {
  PAST_LETTER_INBOX_LIMIT,
  presentPastLetterInbox,
} = await import("../src/lib/past-self-letter.ts");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

test("admin gift codes explain an empty mint in Traditional Chinese", () => {
  const panel = read("src/components/admin-gift-panel.tsx");
  const copy = read("src/lib/admin-copy.ts");
  const page = read("src/app/admin/gifts/page.tsx");

  assert.match(panel, /data-admin-gift-empty/);
  assert.match(panel, /data-admin-gift-mint/);
  assert.match(panel, /bg-mint\/50/);
  assert.match(panel, /bg-cream\/80/);
  assert.match(panel, /AdminGiftEmpty/);
  assert.match(panel, /emptySteps\.map/);
  assert.match(page, /AdminGiftTable/);
  assert.match(copy, /還沒有禮物碼/);
  assert.match(copy, /不會向 Stripe 收費/);
  assert.match(copy, /也不會寄信/);
  assert.match(copy, /不會寄出信件/);
  assert.doesNotMatch(panel, /resend|nodemailer|sendMail/i);
  assert.doesNotMatch(panel, /\/zh-TW/);
  assert.doesNotMatch(copy, /\/zh-TW\//);
});

test("a local review draft can be restored or let go without losing autosave", () => {
  const rain = "雨聲夠了".repeat(20);
  assert.equal(reviewDraftExcerpt({ energy: "  tea  ", drain: "later" }), "tea");
  assert.equal(reviewDraftExcerpt({ energy: "   ", summary: "a quiet line" }), "a quiet line");
  assert.equal(
    reviewDraftExcerpt({ customAnswers: [{ id: "q", prompt: "?", answer: "  moss  " }] }),
    "moss",
  );
  assert.equal(reviewDraftExcerpt({ feeling: 4, mood: "mint" }), "");
  assert.equal(reviewDraftExcerpt(null), "");
  assert.equal(Array.from(reviewDraftExcerpt({ energy: rain }, 8)).length, 8);
  assert.equal(reviewDraftExcerpt({ energy: rain }, 0), Array.from(rain).slice(0, 72).join(""));

  const original = {
    energy: "tea",
    drain: "",
    lessOf: "",
    priorities: "",
    feeling: 3,
    summary: "",
    customAnswers: [{ id: "q", prompt: "?", answer: "one" }],
  };
  const copied = copyReviewAnswers(original);
  copied.customAnswers[0].answer = "two";
  copied.energy = "moss";
  assert.equal(original.energy, "tea");
  assert.equal(original.customAnswers[0].answer, "one");

  const form = read("src/components/review-form.tsx");
  const css = read("src/app/globals.css");
  assert.match(form, /data-review-draft-banner="open"/);
  assert.match(form, /data-review-draft-excerpt/);
  assert.match(form, /draftRestore/);
  assert.match(form, /draftDiscard/);
  assert.match(form, /discardOffer/);
  assert.match(form, /clearDraft\(\)/);
  assert.match(form, /data-review-autosave/);
  assert.match(form, /reviewDraftExcerpt/);
  assert.match(css, /\.soft-draft-banner[\s\S]*background:\s*var\(--cream\)/);
  assert.match(css, /border:\s*1px solid var\(--peach\)/);
  assert.match(
    css,
    /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*\.soft-draft-banner[\s\S]*animation: none/,
  );
  assert.match(css, /@media print \{[\s\S]*\.soft-draft-banner[\s\S]*display: none/);
  assert.doesNotMatch(form, /stripe|resend|nodemailer|sendMail|zh-TW/i);
});

test("Soft+ past-letter inbox lists kept letters and teases everyone else", () => {
  const now = new Date("2026-09-22T12:00:00.000Z");
  const long = `${"字".repeat(300)} tail`;
  const letters = presentPastLetterInbox(
    [
      {
        id: "new",
        reviewId: "week-old",
        body: `  ${long}  `,
        summary: "  A rainy shelf ",
        reviewCreatedAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-20T00:00:00.000Z",
      },
      {
        id: "blank",
        reviewId: "week-blank",
        body: "   ",
        summary: "skip",
        reviewCreatedAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-09-19T00:00:00.000Z",
      },
      {
        id: "current",
        reviewId: "week-now",
        body: "Still this week.",
        summary: "",
        reviewCreatedAt: "2026-09-22T01:00:00.000Z",
        updatedAt: "2026-09-22T02:00:00.000Z",
      },
    ],
    "UTC",
    now,
    24,
  );

  assert.equal(letters.length, 2);
  assert.equal(letters[0].id, "new");
  assert.equal(letters[0].past, true);
  assert.equal(letters[0].summary, "A rainy shelf");
  assert.match(letters[0].weekKey, /^\d{4}-W\d{2}$/);
  assert.equal(Array.from(letters[0].body).length, 280);
  assert.equal(letters[0].body.includes("tail"), false);
  assert.equal(letters[1].past, false);
  assert.equal(letters[1].summary, "");
  assert.equal(JSON.stringify(letters).includes("@"), false);
  assert.equal(presentPastLetterInbox([], "UTC", now).length, 0);
  assert.equal(
    presentPastLetterInbox(
      Array.from({ length: 30 }, (_, index) => ({
        id: `id-${index}`,
        reviewId: `review-${index}`,
        body: `line ${index}`,
        summary: "",
        reviewCreatedAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      })),
      "Asia/Taipei",
      now,
    ).length,
    PAST_LETTER_INBOX_LIMIT,
  );

  const api = read("src/app/api/past-letters/route.ts");
  const inbox = read("src/components/past-letter-inbox.tsx");
  const account = read("src/components/account-panel.tsx");
  const shelf = read("src/components/past-self-letter-shelf.tsx");
  const pricing = read("src/components/pricing-view.tsx");
  const exportRoute = read("src/app/api/account/export/route.ts");

  assert.match(api, /userIsSoftPlus/);
  assert.match(api, /soft_plus_required/);
  assert.match(api, /presentPastLetterInbox/);
  assert.match(api, /if \(!reviewId\)/);
  assert.match(api, /getReviewForOwner/);
  assert.doesNotMatch(api, /stripe|resend|nodemailer|sendMail|email/i);
  assert.match(inbox, /data-past-letter-inbox="tease"/);
  assert.match(inbox, /data-past-letter-inbox="guest"/);
  assert.match(inbox, /data-past-letter-inbox="open"/);
  assert.match(inbox, /data-past-letter-inbox-empty/);
  assert.match(inbox, /data-past-letter-inbox-list/);
  assert.match(inbox, /href="\/pricing"/);
  assert.match(inbox, /\/api\/past-letters/);
  assert.match(inbox, /#past-self-letter/);
  assert.doesNotMatch(inbox, /zh-TW|stripe|resend|nodemailer|sendMail/i);
  assert.match(account, /PastLetterInbox/);
  assert.match(account, /softPlus=\{softPlus\}/);
  assert.match(shelf, /data-past-letter-inbox-link/);
  assert.match(shelf, /data-past-self-shelf="tease"/);
  assert.match(shelf, /href="\/account"/);
  assert.match(pricing, /featurePastInboxFree/);
  assert.match(pricing, /featurePastInboxPlus/);
  assert.match(pricing, /featurePastLetterFree/);
  assert.doesNotMatch(exportRoute, /past_self_letters|past-letters/);

  const locales = ["en", "zh-tw", "ja"].map((locale) => readJson(`messages/${locale}.json`));
  const reviewKeys = ["draftBannerTitle", "draftBannerBody", "draftRestore", "draftDiscard", "draftPreview"];
  const inboxKeys = [
    "inboxTitle",
    "inboxLead",
    "inboxEmpty",
    "inboxTeaseTitle",
    "inboxTeaseBody",
    "inboxPrivacy",
    "inboxLink",
    "inboxCount",
  ];
  for (const messages of locales) {
    for (const key of reviewKeys) {
      assert.equal(messages.Review[key].length > 0, true);
    }
    for (const key of inboxKeys) {
      assert.equal(messages.PastLetter[key].length > 0, true);
    }
    assert.match(messages.PastLetter.inboxCount, /\{count\}/);
    assert.match(messages.Pricing.featurePastInboxFree, /Soft\+/);
    assert.match(messages.Pricing.featurePastInboxPlus, /\S/);
    assert.doesNotMatch(JSON.stringify(messages.PastLetter), /zh-TW/);
    assert.doesNotMatch(JSON.stringify(messages.Review), /zh-TW/);
  }
  assert.match(locales[1].PastLetter.inboxPrivacy, /不會寄出/);
  assert.match(locales[1].Review.draftDiscard, /草稿/);
  assert.match(locales[2].PastLetter.inboxPrivacy, /メール/);
  assert.match(locales[0].Review.draftBannerBody, /this device/i);
});
