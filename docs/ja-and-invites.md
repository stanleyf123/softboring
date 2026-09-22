# Japanese locale and friend invites

No new environment variables. After pull, run `npm run db:migrate` (or restart the app — it applies `scripts/schema.sql` on open). Then rebuild and restart `softboring.service`.

## Japanese (`/ja`)

Locale id and URL prefix are both `ja`. Keep using `/zh-tw` for Traditional Chinese. Do not publish `/zh-TW`; that casing still loops behind nginx.

Public copy is in `messages/ja.json` (landing, review, history, wall, pricing, auth, account, thanks/welcome, nicknames, invite). The language switcher, sitemap alternates, and hreflang (`ja`, plus `en` / `zh-TW` / `x-default`) follow `routing.locales`.

After deploy:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3001/ja
curl -sS -o /dev/null -w "%{http_code}\n" https://softboring.com/ja
```

Resubmit `https://softboring.com/sitemap.xml`. Request indexing for `/ja`, `/ja/pricing`, and `/ja/wall` after the English and Traditional Chinese URLs. Search Console notes: [seo.md](./seo.md).

Stripe Checkout uses locale `ja` on the Japanese pages. Google and LINE callbacks still return to `/{locale}/…`.

## Invites

**Who can make a link:** Soft+ only. One personal code per member, from the account page. Free members see a short note and a link to pricing.

**Who can redeem:** a brand-new account only.

- Email register: `/{locale}/register?invite=CODE`
- Short link: `/{locale}/invite/CODE` (redirects to register with the same query)
- Google / LINE: the start URL carries `invite`. Redemption runs only when OAuth **creates** the user. Linking an existing email, or logging into an old account, does not redeem.

An unknown or already-used code does not block signup.

**Tables**

- `invite_codes`: `code`, `inviter_id`, `created_at` (when the link was made)
- `invites`: `inviter_id`, `invitee_id`, `created_at` (copied from the code), `redeemed_at` (signup time)

**Reward:** once at least one invite is redeemed, the inviter’s Soft Wall notes show a small star (“little star” / 小星星 / 小さな星). This does not change `plan`, Stripe, or trial days.

**Admin:** the dashboard counts redeemed invites. A member page shows how many people redeemed that member’s link, and whether this member joined through an invite. Deleting a user removes their code and redemption rows.
