# Analytics note, wall batches, digest months

No new environment variables. Stripe and email are not required. Nothing new is tracked.

## Cookie-free analytics note

The footer says public pages may include Google Analytics (`G-MFQ9J6B9DH`, or `NEXT_PUBLIC_GA_MEASUREMENT_ID` when that is set). The sentence is optional trust copy: Soft Boring still works if the script never runs, and the note itself does not set a cookie. The existing public-page script is unchanged. `/admin` stays uninstrumented.

## Soft Wall batches

The corkboard still loads the notes search and filters already use. It paints 24 at a time. “Show a few more” adds the next 24 in place, so earlier notes do not jump. New notes fade in unless motion is reduced. A shared `?note=` link still reveals that note. Free and Soft+ use the same batching; blurred teasers stay blurred.

## Earlier digest months

Soft+ sees past months on `/digest`: how many reviews, and the average feeling. Opening a month shows that month’s in-app digest in the member’s timezone. The current month stays the default. An empty list is a quiet card, not an error. Free and signed-out desks see an upgrade tease with no month names and no counts. Nothing is emailed.
