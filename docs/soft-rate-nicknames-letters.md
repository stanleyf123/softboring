# Soft rate toasts, public nicknames, letters to a past week

No new environment variables. Stripe and email are not required.

## A cream pause when the wall is busy

Quote cards and neighbor echoes already answer a crowded minute with HTTP 429. That response, and any other Soft Wall response with status 429 or `rate_limited`, opens one cream toast: a short rest, then try again. It uses `role="status"`, not an alert, and the motion stops when reduced motion is requested. The inline sharp error stays off for that case. Free and Soft+ see the same toast.

## Recent public nicknames

The homepage shows up to eight nicknames from people who left a visible Soft Wall note. The query reads `users.nickname` only. Blanks, repeats, and anything with `@` stay off the strip. There is no email, no note text, and no account id. If nobody has chosen a nickname yet, the strip says the wall is still quiet.

## A letter to an earlier week

Soft+ can keep one short letter (280 characters) on a review from a previous ISO week, in the member’s timezone. History links each open week to that letter. The same page lists letters already kept. This week cannot hold one — it is still this week. Free and signed-out desks see an upgrade tease. The letter is not emailed, not added to the review download, and not shown on Soft Wall.
