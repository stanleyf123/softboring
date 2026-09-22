# Soft streak polish, hide-demo Soft Wall filter, soft shortcuts

No new environment variables. Stripe and email are not required.

## Soft streak celebration polish

Hitting weekly streak milestones **2 / 4 / 8 / 12** still opens a soft dialog after save. Copy is milestone-specific; enter animation is gentle (respects `prefers-reduced-motion`). `localStorage` key `softboring.streak.celebrated.v1` still prevents replaying the same milestone on every visit.

## Soft Wall hide demo filter (Soft+)

Soft+ Soft Wall filters can **Hide demo notes** (`@softboring.demo` / `users.is_demo`). Preference sticks in `localStorage` (`softboring.wall.hideDemo.v1`). Feeling range and search stay as before. Free / signed-out teasers unchanged.

## Soft keyboard shortcuts help

On Soft Wall and Review, a small **?** control (and the `?` key) opens a Soft Boring help overlay covering Quiet writing, Escape, and Soft Wall filters. Escape closes the help first.

## Ops: CLI migrate alignment

`scripts/migrate.mjs` now mirrors runtime `src/db/migrate.ts` for `user_settings.preferred_wall_color` and `wall_note_flags` (plus soft notes / intentions / bookmarks / comment `parent_id`). After pull: `npm run db:migrate`.
