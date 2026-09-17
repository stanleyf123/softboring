# SEO and Search Console

Public site: [https://softboring.com](https://softboring.com). Locales are `/en` (default) and `/zh-tw` only (never `/zh-TW`).

This note is the operator checklist after deploy. Copy is bilingual in the app; admin stays 繁體中文 and is not indexed.

## After deploy

1. Confirm `SITE_URL=https://softboring.com` in `/etc/softboring.env` (no trailing slash). Canonicals, hreflang, sitemap, and OG URLs all use this.
2. Optional verification tags (rebuild after setting; empty means the meta tag is omitted):
   - `GOOGLE_SITE_VERIFICATION` — Search Console HTML-tag token
   - `BING_SITE_VERIFICATION` — Bing Webmaster `msvalidate.01` token
3. Open [Google Search Console](https://search.google.com/search-console), add the **URL-prefix** property `https://softboring.com/`, verify, then submit `https://softboring.com/sitemap.xml`.
4. Optional: [Bing Webmaster Tools](https://www.bing.com/webmasters) with the same sitemap.
5. Request indexing for the homepage pair first (`/en`, `/zh-tw`), then pricing and Soft Wall.

Do not invent review stars or aggregate ratings. JSON-LD is Organization / WebSite / SoftwareApplication with a Free offer only.

## Search Console URL checklist

Submit these as the public surface (hreflang pairs `en` ↔ `zh-TW`, `x-default` → English):

| Page | English | 繁體中文 |
| --- | --- | --- |
| Home | https://softboring.com/en | https://softboring.com/zh-tw |
| Pricing | https://softboring.com/en/pricing | https://softboring.com/zh-tw/pricing |
| Soft Wall | https://softboring.com/en/wall | https://softboring.com/zh-tw/wall |
| Review | https://softboring.com/en/review | https://softboring.com/zh-tw/review |
| History | https://softboring.com/en/history | https://softboring.com/zh-tw/history |
| Log in | https://softboring.com/en/login | https://softboring.com/zh-tw/login |
| Register | https://softboring.com/en/register | https://softboring.com/zh-tw/register |
| Privacy | https://softboring.com/en/privacy | https://softboring.com/zh-tw/privacy |
| Terms | https://softboring.com/en/terms | https://softboring.com/zh-tw/terms |
| Thanks | https://softboring.com/en/thanks | https://softboring.com/zh-tw/thanks |

Machine-readable:

- https://softboring.com/sitemap.xml
- https://softboring.com/robots.txt
- OG image (per locale): https://softboring.com/en/opengraph-image · https://softboring.com/zh-tw/opengraph-image

## Keep out of the index

`robots.txt` disallows `/admin`, `/api/`, and `/account`. These routes also send `noindex` (or live under `/admin`):

- `/admin` and `/api/admin/*`
- `/en/account`, `/zh-tw/account`
- `/en/welcome`, `/zh-tw/welcome` (post-register)
- `/en/thanks/plus`, `/zh-tw/thanks/plus` (Soft+ checkout return)
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
