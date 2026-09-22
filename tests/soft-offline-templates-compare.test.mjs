import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const {
  BACK_ONLINE_MS,
  initialOfflinePhase,
  nextOfflinePhase,
  offlineBannerMotion,
} = await import("../src/lib/soft-offline.ts");
const {
  SOFT_TEMPLATE_FIELDS,
  SOFT_TEMPLATE_IDS,
  applySoftTemplate,
  isSoftTemplateId,
  templateInsertNote,
} = await import("../src/lib/soft-templates.ts");
const {
  compareBridge,
  compareCardWash,
  feelingMarks,
  fieldPresence,
} = await import("../src/lib/history-compare.ts");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

test("offline banner speaks only when the device actually drops", () => {
  assert.equal(initialOfflinePhase(true), "hidden");
  assert.equal(initialOfflinePhase(false), "offline");
  assert.equal(nextOfflinePhase("hidden", true), "hidden");
  assert.equal(nextOfflinePhase("hidden", false), "offline");
  assert.equal(nextOfflinePhase("offline", true), "back");
  assert.equal(nextOfflinePhase("back", true), "back");
  assert.equal(nextOfflinePhase("back", false), "offline");
  assert.equal(offlineBannerMotion(true), "still");
  assert.equal(offlineBannerMotion(false), "move");
  assert.equal(BACK_ONLINE_MS > 1000, true);

  const banner = read("src/components/soft-offline-banner.tsx");
  const layout = read("src/app/[locale]/layout.tsx");
  const css = read("src/app/globals.css");
  const motionBlock = css.slice(css.lastIndexOf("prefers-reduced-motion: reduce"));
  assert.match(layout, /SoftOfflineBanner/);
  assert.match(banner, /data-soft-offline=/);
  assert.match(banner, /offlineBannerMotion/);
  assert.match(banner, /navigator\.onLine/);
  assert.match(banner, /print:hidden/);
  assert.doesNotMatch(banner, /stripe|resend|nodemailer|sendMail|fetch\(/i);
  assert.match(motionBlock, /\.soft-offline-banner/);
  assert.match(motionBlock, /animation: none !important/);
  assert.match(css, /@keyframes soft-offline-in/);
});

test("soft templates fill empty lines and keep words already written", () => {
  assert.equal(SOFT_TEMPLATE_IDS.length >= 3 && SOFT_TEMPLATE_IDS.length <= 5, true);
  assert.deepEqual(isSoftTemplateId("quiet"), true);
  assert.equal(isSoftTemplateId("loud"), false);

  const blank = {
    energy: "",
    drain: "   ",
    lessOf: "",
    priorities: "",
    summary: "",
  };
  const lines = {
    energy: "A little energy.",
    drain: "Just the hum.",
    lessOf: "Less rushing.",
    priorities: "One small thing.",
    summary: "A quiet week.",
  };
  const filled = applySoftTemplate(blank, lines);
  assert.deepEqual(filled.filled, [...SOFT_TEMPLATE_FIELDS]);
  assert.deepEqual(filled.kept, []);
  assert.equal(filled.answers.energy, "A little energy.");
  assert.equal(templateInsertNote(filled.filled.length, filled.kept.length), "filled");

  const kept = applySoftTemplate(
    { ...blank, energy: "My own words", summary: "Already here" },
    lines,
  );
  assert.equal(kept.answers.energy, "My own words");
  assert.equal(kept.answers.summary, "Already here");
  assert.equal(kept.answers.drain, "Just the hum.");
  assert.deepEqual(kept.kept, ["energy", "summary"]);
  assert.equal(templateInsertNote(kept.filled.length, kept.kept.length), "partial");
  assert.equal(templateInsertNote(0, 2), "kept");
  assert.deepEqual(applySoftTemplate(null, { energy: "  " }).answers.energy, "");

  const form = read("src/components/review-form.tsx");
  const panel = read("src/components/soft-templates.tsx");
  assert.match(form, /<SoftTemplates/);
  assert.match(form, /softPlus \? \(/);
  assert.match(panel, /data-soft-templates="open"/);
  assert.match(panel, /data-soft-template=/);
  assert.match(panel, /applySoftTemplate/);
  assert.doesNotMatch(panel, /softPlus|stripe|resend|sendMail|fetch\(/i);
  assert.doesNotMatch(read("src/lib/soft-templates.ts"), /stripe|resend|sendMail/i);
});

test("week compare uses cream cards and a free tease", () => {
  assert.equal(compareCardWash("left"), "cream");
  assert.equal(compareCardWash("right"), "blush");
  assert.deepEqual(feelingMarks(3), ["on", "on", "on", "off", "off"]);
  assert.deepEqual(feelingMarks(null), ["off", "off", "off", "off", "off"]);
  assert.deepEqual(feelingMarks(0), ["off", "off", "off", "off", "off"]);
  assert.deepEqual(feelingMarks(9), ["off", "off", "off", "off", "off"]);
  assert.equal(fieldPresence("a", "b"), "both");
  assert.equal(fieldPresence("a", "  "), "left");
  assert.equal(fieldPresence("", "b"), "right");
  assert.equal(fieldPresence(null, undefined), "neither");
  assert.equal(compareBridge(2, true), "up");
  assert.equal(compareBridge(-1, true), "down");
  assert.equal(compareBridge(0, true), "same");
  assert.equal(compareBridge(null, true), "missing");
  assert.equal(compareBridge(2, false), "waiting");

  const page = read("src/app/[locale]/history/compare/page.tsx");
  const panel = read("src/components/history-compare.tsx");
  const list = read("src/components/history-list.tsx");
  assert.match(page, /user && softPlus \?/);
  assert.match(page, /CompareUpgradeTease/);
  assert.match(page, /userIsSoftPlus/);
  assert.match(panel, /data-compare-card=\{wash\}/);
  assert.match(panel, /data-compare-bridge=/);
  assert.match(panel, /data-compare-tease="open"/);
  assert.match(panel, /data-compare-ghost="cream"/);
  assert.match(panel, /bg-cream/);
  assert.match(panel, /feelingMarks/);
  assert.match(list, /data-compare-history-tease="open"/);
  assert.match(list, /!access\.softPlus/);
  assert.match(list, /\/history\/compare/);
  assert.doesNotMatch(panel, /stripe|resend|sendMail/i);
});

test("offline templates compare i18n exists in en zh-tw ja", () => {
  for (const locale of ["en", "zh-tw", "ja"]) {
    const messages = readJson(`messages/${locale}.json`);
    assert.equal(messages.SoftOffline?.offlineTitle?.length > 0, true);
    assert.equal(messages.SoftOffline?.backTitle?.length > 0, true);
    assert.equal(messages.SoftOffline?.dismiss?.length > 0, true);
    assert.equal(messages.SoftTemplates?.title?.length > 0, true);
    for (const id of SOFT_TEMPLATE_IDS) {
      const pack = messages.SoftTemplates?.[id];
      assert.equal(pack?.name?.length > 0, true);
      for (const field of SOFT_TEMPLATE_FIELDS) {
        assert.equal(pack?.[field]?.trim().length > 0, true, `${locale} ${id}.${field}`);
      }
    }
    assert.equal(messages.HistoryCompare?.creamNote?.length > 0, true);
    assert.equal(messages.HistoryCompare?.teaseSketch?.length > 0, true);
    assert.equal(messages.HistoryCompare?.bridgeTitle?.length > 0, true);
    assert.equal(messages.History?.compareTeaseTitle?.length > 0, true);
    assert.equal(messages.History?.compareTeaseBody?.length > 0, true);
    assert.equal(messages.History?.compareWeeks?.length > 0, true);
    const raw = read(`messages/${locale}.json`);
    assert.equal(raw.includes('"/zh-TW'), false);
  }
});

test("docs mention the trio without Stripe or email sending", () => {
  const docs = read("docs/soft-offline-templates-compare.md");
  const readme = read("README.md");
  assert.match(docs, /offline banner/i);
  assert.match(docs, /empty lines/i);
  assert.match(docs, /history\/compare/);
  assert.match(docs, /No new environment variables/);
  assert.match(docs, /Stripe and email are not required/);
  assert.match(readme, /soft-offline-templates-compare/);
  assert.match(readme, /offline banner/i);
  assert.doesNotMatch(docs, /zh-TW\//);
});

test("copy link, reduced motion, and streak protect stay wired", () => {
  assert.match(read("src/components/soft-copy-link.tsx"), /data-soft-copy-toast="open"/);
  assert.match(read("src/lib/reduced-motion.ts"), /decorativeMotion/);
  assert.match(read("src/components/streak-protect-chip.tsx"), /StreakProtect/);
  assert.match(read("src/app/[locale]/review/page.tsx"), /StreakProtectChip/);
});
