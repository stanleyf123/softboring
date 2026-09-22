# Mood palette, free JSON download, footer cluster

Builds on merged PR #29 (gift expiry, Soft Wall sort, gift thank-you). No Stripe/email work.

## Soft Wall mood palette

- Soft+ wall shows a small color key under the filters: peach, blush, mint, cream, lemon, sky.
- Copy is a mood, like choosing a teacup. Colors are not scores, ranks, or hex codes.
- Locales: en / zh-tw / ja.

## Free account download

- Signed-in Free accounts can download the latest four open reviews as JSON from Account and History (`GET /api/account/export`).
- The file is only those weeks. Older review text is not included. Nothing is emailed.
- Soft+ keeps CSV and printable export. The same route, if a Soft+ member opens it, includes every saved week.

## Footer cluster

- Footer links stay in one order on every locale: guidelines, privacy, terms, then languages.
- The language switcher sits in that cluster. The thanks page link stays above it.
