import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import Database from "better-sqlite3";
import { giftExpiresAt, newGiftCode, normalizeGiftCode } from "../src/lib/gift-code.ts";
import { isSoftPlusPlan, planExpiryPassed } from "../src/lib/plan.ts";

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

test("guidelines page, footer, terms, and SEO path stay wired", () => {
  const page = read("src/app/[locale]/guidelines/page.tsx");
  assert.match(page, /namespace="Guidelines"/);
  assert.match(page, /path: "\/guidelines"/);

  const legal = read("src/components/legal-page.tsx");
  assert.match(legal, /"Privacy" \| "Terms" \| "Guidelines"/);
  assert.match(legal, /href="\/guidelines"/);
  assert.match(legal, /guidelinesLink/);

  const footer = read("src/components/site-footer.tsx");
  assert.match(footer, /href="\/guidelines"/);
  assert.match(footer, /t\("guidelines"\)/);

  const wall = read("src/components/wall-board.tsx");
  assert.match(wall, /href="\/guidelines"/);
  assert.match(wall, /guidelinesLink/);

  const seo = read("src/lib/seo.ts");
  assert.match(seo, /"\/guidelines"/);

  const messages = ["en", "zh-tw", "ja"].map((locale) =>
    JSON.parse(read(`messages/${locale}.json`)),
  );
  const [en, zh, ja] = messages.map((item) => leafKeys(item));
  assert.deepEqual(en, zh);
  assert.deepEqual(en, ja);
  assert.ok(messages[0].Guidelines.title);
  assert.ok(messages[0].Metadata.guidelinesTitle);
  assert.ok(messages[0].Footer.guidelines);
  assert.ok(messages[0].Terms.guidelinesLink);
  assert.match(messages[0].Guidelines.s1Body, /opt-in|private|pin/i);
  assert.match(messages[1].Guidelines.title, /禮儀/);
  assert.match(messages[2].Guidelines.title, /案内/);
});

test("Soft+ gift codes mint once and redeem for free users", () => {
  assert.equal(normalizeGiftCode("abcdefghjkm0"), null);
  assert.equal(normalizeGiftCode("abcdefghjkmi"), null);
  assert.equal(normalizeGiftCode(" ABCDEFGHJKM2 "), "abcdefghjkm2");
  const made = newGiftCode();
  assert.equal(normalizeGiftCode(made), made);
  assert.equal(made.length, 12);

  const future = giftExpiresAt(7, new Date("2026-01-01T00:00:00.000Z"));
  assert.equal(future, "2026-01-08T00:00:00.000Z");
  assert.equal(planExpiryPassed("2020-01-01T00:00:00.000Z"), true);
  assert.equal(isSoftPlusPlan("soft_plus", "active", "2099-01-01T00:00:00.000Z"), true);
  assert.equal(isSoftPlusPlan("soft_plus", "active", "2020-01-01T00:00:00.000Z"), false);

  const schema = read("scripts/schema.sql");
  assert.match(schema, /CREATE TABLE IF NOT EXISTS soft_plus_gift_codes/);
  assert.match(schema, /plan_expires_at/);

  const migrate = read("src/db/migrate.ts");
  assert.match(migrate, /ensureSoftPlusGiftCodes/);
  assert.match(migrate, /plan_expires_at/);

  const migrateCli = read("scripts/migrate.mjs");
  assert.match(migrateCli, /soft_plus_gift_codes/);
  assert.match(migrateCli, /plan_expires_at/);

  const adminApi = read("src/app/api/admin/gifts/route.ts");
  assert.match(adminApi, /mintGiftCode/);
  assert.match(adminApi, /isAdminRequest/);

  const redeemApi = read("src/app/api/account/gift-code/route.ts");
  assert.match(redeemApi, /redeemGiftCode/);
  assert.match(redeemApi, /getCurrentUser/);

  const adminPage = read("src/app/admin/gifts/page.tsx");
  assert.match(adminPage, /AdminGiftMintForm/);
  assert.match(adminPage, /listGiftCodes/);

  const adminCopy = read("src/lib/admin-copy.ts");
  assert.match(adminCopy, /gifts:/);
  assert.match(adminCopy, /Soft\+ 禮物碼/);

  const account = read("src/components/account-panel.tsx");
  assert.match(account, /GiftRedeemCard/);
  assert.match(account, /\/api\/account\/gift-code/);

  const dir = mkdtempSync(join(tmpdir(), "softboring-gifts-"));
  const dbPath = join(dir, "test.sqlite");
  try {
    const db = new Database(dbPath);
    db.exec(schema);
    db.prepare(
      `INSERT INTO users (id, email, password_hash, created_at, plan)
       VALUES ('u1', 'free@example.com', 'x', '2026-01-01T00:00:00.000Z', 'free')`,
    ).run();
    db.prepare(
      `INSERT INTO soft_plus_gift_codes
         (code, days, permanent, note, created_at, redeemed_at, redeemed_by)
       VALUES ('abcdefghjkm2', 30, 0, 'test', '2026-01-01T00:00:00.000Z', NULL, NULL)`,
    ).run();
    const unused = db
      .prepare(`SELECT COUNT(*) AS n FROM soft_plus_gift_codes WHERE redeemed_at IS NULL`)
      .get();
    assert.equal(unused.n, 1);
    db.prepare(
      `UPDATE soft_plus_gift_codes SET redeemed_at = ?, redeemed_by = ? WHERE code = ?`,
    ).run("2026-01-02T00:00:00.000Z", "u1", "abcdefghjkm2");
    const again = db
      .prepare(`SELECT redeemed_by FROM soft_plus_gift_codes WHERE code = ?`)
      .get("abcdefghjkm2");
    assert.equal(again.redeemed_by, "u1");
    db.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("homepage soft-stats strip stays calm and anonymous", () => {
  const home = read("src/app/[locale]/page.tsx");
  assert.match(home, /HomeSoftStats/);
  assert.match(home, /statsWallWeek/);

  const strip = read("src/components/soft-stats-strip.tsx");
  assert.match(strip, /publicSoftStats/);
  assert.match(strip, /wallNotesThisWeek/);

  const stats = read("src/db/soft-stats.ts");
  assert.match(stats, /hidden = 0/);
  assert.match(stats, /created_at >=/);
  assert.doesNotMatch(stats, /SELECT[^`]*email/i);
  assert.doesNotMatch(stats, /\bsummary\b/);
  assert.match(stats, /COUNT\(\*\)/);

  const en = JSON.parse(read("messages/en.json"));
  assert.match(en.Home.statsNote, /Quiet counts|no private/i);
  assert.ok(en.Home.statsLanguages);
});

test("hide-demo, shortcuts help, and soft memory stay wired", () => {
  const filters = read("src/lib/wall-filters.ts");
  assert.match(filters, /hideDemo/);
  assert.match(filters, /ownerIsDemo/);

  const wall = read("src/components/wall-board.tsx");
  assert.match(wall, /filterHideDemo/);
  assert.match(wall, /readHideDemoPreference/);

  const layout = read("src/app/[locale]/layout.tsx");
  assert.match(layout, /SoftShortcutsHelp/);

  const shortcuts = read("src/components/soft-shortcuts-help.tsx");
  assert.match(shortcuts, /quiet/i);
  assert.match(shortcuts, /Escape|escape/);

  const memory = read("src/lib/soft-memory.ts");
  assert.match(memory, /pickSoftMemory/);
  const home = read("src/app/[locale]/page.tsx");
  assert.match(home, /SoftMemoryCard/);
  assert.match(home, /pickSoftMemory/);
});
