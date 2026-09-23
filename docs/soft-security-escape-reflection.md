# Quiet headers, Soft Wall Escape, checklist JSON

No new environment variables. Stripe and email are not required.

## Quiet browser headers

Every response from `next.config` sends the same short list: a narrow Content-Security-Policy (`base-uri`, `object-src`, `frame-ancestors`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`, and a Permissions-Policy that leaves camera, microphone, and geolocation off.

The guidelines page (`/[locale]/guidelines`, anchor `#quiet-headers`) prints those names and values from the same module, in en / zh-tw / ja. Script and style policies stay open so the night-mode snippet and optional analytics can still load. Nothing on that note starts a payment or an email.

## Escape on Soft Wall

Escape still closes an open note or the sticker shop. If neither is open, and you are not typing, Escape folds a sticky that hover or keyboard focus has opened. The note stays folded until the pointer leaves it, or focus returns to a readable note. The inbox bell also closes on Escape, and steps aside when a modal is already open.

## Soft checklist in the weekly JSON

`GET /api/account/export` is unchanged for Free: the latest four open reviews, and no `reflections` key. Soft+ receives the same review download plus `reflections`, newest ISO week first, with the three optional marks (`noticed`, `unfinished`, `kind`). Empty weeks are omitted. The file is not emailed.

Free sees the tease on the checklist card, on History, and on the account download note. Soft+ can download from the checklist card and from History.
