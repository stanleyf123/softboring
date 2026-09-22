# Soft year, wall compliments, mid-week notes

No new environment variables. Stripe and email are not required.

## Soft year (`/[locale]/year`)

Soft+ year-at-a-glance: one feeling dot per ISO week, clickable into `/history/[id]`. Free and signed-out visitors see an upgrade teaser with a soft blurred preview. Linked from Soft+ nav, account, trends, and digest.

## Soft Wall compliments

Soft+ members see a gentle activity strip on Soft Wall (recent stickers, comments, and one-level replies on visible notes). A fuller list lives at `/[locale]/wall/activity`. Payloads use nicknames / local-part fallbacks — never email addresses. Free and signed-out visitors stay on the usual locked wall teaser; the activity API returns Soft+ only.

## Private mid-week soft note

Signed-in members (Free or Soft+) can save one short private note for the current ISO week from the review page (`soft_notes` table, unique per user + week). Empty save clears it. Notes stay private — not on Soft Wall. Guests see a soft login nudge.
