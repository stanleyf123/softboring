import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import Database from "better-sqlite3";
import { LEAVE_PHRASE, leaveConfirmationMatches } from "../src/lib/account-leave.ts";
import { monthlyDigestFromReviews } from "../src/lib/plus-insights.ts";
import {
  DEFAULT_TIMEZONE,
  calendarInTimeZone,
  isIanaTimeZone,
  reminderIsDue,
} from "../src/lib/timezone.ts";
import { listDueReminderUsers } from "../scripts/dispatch-reminders.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function leafKeys(value, prefix = "") {
  const out = new Set();
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      const next = prefix ? `${prefix}.${key}` : key;
      if (child && typeof child === "object" && !Array.isArray(child)) {
        for (const item of leafKeys(child, next)) out.add(item);
      } else {
        out.add(next);
      }
    }
    return out;
  }
  out.add(prefix);
  return out;
}

test("leaving asks for Soft Boring and the desk email", () => {
  assert.equal(LEAVE_PHRASE, "Soft Boring");
  assert.equal(
    leaveConfirmationMatches({
      phrase: "Soft Boring",
      email: "  Desk@Example.com ",
      accountEmail: "desk@example.com",
    }),
    "ok",
  );
  assert.equal(
    leaveConfirmationMatches({
      phrase: "soft boring",
      email: "desk@example.com",
      accountEmail: "desk@example.com",
    }),
    "phrase",
  );
  assert.equal(
    leaveConfirmationMatches({
      phrase: "Soft Boring",
      email: "other@example.com",
      accountEmail: "desk@example.com",
    }),
    "email",
  );

  const route = read("src/app/api/account/delete/route.ts");
  assert.match(route, /getCurrentUser/);
  assert.match(route, /leaveConfirmationMatches/);
  assert.match(route, /deleteUser/);
  assert.match(route, /maxAge: 0/);

  const users = read("src/db/users.ts");
  assert.match(users, /export function optOutSoftWallNotes/);
  assert.match(users, /DELETE FROM wall_notes WHERE user_id = \?/);
  assert.match(users, /DELETE FROM users WHERE id = \?/);
  assert.match(users, /foreign_keys = ON/);

  const card = read("src/components/soft-leave-card.tsx");
  assert.match(card, /\/api\/account\/delete/);
  assert.match(card, /LEAVE_PHRASE/);
  assert.doesNotMatch(card, /window\.confirm|legal|irreversible|GDPR/i);
});

test("deleting a user cascades data and opts notes off Soft Wall", () => {
  const dir = mkdtempSync(join(tmpdir(), "softboring-leave-"));
  const db = new Database(join(dir, "test.sqlite"));
  db.pragma("foreign_keys = ON");
  db.exec(read("scripts/schema.sql"));

  const now = "2026-01-01T00:00:00.000Z";
  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, 'h', ?)`,
  ).run("leaver", "leaver@example.com", now);
  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, 'h', ?)`,
  ).run("neighbor", "neighbor@example.com", now);
  db.prepare(
    `INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES ('sess', 'leaver', ?, ?)`,
  ).run(now, now);
  db.prepare(`INSERT INTO user_settings (user_id, reminder_enabled, timezone) VALUES ('leaver', 1, 'Asia/Taipei')`).run();
  db.prepare(
    `INSERT INTO reviews (id, guest_id, user_id, summary, created_at) VALUES ('rev-l', 'g-l', 'leaver', 'mine', ?)`,
  ).run(now);
  db.prepare(
    `INSERT INTO reviews (id, guest_id, user_id, summary, created_at) VALUES ('rev-n', 'g-n', 'neighbor', 'theirs', ?)`,
  ).run(now);
  db.prepare(
    `INSERT INTO wall_notes (id, review_id, user_id, created_at, updated_at) VALUES ('note-l', 'rev-l', 'leaver', ?, ?)`,
  ).run(now, now);
  db.prepare(
    `INSERT INTO wall_notes (id, review_id, user_id, created_at, updated_at) VALUES ('note-n', 'rev-n', 'neighbor', ?, ?)`,
  ).run(now, now);
  db.prepare(
    `INSERT INTO wall_comments (id, note_id, user_id, body, created_at) VALUES ('on-leaver', 'note-l', 'neighbor', 'kind', ?)`,
  ).run(now);
  db.prepare(
    `INSERT INTO wall_comments (id, note_id, user_id, body, created_at) VALUES ('by-leaver', 'note-n', 'leaver', 'hello', ?)`,
  ).run(now);
  db.prepare(
    `INSERT INTO notifications (id, user_id, kind, title, created_at) VALUES ('n1', 'leaver', 'tip', 'hi', ?)`,
  ).run(now);
  db.prepare(
    `INSERT INTO payments (id, user_id, kind, status, created_at) VALUES ('pay', 'leaver', 'other', 'succeeded', ?)`,
  ).run(now);

  const leave = db.transaction(() => {
    db.prepare(`DELETE FROM wall_notes WHERE user_id = ?`).run("leaver");
    return db.prepare(`DELETE FROM users WHERE id = ?`).run("leaver").changes;
  });
  assert.equal(leave(), 1);

  assert.equal(db.prepare(`SELECT id FROM users WHERE id = 'leaver'`).get(), undefined);
  assert.equal(db.prepare(`SELECT id FROM reviews WHERE user_id = 'leaver'`).get(), undefined);
  assert.equal(db.prepare(`SELECT id FROM wall_notes WHERE id = 'note-l'`).get(), undefined);
  assert.equal(db.prepare(`SELECT id FROM wall_comments WHERE id = 'on-leaver'`).get(), undefined);
  assert.equal(db.prepare(`SELECT id FROM wall_comments WHERE id = 'by-leaver'`).get(), undefined);
  assert.equal(db.prepare(`SELECT user_id FROM user_settings WHERE user_id = 'leaver'`).get(), undefined);
  assert.equal(db.prepare(`SELECT id FROM sessions WHERE user_id = 'leaver'`).get(), undefined);
  assert.equal(db.prepare(`SELECT id FROM notifications WHERE user_id = 'leaver'`).get(), undefined);

  const neighborNote = db.prepare(`SELECT id, user_id FROM wall_notes WHERE id = 'note-n'`).get();
  assert.equal(neighborNote.user_id, "neighbor");
  const neighbor = db.prepare(`SELECT email FROM users WHERE id = 'neighbor'`).get();
  assert.equal(neighbor.email, "neighbor@example.com");
  const payment = db.prepare(`SELECT user_id, status FROM payments WHERE id = 'pay'`).get();
  assert.equal(payment.user_id, null);
  assert.equal(payment.status, "succeeded");

  db.close();
  rmSync(dir, { recursive: true, force: true });
});

test("reminder weekday and digest month follow the member timezone", () => {
  assert.equal(DEFAULT_TIMEZONE, "Asia/Taipei");
  assert.equal(isIanaTimeZone("Asia/Taipei"), true);
  assert.equal(isIanaTimeZone("UTC"), true);
  assert.equal(isIanaTimeZone("Not/AZone"), false);
  assert.equal(isIanaTimeZone("Asia/Taipei;drop"), false);

  const tuesdayEveningUtc = new Date("2026-09-15T16:30:00.000Z");
  const taipei = calendarInTimeZone(tuesdayEveningUtc, "Asia/Taipei");
  const utc = calendarInTimeZone(tuesdayEveningUtc, "UTC");
  assert.equal(taipei.weekday, 3);
  assert.equal(utc.weekday, 2);

  assert.equal(
    reminderIsDue(
      { weekday: 3, lastSentAt: null, timeZone: "Asia/Taipei" },
      tuesdayEveningUtc,
    ),
    true,
  );
  assert.equal(
    reminderIsDue(
      { weekday: 2, lastSentAt: null, timeZone: "Asia/Taipei" },
      tuesdayEveningUtc,
    ),
    false,
  );
  assert.equal(
    reminderIsDue({ weekday: 2, lastSentAt: null, timeZone: "UTC" }, tuesdayEveningUtc),
    true,
  );
  assert.equal(
    reminderIsDue(
      {
        weekday: 3,
        lastSentAt: "2026-09-15T16:00:00.000Z",
        timeZone: "Asia/Taipei",
      },
      tuesdayEveningUtc,
    ),
    false,
  );

  const dir = mkdtempSync(join(tmpdir(), "softboring-tz-"));
  const db = new Database(join(dir, "test.sqlite"));
  db.pragma("foreign_keys = ON");
  db.exec(read("scripts/schema.sql"));
  const now = "2026-01-01T00:00:00.000Z";
  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, 'h', ?)`,
  ).run("taipei", "taipei@example.com", now);
  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, 'h', ?)`,
  ).run("utc-user", "utc@example.com", now);
  db.prepare(
    `INSERT INTO user_settings (user_id, reminder_enabled, reminder_weekday, timezone) VALUES (?, 1, 3, 'Asia/Taipei')`,
  ).run("taipei");
  db.prepare(
    `INSERT INTO user_settings (user_id, reminder_enabled, reminder_weekday, timezone) VALUES (?, 1, 2, 'UTC')`,
  ).run("utc-user");

  const due = listDueReminderUsers(db, tuesdayEveningUtc).map((row) => row.email).sort();
  assert.deepEqual(due, ["taipei@example.com", "utc@example.com"]);

  const boundary = new Date("2026-08-31T18:00:00.000Z");
  const reviews = [
    { createdAt: "2026-08-31T17:00:00.000Z", feeling: 4, energy: "tea", drain: "" },
    { createdAt: "2026-08-15T04:00:00.000Z", feeling: 2, energy: "rain", drain: "" },
  ];
  const taipeiMonth = monthlyDigestFromReviews(reviews, boundary, "Asia/Taipei");
  const utcMonth = monthlyDigestFromReviews(reviews, boundary, "UTC");
  assert.equal(taipeiMonth.timeZone, "Asia/Taipei");
  assert.equal(taipeiMonth.year, 2026);
  assert.equal(taipeiMonth.month, 9);
  assert.equal(taipeiMonth.count, 1);
  assert.equal(utcMonth.month, 8);
  assert.equal(utcMonth.count, 2);

  const schema = read("scripts/schema.sql");
  assert.match(schema, /timezone TEXT NOT NULL DEFAULT 'Asia\/Taipei'/);
  assert.match(read("src/db/migrate.ts"), /timezone/);
  assert.match(read("scripts/migrate.mjs"), /timezone/);
  assert.match(read("scripts/dispatch-reminders.mjs"), /reminderIsDue/);
  assert.match(read("DEPLOY-LINODE.md"), /VPS/);
  assert.match(read("docs/soft-leave-tz-pwa.md"), /VPS clock/);

  db.close();
  rmSync(dir, { recursive: true, force: true });
});

test("PWA tip is mobile, once, and calm in every locale", () => {
  const tip = read("src/components/pwa-install-tip.tsx");
  assert.match(tip, /beforeinstallprompt/);
  assert.match(tip, /softboring\.pwaInstallTipDismissed/);
  assert.match(tip, /isIosAddToHome/);
  assert.match(tip, /md:hidden/);
  assert.match(tip, /display-mode: standalone/);
  assert.match(read("src/app/[locale]/layout.tsx"), /PwaInstallTip/);

  const messages = ["en", "zh-tw", "ja"].map((locale) =>
    JSON.parse(read(`messages/${locale}.json`)),
  );
  const [enKeys, zhKeys, jaKeys] = messages.map((item) => leafKeys(item));
  assert.deepEqual(enKeys, zhKeys);
  assert.deepEqual(enKeys, jaKeys);

  assert.match(messages[0].Account.leaveBody, /Soft Wall/);
  assert.match(messages[1].Account.leaveBody, /軟軟牆/);
  assert.match(messages[2].Account.leaveBody, /ソフトウォール/);
  assert.match(messages[0].Account.timezoneNote, /server/);
  assert.match(messages[1].Account.timezoneNote, /伺服器/);
  assert.match(messages[2].Account.timezoneNote, /サーバー/);
  assert.match(messages[0].Pwa.body, /once/i);
  assert.match(messages[1].Pwa.body, /一次/);
  assert.match(messages[2].Pwa.iosBody, /ホーム画面に追加/);
  assert.match(messages[0].Privacy.s6Body, /account page/);
  assert.match(messages[0].Privacy.s6Body, /JSON/);
  assert.doesNotMatch(messages[0].Privacy.s6Body, /contact the operator/i);
  assert.match(messages[0].Account.leavePhrasePlaceholder, /Soft Boring/);
  assert.doesNotMatch(messages[0].Pwa.body, /urgent|warning|legal/i);
});
