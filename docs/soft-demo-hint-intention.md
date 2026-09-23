# Demo neighbors, a long-field hint, earlier intentions

No new environment variables. Stripe and email are not required. SQLite is unchanged.

## Demo neighbor badge

Soft Wall notes from `@softboring.demo` (or `users.is_demo`) wear a cream **demo neighbor** badge. Guests and Free see it on the locked corkboard, on the public spotlight card, and in a short legend when any loaded note is a demo. Soft+ sees the same badge on the sticky and inside the open note. The badge is a boolean — emails stay off the public payload. Hiding demo notes is still a Soft+ filter.

## Gentle length hint

Each review field, including a Soft+ custom question, shows a quiet line once it reaches 400 characters. The field stays open and the review can still be saved. Nothing is emailed, and there is no new hard stop in the form.

## Earlier soft intentions

This week’s soft intention stays free for signed-in members. Soft+ also sees a private list of earlier weeks (up to 24), newest first, on the review page and on Account. Free and guests see the upgrade tease. `GET` and `PUT /api/soft-intentions` return `history: null` and `historyLocked: true` unless the desk is Soft+. The sentences are not emailed, and Soft Wall never sees them.
