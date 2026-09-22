# Soft offline banner, review templates, cream week compare

No new environment variables. Stripe and email are not required. SQLite is unchanged.

## Soft offline banner

Every locale page can show a cream banner when the browser goes offline, and a short “you’re back” note when the connection returns. It listens to `online` / `offline` on this device only. Dismissing it hides the current note until the next change. Nothing is stored on the account, and nothing is sent. The banner stays still when the visitor prefers reduced motion, and it is hidden in print.

## Review soft templates

The weekly review offers five free starters: a quiet week, a tender week, small enough, a gentle restart, and a full week. Choosing one slips starter lines into empty lines only. Words already written are kept. Guests and free accounts see the same starters. Seasonal packs stay on Soft+.

## Cream week compare

`/[locale]/history/compare` stays Soft+. Soft+ sees two cream and blush cards, feeling marks, and a cream bridge that only notices whether energy, drain, and the one-sentence summary have words. Free and signed-out visitors see a cream sketch and an upgrade tease — on the compare page, and as a small card in history. The tease does not start a payment and does not send email.

Locale paths stay `en`, `zh-tw`, and `ja`.
