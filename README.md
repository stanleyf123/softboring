# Soft Boring Weekly

A quiet weekly review. Once a week, answer six small questions. History is saved for later.

**Soft Boring** is a soft, quiet, boring-in-a-good-way productivity tool — not a Notion clone.

- Product: Soft Boring Weekly
- Domain: [softboring.com](https://softboring.com)
- Repo: [github.com/stanleyf123/softboring](https://github.com/stanleyf123/softboring)

Submitted reviews are stored in **SQLite** on the server. Drafts stay in the browser until you save. Production v1 lives on the **same Linode VPS as [99gold](https://github.com/stanleyf123/99gold)**, as a **separate site** (own directory, systemd unit, Nginx server, and SQLite file). See [DEPLOY-LINODE.md](./DEPLOY-LINODE.md).

## Accounts

Email + password on SQLite (bcrypt hashes, httpOnly session cookie). There is no OAuth, magic link, or email verification in v1.

| You are | Reviews belong to | History shows |
| --- | --- | --- |
| Logged in | `user_id` | That account only |
| Guest | `guest_id` cookie (`softboring_guest`) | This browser’s unclaimed guest reviews |

On login or register, guest reviews from **this browser cookie** are attached to the account (`user_id`) if they were still guest-owned. After that, log out and those reviews stay with the account — another browser cannot see them.

Pages:

- `/en/login` and `/zh-tw/login`
- `/en/register` and `/zh-tw/register`
- `/en/account` and `/zh-tw/account` (email, review count, log out)

The header shows **Log in** or **Account**. It never links to admin.

## Admin

`/admin` is a separate backend (not under public nav). Protect it with `ADMIN_TOKEN`:

1. Set `ADMIN_TOKEN` in `.env.local` or `/etc/softboring.env` (`openssl rand -hex 32`)
2. Open `/admin/login` and paste the token, **or** call admin APIs with `Authorization: Bearer <token>` or `x-admin-token`
3. Dashboard: user count and review count; lists of users and reviews; open a review; optional delete with confirm

Without a matching token the admin UI and `/api/admin/*` stay closed. Do not commit a real token.

Paid plans (Stripe), Google OAuth, and email verification are later.

## Locales

| Language | Locale | URL |
| --- | --- | --- |
| English (default) | `en` | `/en` |
| 繁體中文 | `zh-tw` | `/zh-tw` |

## Run locally

```bash
npm install
cp .env.example .env.local
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/en` or `/zh-tw`.

`npm run db:migrate` creates tables in `SQLITE_PATH` (default `./data/softboring.sqlite`). The app also applies the same schema on first database use, but run migrate after pull so the file exists before `next start`. After this auth change, migrate again so `users`, `sessions`, and `reviews.user_id` exist.

```bash
npm run build
npm start
```

`npm start` defaults to port 3000. On the VPS it must listen on `127.0.0.1:3001` so it does not collide with 99gold on 3000.

## Production (Linode VPS)

v1 hosting is **not Vercel-first**. Deploy next to 99gold on Linode Nanode (`172.237.11.195`): Nginx + systemd + Node 22, Soft Boring on port **3001**, SQLite path `/var/www/softboring/data/softboring.sqlite`.

Full steps, Nginx, systemd, DNS, Certbot, `ADMIN_TOKEN`: **[DEPLOY-LINODE.md](./DEPLOY-LINODE.md)**.

## Environment variables

Copy `.env.example` to `.env.local`.

- `SITE_URL` — public origin (`http://localhost:3000` locally, `https://softboring.com` in production)
- `SQLITE_PATH` — database file (local `./data/softboring.sqlite`; VPS `/var/www/softboring/data/softboring.sqlite`)
- `ADMIN_TOKEN` — long random string for `/admin` (generate with `openssl rand -hex 32`; never commit a real value)

Optional later phases (not needed to deploy v1):

- **Stripe** — free for 4 weeks of reviews; paid unlocks history and trends
- **OAuth / email verification** — password auth is enough for v1

Do not put real secrets in the repo.

## What's next

1. **Deploy** — same Linode VPS as 99gold, separate site (see [DEPLOY-LINODE.md](./DEPLOY-LINODE.md))
2. **Stripe** (optional) — connect the pricing teaser
3. Later still: OAuth, email reminders, charts

## Stack

Next.js App Router, TypeScript, Tailwind CSS, next-intl, better-sqlite3, bcryptjs. Production v1: Ubuntu + Node 22 + Nginx + systemd + local SQLite.
