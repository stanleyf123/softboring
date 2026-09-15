# Soft Boring Weekly

A quiet weekly review. Once a week, answer six small questions. History is saved for later.

**Soft Boring** is a soft, quiet, boring-in-a-good-way productivity tool — not a Notion clone.

- Product: Soft Boring Weekly
- Domain: [softboring.com](https://softboring.com)
- Repo: [github.com/stanleyf123/softboring](https://github.com/stanleyf123/softboring)

Submitted reviews are stored in **SQLite** on the server. Drafts stay in the browser until you save. Production v1 lives on the **same Linode VPS as [99gold](https://github.com/stanleyf123/99gold)**, as a **separate site** (own directory, systemd unit, Nginx server, and SQLite file). See [DEPLOY-LINODE.md](./DEPLOY-LINODE.md).

## Accounts

Email + password on SQLite (bcrypt hashes, httpOnly session cookie). There is no OAuth or email verification in v1. Password reset uses a one-hour token in SQLite.

| You are | Reviews belong to | History shows |
| --- | --- | --- |
| Logged in | `user_id` | That account only |
| Guest | `guest_id` cookie (`softboring_guest`) | This browser’s unclaimed guest reviews |

On login or register, guest reviews from **this browser cookie** are attached to the account (`user_id`) if they were still guest-owned. After that, log out and those reviews stay with the account — another browser cannot see them.

Pages:

- `/en/login` and `/zh-tw/login`
- `/en/register` and `/zh-tw/register`
- `/en/forgot-password` and `/zh-tw/forgot-password`
- `/en/reset-password` and `/zh-tw/reset-password`
- `/en/privacy` and `/zh-tw/privacy`
- `/en/terms` and `/zh-tw/terms`
- `/en/account` and `/zh-tw/account` (plan badge, review count, upgrade, weekly reminder)
- `/en/pricing` and `/zh-tw/pricing`
- `/en/trends` and `/zh-tw/trends` (Soft+)
- `/en/wall` and `/zh-tw/wall` (Soft Wall / 軟軟牆)

The header shows **Pricing**, **Soft Wall**, plus **Log in** or **Account** (and an inbox bell when signed in). It never links to admin.

Password reset: `POST /api/auth/forgot-password` always creates a hashed token when the email exists. If `RESEND_API_KEY` or `SMTP_HOST` is set, it sends the link. If email is not configured, the UI says so (without revealing whether the address has an account beyond that server-level message) and the reset URL is printed only in the server log. `POST /api/auth/reset-password` consumes a valid unused token.

Weekly reminders: on the account page, toggle a weekday. Cron later with `npm run reminders:dispatch` (selects due users; **no-op success** if email env is missing). See [DEPLOY-LINODE.md](./DEPLOY-LINODE.md).

## Plans

| Plan | Write reviews | History | Trends | Soft Wall |
| --- | --- | --- | --- | --- |
| **Free** (and guests) | Yes | Latest **4** reviews stay open; older ones show a Soft+ prompt | Locked | Locked teaser (no other people's text) |
| **Soft+** | Yes | Unlimited | Feeling 1–5 over time | Read, drag, comment, stickers |

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

After a successful checkout, the webhook writes `plan`, `plan_status`, `stripe_customer_id`, and `stripe_subscription_id` on the user, and inserts a row in `payments` (subscription or sticker). Later `invoice.paid` events add renewals (deduped by payment intent / checkout session / invoice id when present). Refunds and failed invoices update status. If Stripe env is missing, `/admin/payments` still loads with an empty state.

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
- **Soft+** can read shared notes, drag them (x/y/z persist for everyone), comment, and buy/place stickers. Each placed sticker increments praise.
- Stickers are a Stripe **one-time** Checkout (`mode: payment`). The webhook `checkout.session.completed` grants inventory. If Stripe env is missing, the catalog still renders and purchase returns `not_configured`, same as Soft+ subscriptions.
- Optional price IDs: `STRIPE_PRICE_STICKER_PACK` and `STRIPE_PRICE_STICKER_<SLUG>` (star, heart, sprout, tea, moon, cloud, peach, sparkle). If unset, Checkout uses `price_data` from the catalog cents in SQLite.
- Admin: `/admin/wall` can hide a note (`hidden`). Hidden notes drop off the public board.
- Commenting notifies the note owner in the signed-in inbox (bell). Own comments do not.

After pull, run `npm run db:migrate` so wall tables and the eight seed stickers exist.

## Admin

`/admin` is a separate backend (not under public nav). The visible UI is **繁體中文**. Protect it with `ADMIN_TOKEN`:

1. Set `ADMIN_TOKEN` in `.env.local` or `/etc/softboring.env` (`openssl rand -hex 32`)
2. Open `/admin/login` and paste the token, **or** call admin APIs with `Authorization: Bearer <token>` or `x-admin-token`
3. Dashboard: member / Soft+ / Free / review / wall counts, plus successful payment count and revenue when `payments` rows exist
4. **Members** (`/admin/members`, formerly Users): email, plan, Stripe ids, review/wall counts, last active; open a member for reviews, wall notes, payment history, and confirmed plan changes (Grant Soft+ / Set Free, optionally clearing Stripe ids). Password hashes are never shown. `/admin/users` redirects here.
5. **Payments** (`/admin/payments`): filter by kind, status, or email; each row can link to the member
6. Open a review or hide a wall note; optional delete with confirm

Without a matching token the admin UI and `/api/admin/*` stay closed. Do not commit a real token.

OAuth and email verification are later. Password reset and optional weekly reminder email use `RESEND_API_KEY` or SMTP when set.

## Locales

| Language | Locale | URL |
| --- | --- | --- |
| English (default) | `en` | `/en` |
| 繁體中文 | `zh-tw` | `/zh-tw` |

Use `/zh-tw` only (not `/zh-TW`).

## Run locally

```bash
npm install
cp .env.example .env.local
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/en` or `/zh-tw`.

`npm run db:migrate` creates tables in `SQLITE_PATH` (default `./data/softboring.sqlite`). The app also applies the same schema on first database use, but run migrate after pull so the file exists before `next start`. After this change, migrate again so the `payments` table exists (membership admin and billing history). Older billing columns on `users` (`plan`, `stripe_customer_id`, …) are still added if missing.

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

Do not put real secrets in the repo.

## What's next

1. **Deploy** — same Linode VPS as 99gold, separate site (see [DEPLOY-LINODE.md](./DEPLOY-LINODE.md))
2. **Stripe live keys** — create the Soft+ product, set env, add the webhook
3. Later still: OAuth, richer email templates

Weekly reminder cron (after email is configured):

```bash
npm run reminders:dispatch
```

## Stack

Next.js App Router, TypeScript, Tailwind CSS, next-intl, better-sqlite3, bcryptjs, Stripe. Production v1: Ubuntu + Node 22 + Nginx + systemd + local SQLite.
