# Soft+ expiry UX, Soft Wall sort, gift thank-you

Builds on merged PR #28 (guidelines, gift codes, soft-stats). No Stripe/email work.

## Soft+ temporary expiry UX

- Account shows a calm `plan_expires_at` date for gift Soft+.
- When fewer than 7 days remain, a gentle lemon reminder appears (days left + date).
- Soft+ checks honor `plan_expires_at` via `userIsSoftPlus` so temporary gifts actually end.

## Soft Wall sort options

- Soft+ wall filter panel: sort by newest / most praised / pinned-first.
- Complements existing filters; corkboard x/y stay put; stacking follows the chosen rank.

## Soft thank-you after gift redeem

- Redeeming a gift code lands on `/thanks/plus?from=gift`.
- Gift path highlights Soft Wall, digest, and nickname next steps.
