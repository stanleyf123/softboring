# Demo Soft+ bots (Soft Wall)

Ten Soft+ demo accounts keep [Soft Wall](https://softboring.com/zh-tw/wall) from looking empty. They write gentle zh-TW weekly notes and share them. They are **not** real members.

Emails:

`demo01@softboring.demo` … `demo10@softboring.demo`

Public wall nicknames (zh-TW, re-seed fills them in if missing):

`小桃` `薄荷糖` `雲朵` `暖暖` `慢活` `茶泡飯` `月亮` `軟軟` `散步` `午後`

Shared password (override with `DEMO_PASSWORD`):

`softboring-demo-2026`

Rows are marked `users.is_demo = 1`. Admin also shows a **Demo** badge on `@softboring.demo` addresses. On Soft Wall itself, those notes wear a cream **demo neighbor** badge for everyone, including Free and guests — the review text stays blurred until Soft+. Locale stays `zh-tw`.

These scripts **never** update or delete `stanleys1225@gmail.com`, and they only insert/update/delete `@softboring.demo` users (plus those users’ reviews and `wall_notes`). Real members’ notes are left alone.

## Seed (once after deploy)

Reads `SQLITE_PATH` the same way as `npm run db:migrate` (default `./data/softboring.sqlite`).

```bash
cd /var/www/softboring
sudo -u www-data bash -lc 'set -a; source /etc/softboring.env; set +a; cd /var/www/softboring && npm run db:migrate && npm run demo:seed'
```

Locally:

```bash
npm run db:migrate
npm run demo:seed
```

Idempotent: a second run does not duplicate users, seed reviews, or wall notes. It will refresh Soft+ (`plan=soft_plus`, `plan_status=active`) and the shared password hash. Missing nicknames are filled in; a nickname that is already set is left alone.

Each demo user gets **two** zh-TW reviews, each shared to Soft Wall with scattered positions and cream/blush/peach/mint (plus lemon/sky) colors.

## Daily poster (cron)

Picks **3–5** of the ten accounts from the **Asia/Taipei** calendar date, writes a fresh review from a rotating pool, and shares it. Safe to run twice the same Taipei day (stable review ids like `demo-daily-01-2026-09-17`).

```bash
npm run demo:daily
```

If seed has not been run, the script logs `missing` and does nothing to real users.

### VPS cron (09:00 Taipei)

Machine timezone should be `Asia/Taipei` (same advice as weekly reminders). Example:

```bash
# /etc/cron.d/softboring-demo-wall
SHELL=/bin/bash
PATH=/usr/bin:/bin
0 9 * * * www-data bash -lc 'set -a; source /etc/softboring.env; set +a; cd /var/www/softboring && npm run demo:daily >> /var/log/softboring-demo-daily.log 2>&1'
```

Optional env in `/etc/softboring.env`:

```bash
# DEMO_PASSWORD=softboring-demo-2026
```

Do not commit a production-only password into the repo. The default is enough for a clearly fake `@softboring.demo` domain.

## Disable / remove

Stop the cron first (`/etc/cron.d/softboring-demo-wall`), then:

```bash
npm run demo:purge
```

That deletes only `@softboring.demo` users. Foreign keys cascade their reviews, wall notes, sessions, and settings. `stanleys1225@gmail.com` and every other real email stay.

To disable posting without deleting accounts, remove the cron file and leave the seed users in place.

## Tests

```bash
npm test
```

Coverage lives in `tests/demo-bots.test.mjs`: email detection, seed idempotency, real-user safety, and the once-per-Taipei-day guard.
