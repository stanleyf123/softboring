# Soft Boring Weekly

A quiet weekly review. Once a week, answer six small questions. History is saved for later.

**Soft Boring** is a soft, quiet, boring-in-a-good-way productivity tool — not a Notion clone.

- Product: Soft Boring Weekly
- Domain: [softboring.com](https://softboring.com)
- Repo: [github.com/stanleyf123/softboring](https://github.com/stanleyf123/softboring)

This repository is an MVP scaffold: the core loop works locally in the browser (`localStorage`). Auth and a server database are not wired yet. Production v1 is meant to live on the **same Linode VPS as [99gold](https://github.com/stanleyf123/99gold)**, as a **separate site** (own directory, systemd unit, Nginx server, and SQLite file). See [DEPLOY-LINODE.md](./DEPLOY-LINODE.md).

## Locales

| Language | Locale | URL |
| --- | --- | --- |
| English (default) | `en` | `/en` |
| 繁體中文 | `zh-TW` | `/zh-tw` |

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/en` or `/zh-tw`.

```bash
npm run build
npm start
```

`npm start` defaults to port 3000. On the VPS it must listen on `127.0.0.1:3001` so it does not collide with 99gold on 3000.

## Production (Linode VPS)

v1 hosting is **not Vercel-first**. Deploy next to 99gold on Linode Nanode (`172.237.11.195`): Nginx + systemd + Node 22, Soft Boring on port **3001**, SQLite path `/var/www/softboring/data/softboring.sqlite` when persistence is added.

Full steps, Nginx, systemd, DNS, and Certbot: **[DEPLOY-LINODE.md](./DEPLOY-LINODE.md)**.

## Environment variables

Copy `.env.example` to `.env.local`. Nothing is required for this MVP — weekly reviews are stored in the browser with `localStorage`.

Names that match the VPS plan (documented now, SQLite not wired in code yet):

- `SITE_URL` — public origin (`http://localhost:3000` locally, `https://softboring.com` in production)
- `SQLITE_PATH` — intended database file (local `./data/softboring.sqlite`; VPS `/var/www/softboring/data/softboring.sqlite`)

Optional later phases (not needed to deploy v1):

- **Supabase** — hosted auth/db if we ever move off the VPS SQLite path
- **Stripe** — free for 4 weeks of reviews; paid unlocks history and trends

Do not put real secrets in the repo.

## What's next

1. **Deploy** — same Linode VPS as 99gold, separate site (see [DEPLOY-LINODE.md](./DEPLOY-LINODE.md))
2. **SQLite on the VPS** — persist reviews at `SQLITE_PATH` instead of only this device
3. **Stripe** (optional) — connect the pricing teaser
4. Later still: email reminders, charts (out of scope for this scaffold)

## Stack

Next.js App Router, TypeScript, Tailwind CSS, next-intl. Production v1: Ubuntu + Node 22 + Nginx + systemd + (planned) local SQLite.
