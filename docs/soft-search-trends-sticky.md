# Soft+ note words, trends empty, mobile filter bar

No new environment variables. Stripe and email are not required. Locales stay `en` / `zh-tw` / `ja`.

## Soft+ Soft Wall search

The cream search box already matched a nickname, the short excerpt, and the summary. It now also reads energy, drain, less of, and priorities when those words are already on a readable note. The same 80-character visit limit as guest search applies. Locked teasers still leave the server through `toTeaserNote`, which does not include those fields, so a free desk cannot search them.

## Soft+ trends empty

`/trends` with no feeling points is a cream card: a quiet line doodle, a whisper, and copy that one saved feeling is enough for the first dot. It is not an error, and it does not ask for a pile of weeks first.

## Mobile Soft Wall filters

Week chips wrap inside the row (`max-w-full`, words can break) so a long label does not spill off a phone. Feeling bounds wrap too. When a filter is on, a small cream bar sticks to the corkboard while it scrolls, and only on small screens. Clearing it uses the same reset as the filter card.
