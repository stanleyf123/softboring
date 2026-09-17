import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function messages() {
  return {
    en: JSON.parse(read("messages/en.json")),
    zh: JSON.parse(read("messages/zh-tw.json")),
  };
}

test("sitemap lists public locale URLs and skips admin", () => {
  const sitemap = read("src/app/sitemap.ts");
  assert.match(sitemap, /PUBLIC_SEO_PATHS/);
  assert.match(sitemap, /hreflangLanguages/);
  assert.doesNotMatch(sitemap, /\/admin/);

  const seo = read("src/lib/seo.ts");
  for (const path of [
    "/",
    "/pricing",
    "/wall",
    "/review",
    "/history",
    "/login",
    "/register",
    "/privacy",
    "/terms",
    "/thanks",
  ]) {
    assert.ok(seo.includes(`"${path}"`), `missing sitemap path ${path}`);
  }
  assert.doesNotMatch(seo, /\/welcome"/);
  assert.doesNotMatch(seo, /\/thanks\/plus/);
});

test("robots allows public pages and disallows admin plus private APIs", () => {
  const robots = read("src/app/robots.ts");
  assert.match(robots, /allow: "\/"/);
  assert.match(robots, /\/admin/);
  assert.match(robots, /\/api\//);
  assert.match(robots, /\/account/);
  assert.match(robots, /sitemap\.xml/);
});

test("page metadata has unique titles, hreflang, and SITE_URL canonicals", () => {
  const seo = read("src/lib/seo.ts");
  assert.match(seo, /x-default/);
  assert.match(seo, /zh-TW/);
  assert.match(seo, /canonical/);
  assert.match(seo, /opengraph-image/);
  assert.match(seo, /summary_large_image/);
  assert.match(seo, /GOOGLE_SITE_VERIFICATION/);
  assert.match(seo, /BING_SITE_VERIFICATION/);
  assert.match(seo, /msvalidate\.01/);
  assert.doesNotMatch(seo, /aggregateRating/);
  assert.match(seo, /SoftwareApplication/);
  assert.match(seo, /Organization/);
  assert.match(seo, /WebSite/);
  assert.match(seo, /price: "0"/);

  const { en, zh } = messages();
  const keys = [
    "homeTitle",
    "pricingTitle",
    "wallTitle",
    "reviewTitle",
    "historyTitle",
    "loginTitle",
    "registerTitle",
    "privacyTitle",
    "termsTitle",
    "thanksTitle",
  ];
  const enTitles = new Set(keys.map((key) => en.Metadata[key]));
  const zhTitles = new Set(keys.map((key) => zh.Metadata[key]));
  assert.equal(enTitles.size, keys.length, "English metadata titles should be unique");
  assert.equal(zhTitles.size, keys.length, "zh-tw metadata titles should be unique");
  assert.equal(en.Metadata.homeTitle.includes("Soft Boring"), true);
  assert.ok(zh.Metadata.wallTitle.includes("軟軟牆"));
  assert.notEqual(en.Metadata.homeDescription, en.Metadata.pricingDescription);
  assert.notEqual(zh.Metadata.reviewDescription, zh.Metadata.historyDescription);
});

test("JSON-LD and OG image exist without fake ratings", () => {
  assert.equal(existsSync(join(root, "src/components/json-ld.tsx")), true);
  assert.equal(existsSync(join(root, "src/app/[locale]/opengraph-image.tsx")), true);
  const layout = read("src/app/[locale]/layout.tsx");
  assert.match(layout, /SiteJsonLd/);
  assert.match(layout, /verificationMetadata/);
  assert.match(layout, /skipToContent/);
  assert.match(layout, /id="main-content"/);
  assert.doesNotMatch(layout, /path: "\/"/);
  const jsonLd = read("src/components/json-ld.tsx");
  assert.doesNotMatch(jsonLd, /aggregateRating/);
  const og = read("src/app/[locale]/opengraph-image.tsx");
  assert.match(og, /#f6ebe3/);
  assert.match(og, /#f4d4c6/);
  assert.match(og, /softboring\.com/);
});

test("homepage keeps a single h1 and section landmarks", () => {
  const home = read("src/app/[locale]/page.tsx");
  const h1s = home.match(/<h1\b/g) || [];
  assert.equal(h1s.length, 1);
  assert.match(home, /id="home-title"/);
  assert.match(home, /aria-labelledby="home-title"/);
  assert.match(home, /aria-labelledby="home-sample"/);
  assert.match(home, /ideasLabel/);
});

test("thank-you and welcome flows are wired for register, OAuth, and Soft+", () => {
  assert.equal(existsSync(join(root, "src/app/[locale]/thanks/page.tsx")), true);
  assert.equal(existsSync(join(root, "src/app/[locale]/welcome/page.tsx")), true);
  assert.equal(existsSync(join(root, "src/app/[locale]/thanks/plus/page.tsx")), true);

  const form = read("src/components/auth-form.tsx");
  assert.match(form, /registerSuccessPath/);
  assert.match(form, /mode === "register"/);

  const checkout = read("src/app/api/stripe/checkout/route.ts");
  assert.match(checkout, /PLUS_THANKS_PATH/);
  assert.doesNotMatch(checkout, /account\?checkout=success/);

  const oauthDb = read("src/db/oauth.ts");
  assert.match(oauthDb, /created: boolean/);
  assert.match(oauthDb, /created: true/);
  assert.match(oauthDb, /created: false/);

  const callback = read("src/app/api/auth/oauth/[provider]/callback/route.ts");
  assert.match(callback, /oauthPostAuthPath/);
  assert.match(callback, /created/);

  const thanksPath = read("src/lib/thanks-path.ts");
  assert.match(thanksPath, /\/welcome/);
  assert.match(thanksPath, /\/thanks\/plus/);
  assert.match(thanksPath, /created/);

  const footer = read("src/components/site-footer.tsx");
  assert.match(footer, /thanksLink/);
  assert.match(footer, /href="\/thanks"/);

  const { en, zh } = messages();
  assert.ok(en.Footer.thanks.toLowerCase().includes("thank"));
  assert.ok(zh.Footer.thanks.includes("謝謝"));
  assert.equal(en.Thanks.campaignTitle.includes("Thank you"), true);
  assert.ok(zh.Thanks.welcomeTitle.includes("桌子"));
  assert.ok(en.Thanks.plusPending.includes("Stripe"));
  assert.ok(zh.Thanks.stepNicknameCta.length > 0);
});

test("ops note and env placeholders exist for Search Console", () => {
  assert.equal(existsSync(join(root, "docs/seo.md")), true);
  const docs = read("docs/seo.md");
  assert.match(docs, /softboring\.com\/sitemap\.xml/);
  assert.match(docs, /softboring\.com\/en\/thanks/);
  assert.match(docs, /GOOGLE_SITE_VERIFICATION/);
  assert.match(docs, /Search Console/);

  const env = read(".env.example");
  assert.match(env, /GOOGLE_SITE_VERIFICATION=/);
  assert.match(env, /BING_SITE_VERIFICATION=/);

  const readme = read("README.md");
  assert.match(readme, /\/thanks/);
  assert.match(readme, /docs\/seo\.md/);
});
