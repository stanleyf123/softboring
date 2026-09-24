import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

register("./alias-hook.mjs", import.meta.url);

const {
  friendShareBlurb,
  friendSharePath,
  friendShareSentence,
  shareFriendInvite,
  canUseWebShare,
} = await import("../src/lib/friend-share.ts");
const { otherWallWeekChip } = await import("../src/lib/wall-week-empty.ts");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

const PRIZE = /reward|bonus|prize|贈品|獎金|特典|報酬|景品/i;

test("friend share links use the public desk or a nickname wall door", async () => {
  assert.equal(friendSharePath("en", null), "/en");
  assert.equal(friendSharePath("zh-TW", ""), "/zh-tw");
  assert.equal(friendSharePath("ja", "Moss"), "/ja/wall?nick=Moss");
  assert.equal(friendSharePath("zh-tw", "  小桃 "), "/zh-tw/wall?nick=%E5%B0%8F%E6%A1%83");
  assert.equal(friendSharePath("en", "a@b"), "/en");
  assert.equal(friendSharePath("en", "hidden@example.com"), "/en");
  assert.equal(friendSharePath("fr", "Moss"), null);
  assert.doesNotMatch(friendSharePath("zh-TW", "Moss") ?? "", /zh-TW/);

  for (const locale of ["en", "zh-tw", "ja"]) {
    const blurb = friendShareBlurb(locale, "https://softboring.com/en");
    assert.match(blurb, /https:\/\/softboring\.com\/en/);
    assert.match(blurb, /Soft Boring/);
    assert.doesNotMatch(blurb, PRIZE);
    assert.doesNotMatch(friendShareSentence(locale), /Soft\+/);
    assert.doesNotMatch(blurb, /zh-TW/);
  }

  assert.equal(canUseWebShare(null), false);
  assert.equal(canUseWebShare({}), false);
  assert.equal(canUseWebShare({ share() {} }), true);

  let shared = null;
  const result = await shareFriendInvite(
    {
      share: async (data) => {
        shared = data;
      },
    },
    { title: "Soft Boring", text: "hello", url: "https://softboring.com/en" },
  );
  assert.equal(result, "shared");
  assert.equal(shared.url, "https://softboring.com/en");
  assert.equal(
    await shareFriendInvite(
      {
        share: async () => {
          const error = new Error("cancel");
          error.name = "AbortError";
          throw error;
        },
      },
      { title: "Soft Boring", text: "hello", url: "https://softboring.com/en" },
    ),
    "dismissed",
  );
  assert.equal(await shareFriendInvite(null, { title: "", text: "", url: "" }), "unavailable");
});

test("account share card, free week print, and cream wall empties stay wired", () => {
  const card = read("src/components/friend-share-card.tsx");
  const account = read("src/components/account-panel.tsx");
  const print = read("src/components/soft-week-print.tsx");
  const button = read("src/components/soft-postcard-button.tsx");
  const board = read("src/components/wall-board.tsx");
  const css = read("src/app/globals.css");

  assert.match(account, /FriendShareCard/);
  assert.match(card, /data-friend-share/);
  assert.match(card, /friendShareBlurb/);
  assert.match(card, /data-friend-share-native/);
  assert.match(card, /friendShareNoPrize/);
  assert.doesNotMatch(card, /stripe|resend|nodemailer|sendMail/);
  assert.doesNotMatch(card, /zh-TW/);

  assert.match(button, /data-week-print=\{softPlus \? "plus" : "free"\}/);
  assert.match(button, /data-print-week/);
  assert.match(button, /window\.print/);
  assert.match(button, /printFreeTitle/);
  assert.match(print, /lessOf/);
  assert.match(print, /priorities/);
  assert.match(print, /customAnswers/);
  assert.match(css, /soft-week-print__panel--cream/);
  assert.doesNotMatch(button, /if \(!softPlus\) return null/);

  assert.match(board, /data-wall-empty="notes"/);
  assert.match(board, /data-wall-empty="filtered"/);
  assert.match(board, /bg-cream\/90/);
  assert.match(board, /emptyWriteCta/);
  assert.match(board, /emptyFilterKeys/);
  assert.match(board, /data-wall-week-empty-other/);
  assert.match(board, /weekEmptyTryEarlier/);
  assert.match(board, /otherWallWeekChip/);
  assert.equal(otherWallWeekChip("this-week"), "earlier");
  assert.equal(otherWallWeekChip("earlier"), "this-week");
  assert.equal(otherWallWeekChip("all"), null);

  const en = readJson("messages/en.json");
  const zh = readJson("messages/zh-tw.json");
  const ja = readJson("messages/ja.json");
  for (const messages of [en, zh, ja]) {
    assert.match(messages.Account.friendShareTitle, /\S/);
    assert.match(messages.Account.friendShareNoPrize, /\S/);
    assert.match(messages.Account.friendShareLangJa, /日本語/);
    assert.match(messages.Postcard.printFreeLead, /\S/);
    assert.match(messages.Wall.emptyFilterKeys, /\//);
    assert.match(messages.Wall.weekEmptyTryThis, /\S/);
    assert.doesNotMatch(messages.Account.friendShareBody, PRIZE);
  }
  assert.match(zh.Account.friendShareTitle, /桌子/);
  assert.match(ja.Wall.weekEmptyTryEarlier, /週/);
  assert.match(read("README.md"), /docs\/friend-share-print-empty\.md/);
  assert.match(read("docs/friend-share-print-empty.md"), /Nothing is emailed|nothing is emailed/i);
});
