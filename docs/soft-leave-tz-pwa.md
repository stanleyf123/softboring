# Soft leave, timezone, PWA install tip

Builds on merged PR #30 (mood palette, free JSON download, footer cluster). No Stripe or email work. Locales stay en / zh-tw / ja. Export, the mood legend, and gift codes stay as they are.

## Soft leave

Signed-in members can close the desk from Account. They type `Soft Boring` and the email on the account. The copy is a quiet goodbye, not a legal warning.

`POST /api/account/delete` then:

1. Opts the member’s notes off Soft Wall (`DELETE FROM wall_notes`). Comments, stickers, bookmarks, and flags on those notes follow the note.
2. Deletes the user row. SQLite foreign keys cascade the rest: reviews, sessions, settings, comments they left on other notes, invites, notifications, and so on.
3. Clears the session cookie.

Payment rows and redeemed gift codes stay, with the user id set to null. A neighbor’s own notes stay on the wall.

## Timezone

Account stores an IANA timezone on `user_settings.timezone`. The default is `Asia/Taipei`.

- Reminder weekday matching uses that zone. A Tuesday evening on the server can already be Wednesday in Taipei, and only Wednesday members there are due.
- The digest’s “this month” uses the same zone for both “now” and each review timestamp.
- The reminder cron still runs on the VPS clock. It does not move to each member’s midnight. It only evaluates the weekday after it wakes. See [DEPLOY-LINODE.md](../DEPLOY-LINODE.md).

## PWA install tip

On a phone, one calm tip appears when the browser fires `beforeinstallprompt`, or on iOS where Add to Home Screen is the way. Dismissing it (or adding the app) stores `softboring.pwaInstallTipDismissed` and does not ask again. Already-installed standalone windows stay quiet. Desktop does not show the tip.
