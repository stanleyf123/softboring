import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

register("./alias-hook.mjs", import.meta.url);

const {
  SOFT_BLOOM_STORAGE_KEY,
  readSoftBloomEnabled,
  softBloomEnabledFromStorage,
  writeSoftBloomEnabled,
} = await import("../src/lib/soft-bloom.ts");
const { capsulesOpenedThisWeek, isoWeekWindow } = await import("../src/lib/soft-opens.ts");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

function memoryStorage(initial = {}) {
  const bag = { ...initial };
  return {
    bag,
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(bag, key) ? bag[key] : null;
    },
    setItem(key, value) {
      bag[key] = value;
    },
  };
}

test("save bloom is on until this device keeps it quiet", () => {
  assert.equal(SOFT_BLOOM_STORAGE_KEY, "softboring.softBloom.v1");
  assert.equal(softBloomEnabledFromStorage(null), true);
  assert.equal(softBloomEnabledFromStorage(undefined), true);
  assert.equal(softBloomEnabledFromStorage("1"), true);
  assert.equal(softBloomEnabledFromStorage("0"), false);
  assert.equal(readSoftBloomEnabled(null), true);

  const storage = memoryStorage();
  assert.equal(readSoftBloomEnabled(storage), true);
  writeSoftBloomEnabled(false, storage);
  assert.equal(storage.bag[SOFT_BLOOM_STORAGE_KEY], "0");
  assert.equal(readSoftBloomEnabled(storage), false);
  writeSoftBloomEnabled(true, storage);
  assert.equal(storage.bag[SOFT_BLOOM_STORAGE_KEY], "1");
  assert.equal(readSoftBloomEnabled(storage), true);

  const throwing = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
  };
  assert.equal(readSoftBloomEnabled(throwing), true);
  assert.doesNotThrow(() => writeSoftBloomEnabled(false, throwing));

  const bloom = read("src/components/soft-save-bloom.tsx");
  const form = read("src/components/review-form.tsx");
  const account = read("src/components/account-panel.tsx");
  const css = read("src/app/globals.css");
  assert.match(form, /SoftSaveBloom/);
  assert.match(bloom, /data-soft-bloom=\{on \? "on" : "off"\}/);
  assert.match(bloom, /soft-save-bloom-card/);
  assert.match(bloom, /data-soft-bloom-dismiss/);
  assert.match(bloom, /data-soft-bloom-restore/);
  assert.match(bloom, /writeSoftBloomEnabled/);
  assert.match(account, /SoftBloomPreference/);
  assert.match(bloom, /data-soft-bloom-preference/);
  assert.match(bloom, /writeSoftBloomEnabled/);
  assert.match(css, /@keyframes soft-save-bloom/);
  assert.match(css, /@keyframes soft-save-card-pulse/);
  assert.match(css, /\.soft-save-bloom::before/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /\.soft-save-bloom::before/);
  assert.doesNotMatch(bloom, /confetti|canvas|stripe|resend|nodemailer/i);
  assert.doesNotMatch(read("src/lib/soft-bloom.ts"), /stripe|resend|sendMail/i);
});

test("a fresh wall flag gets a calm ack, and a repeat stays already-flagged", () => {
  const board = read("src/components/wall-board.tsx");
  const api = read("src/app/api/wall/notes/[id]/flag/route.ts");
  const flags = read("src/db/wall-flags.ts");

  assert.match(api, /requireSoftPlus/);
  assert.match(flags, /already: true/);
  assert.match(flags, /already: false/);

  const reportStart = board.indexOf("async function reportNote");
  const reportEnd = board.indexOf("async function shareLatest");
  const report = board.slice(reportStart, reportEnd);
  assert.match(report, /already\?: boolean/);
  assert.match(report, /data\.already \? "already" : "fresh"/);
  assert.match(report, /setReportTone/);

  assert.match(board, /data-wall-report=/);
  assert.match(board, /reportAckTitle/);
  assert.match(board, /reportAckBody/);
  assert.match(board, /reportAlreadyTitle/);
  assert.match(board, /reportAlreadyBody/);
  assert.match(board, /reportThanks/);
  assert.match(board, /reportFeelsOff/);
  const alreadyBranch = board.indexOf('? "ack"');
  const freshCopy = board.indexOf("reportAckTitle");
  const alreadyCopy = board.indexOf("reportAlreadyTitle");
  assert.ok(alreadyBranch > 0 && freshCopy > alreadyBranch && alreadyCopy > freshCopy);
  assert.doesNotMatch(board.slice(reportStart, reportEnd), /sendMail|stripe|resend/i);
});

test("this week's opened capsules stay in-app and skip anything still sealed", () => {
  const now = new Date("2026-09-23T04:00:00.000Z");
  const taipei = isoWeekWindow(now, "Asia/Taipei");
  assert.equal(taipei.timeZone, "Asia/Taipei");
  assert.equal(taipei.start.toISOString(), "2026-09-20T16:00:00.000Z");
  assert.equal(taipei.end.toISOString(), "2026-09-27T16:00:00.000Z");

  const utc = isoWeekWindow(now, "UTC");
  assert.equal(utc.start.toISOString(), "2026-09-21T00:00:00.000Z");
  assert.equal(utc.end.toISOString(), "2026-09-28T00:00:00.000Z");

  const capsules = [
    {
      id: "monday",
      unlockAt: "2026-09-20T16:00:00.000Z",
      sealed: false,
      body: "  warm tea  ",
    },
    {
      id: "later",
      unlockAt: "2026-09-22T16:00:00.000Z",
      sealed: false,
      body: "a later line",
    },
    {
      id: "still-sealed",
      unlockAt: "2026-09-25T16:00:00.000Z",
      sealed: true,
      body: "secret future",
    },
    {
      id: "last-week",
      unlockAt: "2026-09-13T16:00:00.000Z",
      sealed: false,
      body: "older",
    },
    {
      id: "next-week",
      unlockAt: "2026-09-27T16:00:00.000Z",
      sealed: false,
      body: "not yet this week",
    },
    {
      id: "empty-body",
      unlockAt: "2026-09-21T16:00:00.000Z",
      sealed: false,
      body: "   ",
    },
    {
      id: "hidden-words",
      unlockAt: "2026-09-21T16:00:00.000Z",
      sealed: false,
    },
  ];

  const opened = capsulesOpenedThisWeek(capsules, now, "Asia/Taipei");
  assert.deepEqual(
    opened.map((item) => item.id),
    ["later", "monday"],
  );
  assert.equal(opened[1].body, "warm tea");
  assert.equal(
    opened.some((item) => item.body.includes("secret") || item.id === "still-sealed"),
    false,
  );

  assert.deepEqual(capsulesOpenedThisWeek(capsules, now, "UTC").map((item) => item.id), [
    "later",
  ]);
  assert.deepEqual(capsulesOpenedThisWeek([], now, "Asia/Taipei"), []);

  const inbox = read("src/components/soft-opens-inbox.tsx");
  const account = read("src/components/account-panel.tsx");
  const route = read("src/app/api/soft-capsules/route.ts");
  assert.match(account, /SoftOpensInbox/);
  assert.match(inbox, /capsulesOpenedThisWeek/);
  assert.match(inbox, /data-soft-opens="tease"/);
  assert.match(inbox, /data-soft-opens="empty"/);
  assert.match(inbox, /data-soft-opens="list"/);
  assert.match(inbox, /href="\/pricing"/);
  assert.match(route, /userIsSoftPlus/);
  assert.match(route, /soft_plus_required/);

  const teaseStart = inbox.indexOf('data-soft-opens="tease"');
  const shelfStart = inbox.indexOf('data-soft-opens="shelf"');
  assert.ok(teaseStart > 0 && shelfStart > teaseStart);
  assert.doesNotMatch(inbox.slice(0, shelfStart), /capsule\.body/);
  assert.match(inbox.slice(shelfStart), /capsule\.body/);
  assert.match(inbox, /!signedIn \|\| !softPlus/);
  assert.doesNotMatch(inbox, /stripe|resend|nodemailer|sendMail/i);
  assert.doesNotMatch(read("src/lib/soft-opens.ts"), /stripe|resend|sendMail/i);

  const locales = ["en", "zh-tw", "ja"].map((locale) => readJson(`messages/${locale}.json`));
  for (const copy of locales) {
    assert.equal(typeof copy.Review.bloomDismiss, "string");
    assert.equal(typeof copy.Account.bloomTitle, "string");
    assert.equal(typeof copy.Wall.reportAckTitle, "string");
    assert.equal(typeof copy.Wall.reportAlreadyTitle, "string");
    assert.equal(typeof copy.SoftOpens.title, "string");
    assert.equal(typeof copy.SoftOpens.teaseBody, "string");
    assert.equal(copy.SoftOpens.privacy.includes("mail") || copy.SoftOpens.privacy.includes("寄信") || copy.SoftOpens.privacy.includes("メール"), true);
  }
  assert.equal(locales[0].Wall.reportAlreadyTitle, "You already flagged this");
  assert.equal(locales[1].Wall.reportAlreadyTitle, "你已經標記過這張");
  assert.equal(locales[2].Wall.reportAlreadyTitle, "このメモには、もう印をつけてあるよ");
  assert.equal(locales[0].SoftOpens.title, "Opened this week");
  assert.equal(locales[1].Pricing.featureCapsulePlus.includes("不寄信"), true);
  assert.equal(locales[2].Pricing.featureCapsulePlus.includes("メール"), true);
});
