import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

register("./alias-hook.mjs", import.meta.url);

const { guestLegendOmitsPersonalColors, guestPaperColors, guestSkyMoods } = await import(
  "../src/lib/guest-sky-legend.ts"
);
const { PLUS_NOTE_COLORS } = await import("../src/lib/wall-canvas.ts");
const { nicknameConfirmKind } = await import("../src/lib/nickname-confirm.ts");
const { applyFeelingStep, wallFilterKeyAction } = await import("../src/lib/wall-filter-keys.ts");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

test("guest color key lists sky moods and shared paper, not personal washes", () => {
  const moods = guestSkyMoods();
  const papers = guestPaperColors();
  assert.deepEqual(moods, ["peach", "mint", "blush", "cream", "lavender"]);
  assert.deepEqual(papers, ["peach", "blush", "mint", "cream", "lemon", "sky"]);
  assert.equal(guestLegendOmitsPersonalColors(papers), true);
  assert.equal(guestLegendOmitsPersonalColors([...papers, "lilac"]), false);
  for (const color of PLUS_NOTE_COLORS) {
    assert.equal(papers.includes(color), false);
    assert.equal(moods.includes(color), false);
  }

  const legend = read("src/components/guest-sky-legend.tsx");
  const home = read("src/app/[locale]/page.tsx");
  const board = read("src/components/wall-board.tsx");
  assert.match(legend, /data-guest-sky-legend=\{variant\}/);
  assert.match(legend, /data-guest-mood=\{mood\}/);
  assert.match(legend, /data-guest-paper=\{color\}/);
  assert.match(legend, /guestPaperColors\(\)/);
  assert.match(legend, /variant === "wall"/);
  assert.doesNotMatch(legend, /PLUS_NOTE_COLORS/);
  assert.match(home, /user \? null : <GuestSkyLegend variant="home" \/>/);
  assert.match(board, /locked \? <GuestSkyLegend variant="wall" \/> : null/);
  assert.doesNotMatch(read("src/lib/guest-sky-legend.ts"), /stripe|resend|nodemailer|sendMail/i);
});

test("nickname edits wait for a soft confirm", () => {
  assert.equal(nicknameConfirmKind("Peach", "Peach"), null);
  assert.equal(nicknameConfirmKind("Peach", "  Peach  "), null);
  assert.equal(nicknameConfirmKind(null, "   "), null);
  assert.equal(nicknameConfirmKind("", "Momo"), "rename");
  assert.equal(nicknameConfirmKind("Peach", "momo"), "rename");
  assert.equal(nicknameConfirmKind("Peach", ""), "clear");
  assert.equal(nicknameConfirmKind("Peach", "   "), "clear");

  const panel = read("src/components/account-panel.tsx");
  assert.match(panel, /data-nickname-confirm=\{kind\}/);
  assert.match(panel, /data-nickname-confirm="same"/);
  assert.match(panel, /data-nickname-confirm="invalid"/);
  assert.match(panel, /onSubmit=\{\(event\) => event\.preventDefault\(\)\}/);
  assert.match(panel, /nicknameConfirmKind\(savedName, value\)/);
  assert.doesNotMatch(panel.slice(panel.indexOf("function NicknameEditor")), /type="submit"/);
  assert.doesNotMatch(read("src/lib/nickname-confirm.ts"), /stripe|resend|nodemailer|sendMail/i);
});

test("Soft Wall filter keys move weeks and step feeling bounds", () => {
  const base = {
    shiftKey: false,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    repeat: false,
    typing: false,
    weekChipsFocused: false,
    weekChip: "all",
    feelingMin: null,
    feelingMax: null,
  };

  assert.deepEqual(wallFilterKeyAction({ ...base, key: "ArrowRight", weekChipsFocused: true }), {
    type: "week",
    chip: "this-week",
  });
  assert.deepEqual(
    wallFilterKeyAction({ ...base, key: "ArrowLeft", weekChip: "all", weekChipsFocused: true }),
    { type: "week", chip: "earlier" },
  );
  assert.deepEqual(
    wallFilterKeyAction({ ...base, key: "End", weekChip: "this-week", weekChipsFocused: true }),
    { type: "week", chip: "earlier" },
  );
  assert.deepEqual(
    wallFilterKeyAction({ ...base, key: "Home", weekChip: "earlier", weekChipsFocused: true }),
    { type: "week", chip: "all" },
  );
  assert.equal(
    wallFilterKeyAction({ ...base, key: "ArrowRight", weekChipsFocused: false }),
    null,
  );
  assert.equal(wallFilterKeyAction({ ...base, key: "ArrowRight", weekChipsFocused: true, typing: true }), null);
  assert.equal(wallFilterKeyAction({ ...base, key: "[", weekChipsFocused: true }), null);

  assert.deepEqual(wallFilterKeyAction({ ...base, key: "]" }), {
    type: "feeling",
    feelingMin: 1,
    feelingMax: null,
  });
  assert.deepEqual(wallFilterKeyAction({ ...base, key: "]", feelingMin: 5 }), null);
  assert.deepEqual(wallFilterKeyAction({ ...base, key: "[", feelingMin: 1 }), {
    type: "feeling",
    feelingMin: null,
    feelingMax: null,
  });
  assert.deepEqual(wallFilterKeyAction({ ...base, key: "}" }), {
    type: "feeling",
    feelingMin: null,
    feelingMax: 1,
  });
  assert.deepEqual(wallFilterKeyAction({ ...base, key: "]", shiftKey: true, feelingMax: 2 }), {
    type: "feeling",
    feelingMin: null,
    feelingMax: 3,
  });
  assert.deepEqual(applyFeelingStep(4, 3, "min", 1), { feelingMin: 5, feelingMax: 5 });
  assert.deepEqual(applyFeelingStep(4, 4, "max", -1), { feelingMin: 3, feelingMax: 3 });
  assert.equal(wallFilterKeyAction({ ...base, key: "]", typing: true }), null);
  assert.equal(wallFilterKeyAction({ ...base, key: "]", metaKey: true }), null);
  assert.equal(wallFilterKeyAction({ ...base, key: "]", repeat: true }), null);

  const board = read("src/components/wall-board.tsx");
  const help = read("src/components/soft-shortcuts-help.tsx");
  assert.match(board, /wallFilterKeyAction/);
  assert.match(board, /data-wall-week-keys/);
  assert.match(board, /data-wall-feeling-keys/);
  assert.match(board, /data-wall-feeling="min"/);
  assert.match(board, /data-wall-feeling="max"/);
  assert.match(board, /tabIndex=\{selected \? 0 : -1\}/);
  assert.match(help, /t\("weekChips"\)/);
  assert.match(help, /t\("feelingFloor"\)/);
  assert.match(help, /t\("feelingCeiling"\)/);
  assert.match(help, /t\("filters"\)/);
  assert.doesNotMatch(read("src/lib/wall-filter-keys.ts"), /stripe|resend|nodemailer|sendMail/i);
});

test("en, zh-TW, and ja share the new copy", () => {
  const locales = ["messages/en.json", "messages/zh-tw.json", "messages/ja.json"].map(readJson);
  const guestKeys = ["title", "lead", "homeNote", "skyTitle", "skyLead", "paperTitle", "paperLead"];
  const accountKeys = [
    "nicknameChangeConfirm",
    "nicknameClearConfirm",
    "nicknameChangeHint",
    "nicknameConfirm",
    "nicknameChangeKeep",
    "nicknameUnchanged",
  ];
  for (const messages of locales) {
    for (const key of guestKeys) assert.equal(typeof messages.GuestLegend[key], "string");
    for (const key of accountKeys) assert.equal(messages.Account[key].length > 0, true);
    assert.equal(messages.Wall.weekChipsKeys.length > 0, true);
    assert.equal(messages.Wall.filterFeelingKeys.length > 0, true);
    assert.equal(messages.Shortcuts.weekChips.length > 0, true);
    assert.equal(messages.Shortcuts.feelingFloor.length > 0, true);
    assert.equal(messages.Shortcuts.feelingCeiling.length > 0, true);
  }
  assert.match(locales[1].GuestLegend.title, /顏色/);
  assert.match(locales[1].Account.nicknameConfirm, /存/);
  assert.match(locales[2].GuestLegend.skyTitle, /空/);
  assert.equal(locales[1].Wall.weekChipsKeys.includes("方向鍵"), true);
});
