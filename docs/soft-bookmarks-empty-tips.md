# Soft bookmarks, empty states, Soft tips inbox

No new environment variables. Stripe and email are not required.

## Soft bookmarks (Soft+)

Soft+ members can **save Soft Wall notes privately** (heart / save) from a note detail. Bookmarks live in `wall_note_bookmarks` and never appear on Soft Wall for others. List them at `/wall/saved`, or from Soft Wall / Account links. Toggle again to unsave. Free and signed-out visitors see a calm Soft+ / login nudge.

## Gentle empty-state illustrations

History, monthly digest, soft year, and saved Soft Wall empties share `EmptyState` with lightweight Soft Boring SVG shapes (`SoftShapesEmpty` in `soft-doodles.tsx`) — no heavy image assets. A tiny float motion respects `prefers-reduced-motion`.

## Soft tips / inbox polish

The Soft inbox gain calm filters: **All**, **Unread**, and **Soft tips**. Soft tips are in-app rotating Soft Boring reminders (en / zh-tw / ja) — not email. Soft+ also sees a small rotating tips card on the account desk.
