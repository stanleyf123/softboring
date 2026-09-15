# Soft Boring Weekly

A quiet weekly review. Once a week, answer six small questions. History is saved for later.

**Soft Boring** is a soft, quiet, boring-in-a-good-way productivity tool — not a Notion clone.

- Product: Soft Boring Weekly
- Domain (later): [softboring.com](https://softboring.com)
- Repo: [github.com/stanleyf123/softboring](https://github.com/stanleyf123/softboring)

This repository is an MVP scaffold: the core loop works locally in the browser. Auth, database, and payments are stubbed for a later pass.

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

## Environment variables

Copy `.env.example` to `.env.local`. Nothing is required for this MVP — weekly reviews are stored in the browser with `localStorage`.

The names in `.env.example` are placeholders for later:

- **Supabase** — auth and persisted reviews
- **Stripe** — free for 4 weeks of reviews; paid unlocks history and trends

Do not put real secrets in the repo.

## What's next

1. **Supabase auth** — sign in, keep reviews on the server instead of this device
2. **Stripe** — connect the pricing teaser (first 4 weeks free; paid history + trends)
3. **Deploy** — Vercel, then point `softboring.com` at the deployment
4. Later still: email reminders, charts (out of scope for this scaffold)

## Stack

Next.js App Router, TypeScript, Tailwind CSS, next-intl.
