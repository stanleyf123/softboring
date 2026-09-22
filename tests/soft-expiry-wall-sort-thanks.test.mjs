import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  daysUntilPlanExpiry,
  planExpiryPassed,
  planExpiryReminderDue,
  userIsSoftPlus,
} from "../src/lib/plan.ts";
import {
  DEFAULT_WALL_SORT,
  sortWallNotes,
  withSortStacking,
} from "../src/lib/wall-filters.ts";

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

test("gift Soft+ expiry helpers and account reminder stay calm", () => {
  assert.equal(planExpiryPassed("2099-01-01T00:00:00.000Z"), false);
  assert.equal(planExpiryPassed("2000-01-01T00:00:00.000Z"), true);

  const inThreeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const inThirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  assert.equal(planExpiryReminderDue(inThreeDays), true);
  assert.equal(planExpiryReminderDue(inThirtyDays), false);
  assert.equal(planExpiryReminderDue(null), false);
  assert.ok(daysUntilPlanExpiry(inThreeDays) <= 3);
  assert.ok(daysUntilPlanExpiry(inThreeDays) >= 2);

  assert.equal(
    userIsSoftPlus({ plan: "soft_plus", planStatus: "active", planExpiresAt: inThirtyDays }),
    true,
  );
  assert.equal(
    userIsSoftPlus({
      plan: "soft_plus",
      planStatus: "active",
      planExpiresAt: "2000-01-01T00:00:00.000Z",
    }),
    false,
  );

  const account = read("src/components/account-panel.tsx");
  assert.match(account, /planGiftExpiringSoon/);
  assert.match(account, /planExpiryReminderDue/);
  assert.match(account, /planGiftUntil/);

  const wallAccess = read("src/lib/wall-access.ts");
  assert.match(wallAccess, /userIsSoftPlus/);
  assert.doesNotMatch(wallAccess, /isSoftPlusPlan\(user\.plan, user\.planStatus\)/);
});

test("Soft Wall sort modes complement filters without moving corkboard x/y", () => {
  assert.equal(DEFAULT_WALL_SORT, "newest");
  const notes = [
    { id: "a", createdAt: "2026-01-01T00:00:00.000Z", praiseCount: 1, pinned: false, z: 1, x: 10 },
    { id: "b", createdAt: "2026-02-01T00:00:00.000Z", praiseCount: 5, pinned: false, z: 2, x: 20 },
    { id: "c", createdAt: "2026-03-01T00:00:00.000Z", praiseCount: 2, pinned: true, z: 3, x: 30 },
  ];

  assert.deepEqual(
    sortWallNotes(notes, "newest").map((n) => n.id),
    ["c", "b", "a"],
  );
  assert.deepEqual(
    sortWallNotes(notes, "most_praised").map((n) => n.id),
    ["b", "c", "a"],
  );
  assert.deepEqual(
    sortWallNotes(notes, "pinned_first").map((n) => n.id),
    ["c", "b", "a"],
  );

  const stacked = withSortStacking(sortWallNotes(notes, "most_praised"));
  assert.equal(stacked[0].id, "b");
  assert.equal(stacked[0].z, 3);
  assert.equal(stacked[0].x, 20);

  const filters = read("src/lib/wall-filters.ts");
  assert.match(filters, /sortWallNotes/);
  assert.match(filters, /most_praised/);
  assert.match(filters, /pinned_first/);

  const board = read("src/components/wall-board.tsx");
  assert.match(board, /sortWallNotes/);
  assert.match(board, /withSortStacking/);
  assert.match(board, /sortNewest/);
  assert.match(board, /sortMostPraised/);
  assert.match(board, /sortPinnedFirst/);
});

test("gift redeem lands on warm Soft+ thanks with soft next steps", () => {
  const account = read("src/components/account-panel.tsx");
  assert.match(account, /PLUS_THANKS_PATH/);
  assert.match(account, /from=gift/);
  assert.match(read("src/lib/thanks-path.ts"), /\/thanks\/plus/);

  const plus = read("src/app/[locale]/thanks/plus/page.tsx");
  assert.match(plus, /fromGift/);
  assert.match(plus, /giftTitle/);
  assert.match(plus, /href: "\/digest"/);
  assert.match(plus, /stepDigestTitle/);
  assert.match(plus, /userIsSoftPlus/);

  const thanksView = read("src/components/thanks-view.tsx");
  assert.match(thanksView, /\/digest/);

  const messages = ["en", "zh-tw", "ja"].map((locale) =>
    JSON.parse(read(`messages/${locale}.json`)),
  );
  const [en, zh, ja] = messages.map((item) => leafKeys(item));
  assert.deepEqual(en, zh);
  assert.deepEqual(en, ja);
  assert.ok(messages[0].Account.planGiftExpiringSoon);
  assert.ok(messages[0].Wall.sortNewest);
  assert.ok(messages[0].Thanks.giftTitle);
  assert.ok(messages[0].Thanks.stepDigestTitle);
  assert.match(messages[1].Account.planGiftExpiringSoon, /提醒|禮物/);
  assert.match(messages[2].Wall.sortPinnedFirst, /ピン/);
});

test("guidelines and gift wiring stay intact", () => {
  assert.match(read("src/app/[locale]/guidelines/page.tsx"), /Guidelines/);
  assert.match(read("src/db/gift-codes.ts"), /redeemGiftCode/);
  assert.match(read("src/components/account-panel.tsx"), /GiftRedeemCard/);
  assert.match(read("src/components/site-footer.tsx"), /guidelines/);
});
