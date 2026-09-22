# Sitemap, guest spotlight, activity JSON

No new environment variables. Stripe and email are not required.

## Sitemap and robots

`sitemap.xml` lists public locale URLs for home, pricing, wall, review, history, login, register, privacy, terms, guidelines, thanks, digest, and soft year. Hreflang stays `en` / `zh-TW` / `ja` / `x-default`, while the path segment stays `zh-tw`.

`/account/activity` is a personal desk. It stays `noindex`, out of the sitemap, and behind locale-prefixed `/account` rules in `robots.txt`. Digest and soft year are public product pages: a crawler without a session sees the locked tease, not someone else’s weeks.

## Guest wall spotlight

Free and signed-out Soft Wall shows one public note at a time. The pool reuses the weekly spotlight (pinned notes, then high praise) and never includes an email field. The first card is drawn with the page. It rests, then moves to the next note. `prefers-reduced-motion` keeps that note still; a button can still ask for another. Soft+ keeps the existing row of soft picks. `GET /api/wall/spotlight` stays Soft+ only. Guests use `GET /api/wall/spotlight/guest` when the page did not already include a pick.

## Soft activity JSON

Signed-in members can still read `/account/activity` for free. Soft+ can download that same line as `soft-boring-activity.json` (`GET /api/account/activity/export`). Free members see an upgrade tease on the page and on pricing. The file is weeks, pins, and thank-yous already on the desk — no email addresses, and nothing is sent.
