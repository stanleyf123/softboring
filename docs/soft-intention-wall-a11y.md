# Soft intention, sticker pocket UX, Soft Wall a11y

No new environment variables. Stripe and email are not required.

## Soft intention

Signed-in members (Free or Soft+) can set **one soft intention** for the current ISO week — a single sentence, not a todo list — from the review page or account. Empty save clears it. The previous week’s intention (or the most recent earlier one) surfaces lightly above the review form. Intentions stay private; they are not on Soft Wall.

## Soft Wall sticker pocket polish

Soft+ Soft Wall shows a gentle “you placed N stickers this month” line on the wall header and in the sticker shop. Empty pocket states are clearer in the shop and on the note detail place-stickers area. Inventory counts still come from `user_stickers`; monthly placement counts come from `wall_note_stickers` for the current UTC calendar month.

## Soft Wall keyboard / accessibility

Soft Wall note and shop dialogs close on Escape (and backdrop click). Opening a dialog moves focus to Close; closing a note restores focus to the note button when possible. Notes, filters, and the weekly soft-picks strip carry clearer aria labels and focus-visible outlines.
