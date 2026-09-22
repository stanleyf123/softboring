# Wall-note OG, review dots, gratitude card

No new environment variables. Stripe and email are not required.

## Soft Wall note previews

Sharing `/{locale}/wall?note={id}` (locales `en`, `zh-tw`, `ja`) uses a cream, blush, and mint image when that note is public. The picture is the same short excerpt already on the wall, plus a nickname when one is set. It does not include an email, user id, or review id. Hidden notes keep the usual Soft Wall card. The image lives at `/{locale}/og/note/{id}`. Canonical and sitemap stay on `/wall`.

## Review dots

The weekly form shows five quiet dots, one for each written prompt (energy, drain, less of, priorities, summary). A dot fills when that prompt has words. Feeling is a number, so it is not a dot. There is no score. Guests and Free see the same dots.

## Gratitude card

Soft+ can download `soft-boring-gratitude.png` after drawing a line. The card is that line, the Soft Boring name, and softboring.com. No name, date, or account field is painted, and nothing is emailed. Free and signed-out desks see an upgrade tease on the jar and on pricing.
