# Guidelines, Soft+ gift codes, homepage soft-stats

Builds on merged PR #27 (streak polish, hide-demo, shortcuts). No Stripe/email work.

## Soft Wall guidelines

- Public `/[locale]/guidelines` — soft etiquette (opt-in share, kindness, no spam).
- Linked from site footer (including Soft Wall), Terms, and Soft Wall header.
- Locales: en / zh-tw / ja.

## Admin Soft+ gift codes

- `/admin/gifts` (Traditional Chinese admin UI) mints one-time codes: N days or permanent.
- Free signed-in members redeem on Account (`POST /api/account/gift-code`).
- SQLite `soft_plus_gift_codes` + `users.plan_expires_at` for day-limited Soft+.
- Admin table is the audit log (unused / redeemed by whom).

## Homepage soft-stats

- Calm strip under the hero: visible Soft Wall notes this week + languages supported.
- Counts only — no note bodies or identities.
