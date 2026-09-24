# Cream wall skeletons, timezone confirm, intention JSON

No new environment variables. Stripe and email are not required. SQLite is unchanged.

## Cream Soft Wall skeletons

The first paint of Soft Wall is a cream placeholder: a short title wash and three cream cards with blush, peach, and mint bars. Guests and members see it while the corkboard loads, instead of an empty board. The pulse stops when the visitor prefers reduced motion. Free.

## Timezone change confirm

Choosing another timezone on Account does not save immediately. A soft confirm names the new clock and reminds that weekday reminders and the monthly digest follow it. “This clock is right” saves. “Stay with the current clock” puts the select back. Nothing is emailed from that step. The reminder job still wakes on the server clock.

## Soft+ intention JSON

This week’s soft intention stays free. Soft+ can download earlier weeks (the same quiet list, up to 24) as `soft-boring-intentions.json`. Free and guests see the upgrade tease and do not receive the sentences. `GET /api/soft-intentions/export` requires Soft+. The file has week, sentence, and updated time only — no email, and Soft Wall never sees it.
