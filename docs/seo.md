# SEO and Search Console

Public site: [https://softboring.com](https://softboring.com). Locales are `/en` (default), `/zh-tw`, and `/ja` (never `/zh-TW`).

This note is the operator checklist after deploy. Copy is bilingual in the app; admin stays 繁體中文 and is not indexed.

## After deploy

1. Confirm `SITE_URL=https://softboring.com` in `/etc/softboring.env` (no trailing slash). Canonicals, hreflang, sitemap, and OG URLs all use this.
2. Optional verification tags (rebuild after setting; empty means the meta tag is omitted):
   - `GOOGLE_SITE_VERIFICATION` — Search Console HTML-tag token
   - `BING_SITE_VERIFICATION` — Bing Webmaster `msvalidate.01` token
3. Open [Google Search Console](https://search.google.com/search-console), add the **URL-prefix** property `https://softboring.com/`, verify, then submit `https://softboring.com/sitemap.xml`.
4. Optional: [Bing Webmaster Tools](https://www.bing.com/webmasters) with the same sitemap.
5. Request indexing for the homepages first (`/en`, `/zh-tw`, `/ja`), then pricing and Soft Wall.

Do not invent review stars or aggregate ratings. JSON-LD is Organization / WebSite / SoftwareApplication with a Free offer only.

## Search Console URL checklist

Submit these as the public surface (hreflang `en`, `zh-TW`, `ja`, `x-default` → English):

| Page | English | 繁體中文 | 日本語 |
| --- | --- | --- | --- |
| Home | https://softboring.com/en | https://softboring.com/zh-tw | https://softboring.com/ja |
| Pricing | https://softboring.com/en/pricing | https://softboring.com/zh-tw/pricing | https://softboring.com/ja/pricing |
| Soft Wall | https://softboring.com/en/wall | https://softboring.com/zh-tw/wall | https://softboring.com/ja/wall |
| Review | https://softboring.com/en/review | https://softboring.com/zh-tw/review | https://softboring.com/ja/review |
| History | https://softboring.com/en/history | https://softboring.com/zh-tw/history | https://softboring.com/ja/history |
| Log in | https://softboring.com/en/login | https://softboring.com/zh-tw/login | https://softboring.com/ja/login |
| Register | https://softboring.com/en/register | https://softboring.com/zh-tw/register | https://softboring.com/ja/register |
| Privacy | https://softboring.com/en/privacy | https://softboring.com/zh-tw/privacy | https://softboring.com/ja/privacy |
| Terms | https://softboring.com/en/terms | https://softboring.com/zh-tw/terms | https://softboring.com/ja/terms |
| Guidelines | https://softboring.com/en/guidelines | https://softboring.com/zh-tw/guidelines | https://softboring.com/ja/guidelines |
| Digest | https://softboring.com/en/digest | https://softboring.com/zh-tw/digest | https://softboring.com/ja/digest |
| Soft year | https://softboring.com/en/year | https://softboring.com/zh-tw/year | https://softboring.com/ja/year |
| Thanks | https://softboring.com/en/thanks | https://softboring.com/zh-tw/thanks | https://softboring.com/ja/thanks |

Machine-readable:

- https://softboring.com/sitemap.xml
- https://softboring.com/robots.txt
- OG image (per locale): https://softboring.com/en/opengraph-image · https://softboring.com/zh-tw/opengraph-image · https://softboring.com/ja/opengraph-image

## Keep out of the index

`robots.txt` allows `/` and disallows `/admin`, `/api/`, and `/account`. Because locales are always prefixed, it also disallows `/en/account`, `/zh-tw/account`, and `/ja/account` (that covers `/account/activity` and `/account/snapshot`). The same list blocks welcome, invites, password reset, `/thanks/plus`, trends, saved wall notes, wall compliments, history export, and week compare. URL paths stay `en` / `zh-tw` / `ja` — never `zh-TW`.

Digest, soft year, and guidelines are public pages (a locked tease is fine for a crawler without a session) and belong in `sitemap.xml`. Do not submit account activity.

These routes also send `noindex` (or live under `/admin`):

- `/admin` and `/api/admin/*`
- `/en/account`, `/zh-tw/account`, `/ja/account` — including `/account/activity`
- `/en/welcome`, `/zh-tw/welcome`, `/ja/welcome` (post-register)
- `/en/thanks/plus`, `/zh-tw/thanks/plus`, `/ja/thanks/plus` (Soft+ checkout return)
- `/en/invite/*`, `/zh-tw/invite/*`, `/ja/invite/*` (redirects to register; `noindex`)
- History detail, export, forgot/reset password, trends

Google Analytics (`G-MFQ9J6B9DH`) stays on public locale pages only.

## Share cards

Default OG/Twitter cards come from `src/app/[locale]/opengraph-image.tsx` (cream / blush / peach / mint). After deploy, paste a URL into [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) or [Twitter Card Validator](https://cards-dev.twitter.com/validator) if a card looks stale.

## Thank-you paths (not for Search Console)

| After | Lands on |
| --- | --- |
| Email register | `/{locale}/welcome` |
| First-time Google / LINE | `/{locale}/welcome` |
| Returning OAuth / login | `/{locale}/account` (or `next`) |
| Soft+ Stripe Checkout success | `/{locale}/thanks/plus` |
| Campaign / footer 感謝 | `/{locale}/thanks` |

If Stripe is still unconfigured, `/thanks/plus` still exists; checkout buttons stay on the pricing page with the existing “payments not configured” note.
