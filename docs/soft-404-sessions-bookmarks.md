# Soft 404, signed-in desks, bookmark ids

No new environment variables. Stripe and email are not required.

## A cream page for missing addresses

Unknown pages inside `en`, `zh-tw`, and `ja` show a short cream card: a CSS teacup, a sentence that the address wandered off, and links home and to Soft Wall. A catch-all under the locale sends those missing paths to that card. The root not-found page uses the same illustration and only those locale prefixes. Motion on the teacup stops when reduced motion is requested.

## Signed-in desks

The account page counts open rows in `sessions` (not expired) and says whether the newest one started today, this week, or earlier. It does not list browsers, places, exact times, or session ids. If the table is missing or empty, the card keeps a short tip: this browser is signed in, and other desks leave on their own.

## Bookmark ids

Soft+ can download `soft-boring-bookmarks.json` from saved Soft Wall notes. The file holds bookmark ids, when each was saved, and collection id plus name when a note sits in a pile. Note text stays out. Free and signed-out desks see an upgrade tease. Nothing is emailed.
