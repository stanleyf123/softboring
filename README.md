# Soft Boring Weekly

A quiet weekly review. Once a week, answer six small questions. History is saved for later.

**Soft Boring** is a soft, quiet, boring-in-a-good-way productivity tool — not a Notion clone.

- Product: Soft Boring Weekly
- Domain: [softboring.com](https://softboring.com)
- Repo: [github.com/stanleyf123/softboring](https://github.com/stanleyf123/softboring)

Submitted reviews are stored in **SQLite** on the server. Drafts stay in the browser until you save. Production v1 lives on the **same Linode VPS as [99gold](https://github.com/stanleyf123/99gold)**, as a **separate site** (own directory, systemd unit, Nginx server, and SQLite file). See [DEPLOY-LINODE.md](./DEPLOY-LINODE.md).

## Accounts

Email + password on SQLite (bcrypt hashes, httpOnly `softboring_session` cookie), plus optional **Google** and **LINE** login into the same membership. There is no email verification in v1. Password reset uses a one-hour token in SQLite. Admin (`/admin`) stays on `ADMIN_TOKEN` and does not use OAuth.

| You are | Reviews belong to | History shows |
| --- | --- | --- |
| Logged in | `user_id` | That account only |
| Guest | `guest_id` cookie (`softboring_guest`) | This browser’s unclaimed guest reviews |

On login, guest reviews from **this browser cookie** are attached to the account (`user_id`) if they were still guest-owned. On register (email or first-time Google / LINE), the same claim happens, then the app opens a welcome / thank-you page with next steps (first review, Soft Wall, nickname). After that, log out and those reviews stay with the account — another browser cannot see them.

Pages:

- `/en/login` and `/zh-tw/login`
- `/en/register` and `/zh-tw/register`
- `/en/forgot-password` and `/zh-tw/forgot-password`
- `/en/reset-password` and `/zh-tw/reset-password`
- `/en/privacy` and `/zh-tw/privacy`
- `/en/terms` and `/zh-tw/terms`
- `/en/thanks` and `/zh-tw/thanks` (short thank-you, also linked from the footer)
- `/en/welcome` and `/zh-tw/welcome` (after register / first-time OAuth; `noindex`)
- `/en/thanks/plus` and `/zh-tw/thanks/plus` (Soft+ checkout return; `noindex`)
- `/en/account` and `/zh-tw/account` (plan badge, review count, upgrade, weekly reminder)
- `/en/pricing` and `/zh-tw/pricing`
- `/en/trends` and `/zh-tw/trends` (Soft+)
- `/en/digest` and `/zh-tw/digest` (Soft+ monthly digest, in-app)
- `/en/history/compare` and `/zh-tw/history/compare` (Soft+ side-by-side weeks)
- `/en/wall` and `/zh-tw/wall` (Soft Wall / 軟軟牆)
- `/en/wall/saved` and `/zh-tw/wall/saved` (Soft+ private Soft Wall bookmarks)

The same routes exist under `/ja` (日本語), including `/ja/invite/[code]` which redirects into register.

The header shows **Pricing**, **Soft Wall**, plus **Log in** or **Account** (and an inbox bell when signed in). It never links to admin. On small screens, member areas (home / review / history / wall / account) use a bottom nav; desktop keeps the top nav.

Password reset: `POST /api/auth/forgot-password` always creates a hashed token when the email exists. If `RESEND_API_KEY` or `SMTP_HOST` is set, it sends the link. If email is not configured, the UI says so (without revealing whether the address has an account beyond that server-level message) and the reset URL is printed only in the server log. `POST /api/auth/reset-password` consumes a valid unused token.

Login, register, forgot-password, and OAuth start/callback are **rate-limited** by IP (and email where it applies) in SQLite (`rate_limits`). Too many tries return HTTP 429 or send you back to login with a calm message. No extra env is required.

The public app is installable as a **PWA** (`/manifest.webmanifest`, icons under `/icons/`, service worker `/sw.js`). The worker does not cache `/api/*` or `/admin`, so sessions stay on the network.

SEO: unique titles/descriptions, canonicals, and `hreflang` (`en` / `zh-TW` / `ja` / `x-default`) on public pages; `/sitemap.xml` and `/robots.txt` (allow public, disallow `/admin`, `/api/`, `/account`). JSON-LD is Organization / WebSite / SoftwareApplication with no invented ratings. Optional `GOOGLE_SITE_VERIFICATION` / `BING_SITE_VERIFICATION`. Operator checklist: [docs/seo.md](./docs/seo.md). Japanese and invites: [docs/ja-and-invites.md](./docs/ja-and-invites.md). Soft Wall filters, monthly digest, seasonal packs: [docs/engagement-trio.md](./docs/engagement-trio.md). Soft year, wall compliments, mid-week notes: [docs/soft-year-activity-notes.md](./docs/soft-year-activity-notes.md). Soft postcard, wall spotlight, week compare: [docs/soft-postcard-spotlight-compare.md](./docs/soft-postcard-spotlight-compare.md). Soft intention, sticker pocket UX, Soft Wall a11y: [docs/soft-intention-wall-a11y.md](./docs/soft-intention-wall-a11y.md). Soft bookmarks, empty-state illustrations, Soft tips inbox: [docs/soft-bookmarks-empty-tips.md](./docs/soft-bookmarks-empty-tips.md). Soft print week, wall color preference, onboarding checklist: [docs/soft-print-wall-color-checklist.md](./docs/soft-print-wall-color-checklist.md). Soft memory resurfacing, quiet writing, Soft Wall flags: [docs/soft-memory-quiet-wall-report.md](./docs/soft-memory-quiet-wall-report.md).

Weekly reminders: on the account page, toggle a weekday. Cron later with `npm run reminders:dispatch` (selects due users; **no-op success** if email env is missing). See [DEPLOY-LINODE.md](./DEPLOY-LINODE.md).

## Plans

| Plan | Write reviews | History | Trends | Soft Wall |
| --- | --- | --- | --- | --- |
| **Free** (and guests) | Yes (+ private mid-week soft note and soft weekly intention when signed in) | Latest **4** reviews stay open; older ones show a Soft+ prompt | Locked (year / digest teasers) | Locked teaser (no other people's text) |
| **Soft+** | Yes | Unlimited, search, export CSV/PDF, soft postcard PNG + print-this-week PDF, compare weeks, custom questions, monthly digest, soft year, soft memory resurfacing | Feeling 1–5 over time, plus a gentle weekly streak | Full access: read, drag, comment, one-level replies, stickers, badge, pin, preferred note color, private bookmarks (`/wall/saved`), compliments feed, weekly soft picks, quiet “this feels off” flags |

Guests can try 1–4 reviews in the browser. After the first save, the app nudges them to register so the paid path is clear. Registering as Free still caps visible history at four; Soft+ is the unlock.

Plan is stored on the user row (`plan`, `plan_status`, Stripe ids). Soft+ is active when `plan` is `soft_plus` and status is empty, `active`, `trialing`, or `past_due`.

## Stripe (Soft+)

Checkout is **Stripe Checkout** (subscription). The customer portal is for manage/cancel. The app never fakes a successful payment: if Stripe env is missing, pricing and upgrade still look complete but buttons say payments are not configured.

### 1. Create the product and prices

In [Stripe Dashboard](https://dashboard.stripe.com) (test mode first):

1. Create a product named **Soft+**.
2. Add a **recurring monthly** price. Copy the price id (`price_...`) into `STRIPE_PRICE_MONTHLY`.
3. Optionally add a **recurring yearly** price and set `STRIPE_PRICE_YEARLY`.
4. Copy the secret key (`sk_test_...` or `sk_live_...`) into `STRIPE_SECRET_KEY`.
5. `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is optional. Checkout sessions are created on the server.

### 2. Webhook

Endpoint URL (production):

`https://softboring.com/api/stripe/webhook`

Listen to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`
- `charge.refunded`

Copy the signing secret (`whsec_...`) into `STRIPE_WEBHOOK_SECRET`.

Local forwarding:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

The handler reads the **raw request body** to verify the signature. Default nginx `proxy_pass` is enough; do not add a body-rewriting filter in front of `/api/stripe/webhook`.

After a successful checkout, Stripe returns to `/{locale}/thanks/plus`. The webhook writes `plan`, `plan_status`, `stripe_customer_id`, and `stripe_subscription_id` on the user, and inserts a row in `payments` (subscription or sticker). Later `invoice.paid` events add renewals (deduped by payment intent / checkout session / invoice id when present). Refunds and failed invoices update status. If Stripe env is missing, `/admin/payments` still loads with an empty state, and `/thanks/plus` still exists for the return path.

### 3. Environment

Set these in `.env.local` or `/etc/softboring.env` (never commit real values):

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_MONTHLY`
- `STRIPE_PRICE_YEARLY` (optional)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (optional)

Checkout is treated as configured only when the first three are non-empty.

## Soft Wall

`/en/wall` and `/zh-tw/wall` (UI: **Soft Wall** / **軟軟牆**) is an opt-in sticky-note corkboard.

- Sharing is off by default. From a saved review (History, or right after save), a signed-in user can pin that week to the wall.
- **Free / logged-out** visitors see a locked teaser: positions and colors only. Review text and comments are omitted by the API, not just blurred in CSS.
- **Soft+** can read shared notes, drag them (x/y/z persist for everyone), comment, leave **one-level replies**, and buy/place stickers. Each placed sticker increments praise.
- Stickers are a Stripe **one-time** Checkout (`mode: payment`). The webhook `checkout.session.completed` grants inventory. If Stripe env is missing, the catalog still renders and purchase returns `not_configured`, same as Soft+ subscriptions.
- Optional price IDs: `STRIPE_PRICE_STICKER_PACK` and `STRIPE_PRICE_STICKER_<SLUG>` (star, heart, sprout, tea, moon, cloud, peach, sparkle). If unset, Checkout uses `price_data` from the catalog cents in SQLite.
- Admin: `/admin/wall` can hide a note (`hidden`). Soft+ neighbors can leave a quiet “this feels off” flag (`wall_note_flags`); flagged notes sort first in admin. Hidden notes drop off the public board.
- Commenting notifies the note owner in the signed-in inbox (bell). A reply also notifies the parent comment author. Own comments do not.
- **Demo Soft+ bots** (optional): ten `@softboring.demo` accounts can seed the wall and post a few zh-TW notes each day. See [docs/demo-bots.md](./docs/demo-bots.md).

After pull, run `npm run db:migrate` so wall tables, comment `parent_id`, `preferred_wall_color`, `wall_note_flags`, soft notes / intentions / bookmarks, the eight seed stickers, `rate_limits`, `oauth_accounts`, and nullable `users.password_hash` exist.

## Admin

`/admin` is a separate backend (not under public nav). The visible UI is **繁體中文**. Protect it with `ADMIN_TOKEN`:

1. Set `ADMIN_TOKEN` in `.env.local` or `/etc/softboring.env` (`openssl rand -hex 32`)
2. Open `/admin/login` and paste the token, **or** call admin APIs with `Authorization: Bearer <token>` or `x-admin-token`
3. Dashboard: member / Soft+ / Free / review / wall counts, plus successful payment count and revenue when `payments` rows exist; simple charts for signups over the last 8 weeks and the Soft+ vs Free mix
4. **Members** (`/admin/members`, formerly Users): email, plan, Stripe ids, review/wall counts, last active; open a member for reviews, wall notes, payment history, and confirmed plan changes (Grant Soft+ / Set Free, optionally clearing Stripe ids). Password hashes are never shown. `/admin/users` redirects here.
5. **Payments** (`/admin/payments`): filter by kind, status, or email; each row can link to the member
6. Open a review or hide a wall note; optional delete with confirm

Without a matching token the admin UI and `/api/admin/*` stay closed. Do not commit a real token.

Password reset and optional weekly reminder email use `RESEND_API_KEY` or SMTP when set. Google / LINE login is optional; see below.

## Locales

| Language | Locale | URL |
| --- | --- | --- |
| English (default) | `en` | `/en` |
| 繁體中文 | `zh-tw` | `/zh-tw` |
| 日本語 | `ja` | `/ja` |

Use `/zh-tw` only (not `/zh-TW`). Japanese is `/ja`. See [docs/ja-and-invites.md](./docs/ja-and-invites.md).

## Run locally

```bash
npm install
cp .env.example .env.local
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/en`, `/zh-tw`, or `/ja`.

`npm run db:migrate` creates tables in `SQLITE_PATH` (default `./data/softboring.sqlite`). The app also applies the same schema on first database use, but run migrate after pull so the file exists before `next start`. After this change, migrate again so `oauth_accounts` exists and `users.password_hash` can be null for OAuth-only members. Older billing columns on `users` (`plan`, `stripe_customer_id`, …) are still added if missing.

```bash
npm run build
npm test
npm start
```

`npm start` defaults to port 3000. On the VPS it must listen on `127.0.0.1:3001` so it does not collide with 99gold on 3000.

## Production (Linode VPS)

v1 hosting is **not Vercel-first**. Deploy next to 99gold on Linode Nanode (`172.237.11.195`): Nginx + systemd + Node 22, Soft Boring on port **3001**, SQLite path `/var/www/softboring/data/softboring.sqlite`.

Full steps, Nginx, systemd, DNS, Certbot, `ADMIN_TOKEN`, Stripe env: **[DEPLOY-LINODE.md](./DEPLOY-LINODE.md)**.

## Environment variables

Copy `.env.example` to `.env.local`.

- `SITE_URL` — public origin (`http://localhost:3000` locally, `https://softboring.com` in production)
- `GOOGLE_SITE_VERIFICATION` — optional Search Console HTML-tag token (omitted from metadata when empty)
- `BING_SITE_VERIFICATION` — optional Bing Webmaster `msvalidate.01` token
- `SQLITE_PATH` — database file (local `./data/softboring.sqlite`; VPS `/var/www/softboring/data/softboring.sqlite`)
- `ADMIN_TOKEN` — long random string for `/admin` (generate with `openssl rand -hex 32`; never commit a real value)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY` — required together to enable checkout
- `STRIPE_PRICE_YEARLY` — optional yearly price
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — optional
- `STRIPE_PRICE_STICKER_PACK` / `STRIPE_PRICE_STICKER_<SLUG>` — optional one-time sticker prices; unset is fine (catalog cents via `price_data`)
- `NEXT_PUBLIC_GA_MEASUREMENT_ID` — Google Analytics measurement ID (defaults to `G-MFQ9J6B9DH` if unset; inlined at `next build`)
- `EMAIL_FROM` — from-address for reset and reminder mail (optional default is `Soft Boring Weekly <noreply@softboring.com>`)
- `RESEND_API_KEY` — preferred mail provider
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_SECURE` — optional SMTP, same idea as 99gold
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google Login (both required to enable the Google button)
- `LINE_CHANNEL_ID` / `LINE_CHANNEL_SECRET` — LINE Login (both required to enable the LINE button)

Do not put real secrets in the repo.

## Google and LINE login

Same `softboring_session` cookie as email login. OAuth users start as **Free** (`users.plan = free`), like email signup. Soft+ stays on `plan` / `plan_status`. Guest reviews are claimed on first OAuth sign-in, same as password login.

If a credential pair is missing, that button is **disabled** with a calm note. Email/password still works. The app does not crash.

### Callback URLs

Built from `SITE_URL` (no trailing slash):

| Provider | Path |
| --- | --- |
| Google | `{SITE_URL}/api/auth/oauth/google/callback` |
| LINE | `{SITE_URL}/api/auth/oauth/line/callback` |

Production:

- `https://softboring.com/api/auth/oauth/google/callback`
- `https://softboring.com/api/auth/oauth/line/callback`

Local:

- `http://localhost:3000/api/auth/oauth/google/callback`
- `http://localhost:3000/api/auth/oauth/line/callback`

Start URLs (the login buttons hit these):

- `https://softboring.com/api/auth/oauth/google`
- `https://softboring.com/api/auth/oauth/line`

`next` / `returnTo` query params are honored if they are already a safe in-app path (never `/admin`). After success the app redirects to `/{locale}{path}` (locales are `en` / `zh-tw` / `ja`). A first-time Google or LINE account can also redeem `invite` from that start URL.

### Google Cloud Console

1. APIs & Services → Credentials → Create **OAuth client ID** → **Web application**.
2. Authorized JavaScript origins: `https://softboring.com` (and `http://localhost:3000` for local).
3. Authorized redirect URIs: the Google callback URL above (production and/or local).
4. Scopes: `openid`, `email`, `profile`.
5. Copy the client id and secret into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

### LINE Developers

1. Create a **LINE Login** channel (web app).
2. Callback URL: the LINE callback URL above.
3. Scopes: `profile`, `openid`, and `email` if available (users may decline email).
4. Copy Channel ID and Channel secret into `LINE_CHANNEL_ID` and `LINE_CHANNEL_SECRET`.

### Account linking

- If this Google/LINE **subject id** is already in `oauth_accounts`, sign in as that user. Never move the subject onto a different account.
- Else if the provider gives a **verified email** that already has a user, attach this provider to that user — unless the user already has a *different* subject for the same provider (that is a conflict; we do not hijack).
- Else create a new Free user. LINE without email uses a unique synthetic address (`line.{subject}@oauth.softboring.invalid`) so `users.email` stays unique.
- OAuth-only users have `password_hash` NULL. Password login will not match them until they set a password (forgot-password works when they have a real email).

CSRF: start sets an httpOnly `softboring_oauth` cookie (HMAC-signed state, nonce, PKCE verifier). The callback checks `state` and nonce. Rate limits use the existing `rate_limits` table (`oauth` action).

## What's next

1. **Deploy** — same Linode VPS as 99gold, separate site (see [DEPLOY-LINODE.md](./DEPLOY-LINODE.md))
2. **Stripe live keys** — create the Soft+ product, set env, add the webhook
3. **Google / LINE credentials** — set the callback URLs, then the env pairs above
4. Later still: richer email templates

Weekly reminder cron (after email is configured):

```bash
npm run reminders:dispatch
```

Demo Soft Wall accounts (optional, after migrate):

```bash
npm run demo:seed    # 10 Soft+ @softboring.demo users + wall notes (idempotent)
npm run demo:daily   # 3–5 fresh zh-TW notes; safe twice the same Taipei day
npm run demo:purge   # delete only those demo users
```

Cron example and password: [docs/demo-bots.md](./docs/demo-bots.md).

## Stack

Next.js App Router, TypeScript, Tailwind CSS, next-intl, better-sqlite3, bcryptjs, Stripe. Production v1: Ubuntu + Node 22 + Nginx + systemd + local SQLite.
