# Soft engagement trio (in-app)

No new environment variables. Stripe and email are not required for these Soft+ surfaces.

## Soft Wall discovery filters

Soft+ members can filter the corkboard by feeling range (1–5) and/or search nickname / excerpt (and summary). Free and signed-out visitors still only see the locked teaser layout from `toTeaserNote` — filters do not appear, and teaser payloads still omit feeling and excerpt.

## Monthly digest (`/[locale]/digest`)

In-app Soft+ page with this calendar month’s review count, average feeling, energy/drain keyword themes, and weekly streak. Free users see an upgrade teaser. Linked from Soft+ nav, account, and trends. Account still shows the short “this month” card with a link to the full page.

## Seasonal question packs

Three built-in Soft+ packs (spring soft reset, rainy-week comfort, year-end gratitude) in `en` / `zh-tw` / `ja`:

- **Use as my custom questions** — saves the first three prompts via `PUT /api/account/custom-questions`
- **Try for this review** — swaps the six prompt labels for that session only; answers still save to the usual fields

Free users keep the default six `Questions.*` prompts. Pack UI lives on Soft+ account and review pages.
