import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import Database from "better-sqlite3";
import { newInviteCode, normalizeInviteCode } from "../src/lib/invite.ts";

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

test("ja locale stays a lowercase URL segment beside en and zh-tw", () => {
  const routing = read("src/i18n/routing.ts");
  assert.match(routing, /locales:\s*\["en", "zh-tw", "ja"\]/);
  assert.doesNotMatch(routing, /"zh-TW"/);

  const seo = read("src/lib/seo.ts");
  assert.match(seo, /ja_JP/);
  assert.match(seo, /"ja"/);
  assert.match(seo, /hreflangTag/);

  const switcher = read("src/components/locale-switcher.tsx");
  assert.match(switcher, /locale="ja"/);
  assert.match(switcher, /locale="zh-tw"/);
  assert.match(switcher, /locale="en"/);

  const messages = ["en", "zh-tw", "ja"].map((locale) =>
    JSON.parse(read(`messages/${locale}.json`)),
  );
  const [en, zh, ja] = messages.map((item) => leafKeys(item));
  assert.deepEqual(en, zh);
  assert.deepEqual(en, ja);
  assert.equal(messages[2].LocaleSwitcher.ja, "日");
  assert.match(messages[2].Home.title, /やさしい/);
  assert.match(messages[2].Wall.title, /ソフトウォール/);
  assert.equal(messages[2].Metadata.homeTitle.includes("Soft Boring"), true);
  const titles = [
    "homeTitle",
    "pricingTitle",
    "wallTitle",
    "reviewTitle",
    "historyTitle",
    "loginTitle",
    "registerTitle",
    "privacyTitle",
    "termsTitle",
    "thanksTitle",
  ];
  assert.equal(new Set(titles.map((key) => messages[2].Metadata[key])).size, titles.length);
});

test("invite codes are readable and signup paths redeem them once", () => {
  assert.equal(normalizeInviteCode("abcdefghj0"), null);
  assert.equal(normalizeInviteCode("abcdefghij"), null);
  assert.equal(normalizeInviteCode(" ABCDEFGHJ2 "), "abcdefghj2");
  assert.equal(normalizeInviteCode("abcdefghj2"), "abcdefghj2");
  const made = newInviteCode();
  assert.equal(normalizeInviteCode(made), made);

  const register = read("src/app/api/auth/register/route.ts");
  assert.match(register, /redeemInviteCode/);
  assert.match(register, /inviteRedeemed/);

  const callback = read("src/app/api/auth/oauth/[provider]/callback/route.ts");
  assert.match(callback, /created && payload\.invite/);
  assert.match(callback, /redeemInviteCode/);

  const start = read("src/app/api/auth/oauth/[provider]/route.ts");
  assert.match(start, /searchParams\.get\("invite"\)/);

  const account = read("src/app/api/account/invite/route.ts");
  assert.match(account, /userIsSoftPlus/);
  assert.match(account, /soft_plus_required/);

  const wall = read("src/db/wall.ts");
  assert.match(wall, /FROM invites i WHERE i\.inviter_id = n\.user_id/);
  assert.match(wall, /ownerInviteBadge/);

  const schema = read("scripts/schema.sql");
  assert.match(schema, /CREATE TABLE IF NOT EXISTS invite_codes/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS invites/);
  assert.match(schema, /redeemed_at TEXT NOT NULL/);

  const dir = mkdtempSync(join(tmpdir(), "softboring-invite-"));
  const db = new Database(join(dir, "test.sqlite"));
  db.pragma("foreign_keys = ON");
  db.exec(schema);

  const now = "2026-09-22T00:00:00.000Z";
  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at, plan) VALUES (?, ?, ?, ?, ?)`,
  ).run("inviter", "plus@example.com", "hash", now, "soft_plus");
  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at, plan) VALUES (?, ?, ?, ?, ?)`,
  ).run("invitee", "new@example.com", "hash", now, "free");
  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at, plan) VALUES (?, ?, ?, ?, ?)`,
  ).run("other", "other@example.com", "hash", now, "free");
  db.prepare(`INSERT INTO invite_codes (code, inviter_id, created_at) VALUES (?, ?, ?)`).run(
    made,
    "inviter",
    now,
  );

  const codeRow = db.prepare(`SELECT inviter_id, created_at FROM invite_codes WHERE code = ?`).get(made);
  assert.equal(codeRow.inviter_id, "inviter");
  db.prepare(
    `INSERT INTO invites (id, inviter_id, invitee_id, created_at, redeemed_at) VALUES (?, ?, ?, ?, ?)`,
  ).run("row-1", codeRow.inviter_id, "invitee", codeRow.created_at, "2026-09-22T01:00:00.000Z");

  assert.throws(() => {
    db.prepare(
      `INSERT INTO invites (id, inviter_id, invitee_id, created_at, redeemed_at) VALUES (?, ?, ?, ?, ?)`,
    ).run("row-2", "inviter", "invitee", now, now);
  });

  db.prepare(
    `INSERT INTO invites (id, inviter_id, invitee_id, created_at, redeemed_at) VALUES (?, ?, ?, ?, ?)`,
  ).run("row-3", "inviter", "other", now, now);
  const count = db.prepare(`SELECT COUNT(*) AS n FROM invites WHERE inviter_id = ?`).get("inviter");
  assert.equal(count.n, 2);
  assert.equal(codeRow.inviter_id === "inviter", true);

  db.close();
  rmSync(dir, { recursive: true, force: true });
});
