import assert from "node:assert/strict";
import { register } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

register("./alias-hook.mjs", import.meta.url);

const { PUBLIC_SEO_PATHS } = await import("../src/lib/seo.ts");
const {
  indexableSeoPaths,
  isBlockedSitemapPath,
  localePrivateDisallow,
  publicSitemapUrls,
  sitemapPriority,
} = await import("../src/lib/seo-index.ts");
const {
  GUEST_SPOTLIGHT_INTERVAL_MS,
  pickRotatingSpotlight,
  rotatingSpotlightIndex,
  toPublicSpotlightCard,
} = await import("../src/lib/wall-spotlight.ts");
const { activityExportBody, activityExportPayload, ACTIVITY_EXPORT_FILENAME } = await import(
  "../src/lib/activity-export.ts"
);

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

test("sitemap keeps digest, year, and guidelines, and drops private desks", () => {
  for (const path of ["/digest", "/year", "/guidelines", "/wall", "/thanks"]) {
    assert.equal(PUBLIC_SEO_PATHS.includes(path), true, path);
    assert.equal(isBlockedSitemapPath(path), false, path);
  }

  assert.equal(isBlockedSitemapPath("/account"), true);
  assert.equal(isBlockedSitemapPath("/account/activity"), true);
  assert.equal(isBlockedSitemapPath("/zh-tw/account/activity"), true);
  assert.equal(isBlockedSitemapPath("/en/welcome"), true);
  assert.equal(isBlockedSitemapPath("/ja/thanks/plus"), true);
  assert.equal(isBlockedSitemapPath("/zh-TW/wall"), true);
  assert.equal(isBlockedSitemapPath("/wall/activity"), true);
  assert.equal(isBlockedSitemapPath("/history/compare"), true);

  const listed = indexableSeoPaths([
    ...PUBLIC_SEO_PATHS,
    "/account/activity",
    "/zh-TW/digest",
  ]);
  assert.equal(listed.includes("/digest"), true);
  assert.equal(listed.includes("/year"), true);
  assert.equal(listed.includes("/guidelines"), true);
  assert.equal(listed.includes("/account/activity"), false);
  assert.equal(listed.includes("/zh-TW/digest"), false);
  assert.equal(sitemapPriority("/digest"), 0.7);
  assert.equal(sitemapPriority("/guidelines"), 0.7);

  const urls = publicSitemapUrls("https://softboring.com");
  assert.ok(urls.includes("https://softboring.com/en/digest"));
  assert.ok(urls.includes("https://softboring.com/zh-tw/year"));
  assert.ok(urls.includes("https://softboring.com/ja/guidelines"));
  assert.equal(urls.some((url) => url.includes("/zh-TW")), false);
  assert.equal(urls.some((url) => url.includes("/account")), false);
  assert.equal(urls.some((url) => url.includes("/admin")), false);

  const sitemap = read("src/app/sitemap.ts");
  assert.match(sitemap, /indexableSeoPaths\(PUBLIC_SEO_PATHS\)/);
  assert.doesNotMatch(sitemap, /\/account\/activity/);

  const digest = read("src/app/[locale]/digest/page.tsx");
  const year = read("src/app/[locale]/year/page.tsx");
  const activity = read("src/app/[locale]/account/activity/page.tsx");
  assert.doesNotMatch(digest, /noIndex:\s*true/);
  assert.doesNotMatch(year, /noIndex:\s*true/);
  assert.match(activity, /noIndex:\s*true/);
  assert.match(activity, /path: "\/account\/activity"/);
});

test("robots blocks locale-prefixed private URLs and leaves public pages open", () => {
  const robots = read("src/app/robots.ts");
  assert.match(robots, /allow: "\/"/);
  assert.match(robots, /\/admin/);
  assert.match(robots, /\/api\//);
  assert.match(robots, /\/account/);
  assert.match(robots, /sitemap\.xml/);
  assert.match(robots, /localePrivateDisallow/);

  const disallow = localePrivateDisallow(["/admin", "/api/", "/account"]);
  for (const path of [
    "/admin",
    "/api/",
    "/account",
    "/en/account",
    "/zh-tw/account/activity",
    "/ja/account/snapshot",
    "/en/welcome",
    "/zh-tw/thanks/plus",
    "/ja/invite",
    "/en/wall/saved",
    "/zh-tw/wall/activity",
    "/ja/history/export",
  ]) {
    assert.equal(disallow.includes(path), true, path);
  }
  for (const path of ["/en/digest", "/zh-tw/year", "/ja/guidelines", "/en/wall", "/ja/thanks"]) {
    assert.equal(disallow.includes(path), false, path);
  }
  assert.equal(disallow.some((path) => path.includes("zh-TW")), false);
});

test("guest spotlight rotates one public card and strips email fields", () => {
  const notes = [
    { id: "a" },
    { id: "b" },
    { id: "c" },
  ];
  assert.equal(rotatingSpotlightIndex(0, 50_000), 0);
  assert.equal(rotatingSpotlightIndex(3, 0), 0);
  assert.equal(rotatingSpotlightIndex(3, GUEST_SPOTLIGHT_INTERVAL_MS), 1);
  assert.equal(rotatingSpotlightIndex(3, GUEST_SPOTLIGHT_INTERVAL_MS * 3), 0);
  assert.equal(pickRotatingSpotlight(notes, GUEST_SPOTLIGHT_INTERVAL_MS * 2)?.id, "c");
  assert.equal(pickRotatingSpotlight([], 10), null);

  const card = toPublicSpotlightCard({
    noteId: "note-1",
    excerpt: "tea on the desk",
    praiseCount: 2,
    pinned: true,
    feeling: 4,
    ownerNickname: "Moss",
    ownerFallback: "moss",
    reason: "pinned",
    ownerEmail: "secret@example.com",
  });
  assert.equal(card.excerpt, "tea on the desk");
  assert.equal(Object.hasOwn(card, "ownerEmail"), false);
  assert.equal(JSON.stringify(card).includes("secret@"), false);
  assert.equal(JSON.stringify(card).includes("example.com"), false);

  const guest = read("src/app/api/wall/spotlight/guest/route.ts");
  const plus = read("src/app/api/wall/spotlight/route.ts");
  const cardUi = read("src/components/guest-wall-spotlight.tsx");
  const board = read("src/components/wall-board.tsx");
  assert.match(guest, /listWallSpotlight/);
  assert.match(guest, /toPublicSpotlightCard/);
  assert.doesNotMatch(guest, /requireSoftPlus/);
  assert.match(plus, /requireSoftPlus/);
  assert.match(cardUi, /\/api\/wall\/spotlight\/guest/);
  assert.match(cardUi, /usePrefersReducedMotion/);
  assert.match(cardUi, /GUEST_SPOTLIGHT_INTERVAL_MS/);
  assert.match(cardUi, /data-guest-spotlight/);
  assert.match(board, /GuestWallSpotlight/);
  assert.match(board, /guestSpotlight/);
  assert.match(board, /locked \?/);
  assert.match(board, /WallSpotlightStrip/);
  assert.match(read("src/app/[locale]/wall/page.tsx"), /listWallSpotlight/);
  assert.match(read("src/app/[locale]/wall/page.tsx"), /toPublicSpotlightCard/);
});

test("soft activity JSON is Soft+ only and omits emails", () => {
  const items = [
    {
      id: "review:rev-me:2026-09-20T01:00:00.000Z",
      kind: "review",
      createdAt: "2026-09-20T01:00:00.000Z",
      excerpt: "tea on the desk",
      href: "/history/rev-me",
      email: "secret@example.com",
    },
    {
      id: "thanks:note-other:2026-09-22T03:00:00.000Z",
      kind: "thanks",
      createdAt: "2026-09-22T03:00:00.000Z",
      excerpt: "",
      href: "/wall?note=note-other",
    },
  ];
  const payload = activityExportPayload(items, "2026-09-22T10:00:00.000Z");
  assert.equal(payload.kind, "softboring-activity");
  assert.equal(payload.plan, "soft_plus");
  assert.equal(payload.count, 2);
  assert.deepEqual(Object.keys(payload.items[0]).sort(), [
    "createdAt",
    "excerpt",
    "href",
    "id",
    "kind",
  ]);
  assert.equal(JSON.stringify(payload).includes("secret@"), false);
  assert.equal(JSON.stringify(payload).includes("email"), false);
  assert.match(activityExportBody(items, "2026-09-22T10:00:00.000Z"), /\n$/);
  assert.equal(ACTIVITY_EXPORT_FILENAME, "soft-boring-activity.json");

  const route = read("src/app/api/account/activity/export/route.ts");
  const readRoute = read("src/app/api/account/activity/route.ts");
  const panel = read("src/components/soft-activity-export.tsx");
  const page = read("src/app/[locale]/account/activity/page.tsx");
  const pricing = read("src/components/pricing-view.tsx");
  assert.match(route, /requireSoftPlus/);
  assert.match(route, /activityExportBody/);
  assert.match(route, /ACTIVITY_EXPORT_FILENAME/);
  assert.doesNotMatch(route, /stripe|RESEND|SMTP/i);
  assert.doesNotMatch(readRoute, /requireSoftPlus/);
  assert.match(panel, /data-activity-export="tease"/);
  assert.match(panel, /data-activity-export="download"/);
  assert.match(panel, /\/api\/account\/activity\/export/);
  assert.match(panel, /\/pricing/);
  assert.match(page, /listOwnSoftActivity\(user\.id\)/);
  assert.match(page, /noIndex:\s*true/);
  assert.match(pricing, /featureActivityExportFree/);
  assert.match(pricing, /featureActivityExportPlus/);
});

test("sitemap spotlight activity copy exists in en zh-tw ja", () => {
  const guestKeys = [
    "title",
    "lead",
    "loading",
    "empty",
    "next",
    "nextAria",
    "plusHint",
    "plusCta",
  ];
  const exportKeys = ["exportTitle", "exportBody", "exportCta", "exportTeaseTitle", "exportTeaseBody", "exportTeaseCta"];
  for (const locale of ["en", "zh-tw", "ja"]) {
    const messages = readJson(`messages/${locale}.json`);
    for (const key of guestKeys) {
      assert.equal(typeof messages.GuestSpotlight[key], "string", `${locale} ${key}`);
      assert.ok(messages.GuestSpotlight[key].length > 0);
    }
    for (const key of exportKeys) {
      assert.equal(typeof messages.SoftActivity[key], "string", `${locale} ${key}`);
    }
    assert.equal(typeof messages.Pricing.featureActivityExportFree, "string");
    assert.equal(typeof messages.Pricing.featureActivityExportPlus, "string");
  }
  assert.match(readJson("messages/zh-tw.json").GuestSpotlight.title, /便利貼/);
  assert.match(readJson("messages/ja.json").SoftActivity.exportTeaseBody, /メールは送りません/);
  assert.match(readJson("messages/en.json").Pricing.featureActivityExportPlus, /JSON/);
});

test("docs describe sitemap spotlight and activity export without Stripe or email", () => {
  const docs = read("docs/soft-sitemap-spotlight-activity.md");
  const readme = read("README.md");
  const seo = read("docs/seo.md");
  assert.match(docs, /No new environment variables/);
  assert.match(docs, /\/account\/activity/);
  assert.match(docs, /spotlight\/guest/);
  assert.match(docs, /soft-boring-activity\.json/);
  assert.match(docs, /prefers-reduced-motion/);
  assert.match(readme, /soft-sitemap-spotlight-activity/);
  assert.match(seo, /softboring\.com\/en\/digest/);
  assert.match(seo, /softboring\.com\/zh-tw\/year/);
  assert.match(seo, /account\/activity/);
  assert.doesNotMatch(docs, /zh-TW\//);
});
