# Soft postcard, wall spotlight, week compare

No new environment variables. Stripe and email are not required.

## Soft postcard PNG

Soft+ can export one weekly review (history detail) or the current monthly digest as a shareable cream/blush PNG postcard. Rendering is client-side canvas — no new packages. Free and signed-out visitors do not see the export controls.

## Soft Wall weekly spotlight

Soft+ Soft Wall shows a gentle “this week’s soft picks” strip: currently pinned notes first, then high-praise visible notes, capped so it stays calm. Payloads use nicknames / local-part fallbacks — never emails. Free and signed-out visitors stay on the locked wall teaser; `GET /api/wall/spotlight` is Soft+ only.

## Review compare (`/[locale]/history/compare`)

Soft+ can pick two past reviews and see a soft side-by-side of feeling, energy, and drain. Linked from Soft+ history tools. Free and signed-out visitors see an upgrade teaser.
