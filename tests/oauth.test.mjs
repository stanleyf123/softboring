import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const SYNTHETIC_EMAIL_DOMAIN = "oauth.softboring.invalid";

function syntheticOAuthEmail(provider, providerUserId) {
  const id = providerUserId.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 80) || "user";
  return `${provider}.${id}@${SYNTHETIC_EMAIL_DOMAIN}`;
}

function isGoogleOAuthConfigured(env) {
  return Boolean(env.GOOGLE_CLIENT_ID?.trim() && env.GOOGLE_CLIENT_SECRET?.trim());
}

function isLineOAuthConfigured(env) {
  return Boolean(env.LINE_CHANNEL_ID?.trim() && env.LINE_CHANNEL_SECRET?.trim());
}

/** Mirrors src/lib/oauth-link.ts */
function decideOAuthLink(input) {
  if (input.existingByProviderUserId) {
    return { action: "login", userId: input.existingByProviderUserId };
  }
  const byEmail = input.existingByVerifiedEmail;
  if (!byEmail) return { action: "create" };
  if (byEmail.existingProviderSubject && byEmail.existingProviderSubject.length > 0) {
    return { action: "conflict", reason: "email_has_other_provider" };
  }
  return { action: "link", userId: byEmail.userId };
}

function columnNames(db, table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map((col) => col.name);
}

function migrate(db) {
  db.exec(readFileSync(join(root, "scripts/schema.sql"), "utf8"));
}

function findOrLinkOAuthUser(db, identity) {
  const providerUserId = identity.providerUserId.trim();
  const verifiedEmail =
    identity.emailVerified && identity.email
      ? identity.email.trim().toLowerCase()
      : null;

  const existingProvider = db
    .prepare(
      `SELECT user_id FROM oauth_accounts WHERE provider = ? AND provider_user_id = ?`,
    )
    .get(identity.provider, providerUserId);
  const emailUser = verifiedEmail
    ? db
        .prepare(`SELECT id FROM users WHERE email = ? COLLATE NOCASE`)
        .get(verifiedEmail)
    : undefined;
  const emailProvider = emailUser
    ? db
        .prepare(
          `SELECT provider_user_id FROM oauth_accounts WHERE provider = ? AND user_id = ?`,
        )
        .get(identity.provider, emailUser.id)
    : undefined;

  const decision = decideOAuthLink({
    existingByProviderUserId: existingProvider?.user_id ?? null,
    existingByVerifiedEmail: emailUser
      ? {
          userId: emailUser.id,
          existingProviderSubject: emailProvider?.provider_user_id ?? null,
        }
      : null,
  });

  if (decision.action === "login") {
    return { userId: decision.userId, created: false, linked: false };
  }
  if (decision.action === "conflict") {
    const err = new Error("oauth_provider_conflict");
    err.code = "provider_conflict";
    throw err;
  }

  const insertAccount = (userId) => {
    db.prepare(
      `INSERT INTO oauth_accounts (id, provider, provider_user_id, user_id, email, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      randomUUID(),
      identity.provider,
      providerUserId,
      userId,
      verifiedEmail,
      new Date().toISOString(),
    );
  };

  if (decision.action === "link") {
    insertAccount(decision.userId);
    return { userId: decision.userId, created: false, linked: true };
  }

  const id = randomUUID();
  const email = verifiedEmail || syntheticOAuthEmail(identity.provider, providerUserId);
  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at, plan)
     VALUES (?, ?, NULL, ?, 'free')`,
  ).run(id, email, new Date().toISOString());
  insertAccount(id);
  return { userId: id, created: true, linked: false };
}

test("schema stores oauth identities and allows null password_hash", () => {
  const dir = mkdtempSync(join(tmpdir(), "softboring-oauth-schema-"));
  const db = new Database(join(dir, "test.sqlite"));
  db.pragma("foreign_keys = ON");
  migrate(db);

  const tables = db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`)
    .all()
    .map((row) => row.name);
  assert.ok(tables.includes("oauth_accounts"));
  assert.ok(columnNames(db, "oauth_accounts").includes("provider_user_id"));

  const passwordCol = db
    .prepare(`PRAGMA table_info(users)`)
    .all()
    .find((col) => col.name === "password_hash");
  assert.equal(passwordCol.notnull, 0);

  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at, plan)
     VALUES (?, ?, NULL, ?, 'free')`,
  ).run("user-oauth", "line.abc@oauth.softboring.invalid", "2026-01-01T00:00:00.000Z");
  db.prepare(
    `INSERT INTO oauth_accounts (id, provider, provider_user_id, user_id, email, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    "oa-1",
    "line",
    "U123",
    "user-oauth",
    null,
    "2026-01-01T00:00:00.000Z",
  );

  assert.throws(() => {
    db.prepare(
      `INSERT INTO oauth_accounts (id, provider, provider_user_id, user_id, email, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      "oa-2",
      "line",
      "U123",
      "user-oauth",
      null,
      "2026-01-01T00:00:00.000Z",
    );
  });

  db.close();
  rmSync(dir, { recursive: true, force: true });
});

test("existing users table can drop NOT NULL on password_hash", () => {
  const dir = mkdtempSync(join(tmpdir(), "softboring-oauth-alter-"));
  const db = new Database(join(dir, "test.sqlite"));
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)`,
  ).run("user-old", "old@example.com", "hash", "2026-01-01T00:00:00.000Z");

  migrate(db);
  const passwordCol = db
    .prepare(`PRAGMA table_info(users)`)
    .all()
    .find((col) => col.name === "password_hash");
  // CREATE TABLE IF NOT EXISTS does not rebuild; mimic app migrate rebuild.
  if (passwordCol.notnull === 1) {
    db.pragma("foreign_keys = OFF");
    const rebuild = db.transaction(() => {
      db.exec(`
        CREATE TABLE users_oauth_mig (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE COLLATE NOCASE,
          password_hash TEXT,
          created_at TEXT NOT NULL,
          plan TEXT NOT NULL DEFAULT 'free',
          plan_status TEXT,
          stripe_customer_id TEXT,
          stripe_subscription_id TEXT,
          stripe_price_id TEXT,
          plan_updated_at TEXT
        );
      `);
      db.exec(`
        INSERT INTO users_oauth_mig (
          id, email, password_hash, created_at, plan, plan_status,
          stripe_customer_id, stripe_subscription_id, stripe_price_id, plan_updated_at
        )
        SELECT id, email, password_hash, created_at, 'free', NULL, NULL, NULL, NULL, NULL
        FROM users
      `);
      db.exec("DROP TABLE users");
      db.exec("ALTER TABLE users_oauth_mig RENAME TO users");
    });
    rebuild();
    db.pragma("foreign_keys = ON");
  }

  const after = db
    .prepare(`PRAGMA table_info(users)`)
    .all()
    .find((col) => col.name === "password_hash");
  assert.equal(after.notnull, 0);
  const kept = db.prepare(`SELECT password_hash FROM users WHERE id = ?`).get("user-old");
  assert.equal(kept.password_hash, "hash");
  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at, plan)
     VALUES (?, ?, NULL, ?, 'free')`,
  ).run("user-new", "new@example.com", "2026-01-02T00:00:00.000Z");

  db.close();
  rmSync(dir, { recursive: true, force: true });
});

test("OAuth create, link-by-email, and no hijack", () => {
  const dir = mkdtempSync(join(tmpdir(), "softboring-oauth-link-"));
  const db = new Database(join(dir, "test.sqlite"));
  db.pragma("foreign_keys = ON");
  migrate(db);

  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at, plan)
     VALUES (?, ?, ?, ?, 'free')`,
  ).run("user-mail", "ada@example.com", "hash", "2026-01-01T00:00:00.000Z");

  const created = findOrLinkOAuthUser(db, {
    provider: "google",
    providerUserId: "sub-new",
    email: "new@example.com",
    emailVerified: true,
  });
  assert.equal(created.created, true);
  const createdRow = db
    .prepare(`SELECT plan, password_hash FROM users WHERE id = ?`)
    .get(created.userId);
  assert.equal(createdRow.plan, "free");
  assert.equal(createdRow.password_hash, null);

  const linked = findOrLinkOAuthUser(db, {
    provider: "google",
    providerUserId: "sub-ada",
    email: "ADA@example.com",
    emailVerified: true,
  });
  assert.equal(linked.userId, "user-mail");
  assert.equal(linked.linked, true);

  const again = findOrLinkOAuthUser(db, {
    provider: "google",
    providerUserId: "sub-ada",
    email: "other@example.com",
    emailVerified: true,
  });
  assert.equal(again.userId, "user-mail");
  assert.equal(again.created, false);

  assert.throws(
    () =>
      findOrLinkOAuthUser(db, {
        provider: "google",
        providerUserId: "sub-other",
        email: "ada@example.com",
        emailVerified: true,
      }),
    (err) => err.code === "provider_conflict",
  );

  const line = findOrLinkOAuthUser(db, {
    provider: "line",
    providerUserId: "U999",
    email: null,
    emailVerified: false,
  });
  assert.equal(line.created, true);
  const lineUser = db.prepare(`SELECT email FROM users WHERE id = ?`).get(line.userId);
  assert.equal(lineUser.email, syntheticOAuthEmail("line", "U999"));

  const lineAgain = findOrLinkOAuthUser(db, {
    provider: "line",
    providerUserId: "U999",
    email: "spoof@example.com",
    emailVerified: true,
  });
  assert.equal(lineAgain.userId, line.userId);

  db.close();
  rmSync(dir, { recursive: true, force: true });
});

test("unverified email does not take over an existing account", () => {
  const dir = mkdtempSync(join(tmpdir(), "softboring-oauth-unverified-"));
  const db = new Database(join(dir, "test.sqlite"));
  db.pragma("foreign_keys = ON");
  migrate(db);
  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at, plan)
     VALUES (?, ?, ?, ?, 'free')`,
  ).run("user-mail", "ada@example.com", "hash", "2026-01-01T00:00:00.000Z");

  const created = findOrLinkOAuthUser(db, {
    provider: "google",
    providerUserId: "sub-unverified",
    email: "ada@example.com",
    emailVerified: false,
  });
  assert.equal(created.created, true);
  assert.notEqual(created.userId, "user-mail");

  db.close();
  rmSync(dir, { recursive: true, force: true });
});

test("missing env disables OAuth without crashing password login", () => {
  assert.equal(isGoogleOAuthConfigured({}), false);
  assert.equal(isLineOAuthConfigured({}), false);
  assert.equal(
    isGoogleOAuthConfigured({ GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "secret" }),
    true,
  );
  assert.equal(
    isGoogleOAuthConfigured({ GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "  " }),
    false,
  );
  assert.equal(
    isLineOAuthConfigured({ LINE_CHANNEL_ID: "ch", LINE_CHANNEL_SECRET: "sec" }),
    true,
  );

  const form = readFileSync(join(root, "src/components/auth-form.tsx"), "utf8");
  assert.match(form, /continueGoogle/);
  assert.match(form, /continueLine/);
  assert.match(form, /oauthOff/);
  assert.match(form, /oauth\.google/);

  const start = readFileSync(
    join(root, "src/app/api/auth/oauth/[provider]/route.ts"),
    "utf8",
  );
  assert.match(start, /oauth_disabled/);
  assert.match(start, /isOAuthProviderConfigured/);

  const login = readFileSync(join(root, "src/app/api/auth/login/route.ts"), "utf8");
  assert.match(login, /password_hash/);
  assert.doesNotMatch(login, /GOOGLE_CLIENT/);

  const adminLogin = readFileSync(join(root, "src/app/admin/login/page.tsx"), "utf8");
  assert.doesNotMatch(adminLogin, /Continue with Google/);
  assert.doesNotMatch(adminLogin, /oauth/);

  const envExample = readFileSync(join(root, ".env.example"), "utf8");
  assert.match(envExample, /GOOGLE_CLIENT_ID=/);
  assert.match(envExample, /LINE_CHANNEL_SECRET=/);
  assert.match(envExample, /api\/auth\/oauth\/google\/callback/);
  assert.match(envExample, /api\/auth\/oauth\/line\/callback/);

  assert.ok(existsSync(join(root, "src/app/api/auth/oauth/[provider]/callback/route.ts")));

  const en = JSON.parse(readFileSync(join(root, "messages/en.json"), "utf8"));
  const zh = JSON.parse(readFileSync(join(root, "messages/zh-tw.json"), "utf8"));
  assert.equal(en.Auth.continueGoogle, "Continue with Google");
  assert.equal(zh.Auth.continueLine, "用 LINE 繼續");
  assert.ok(en.Auth.oauthOff.includes("Email still works"));
  assert.ok(zh.Auth.oauthOff.includes("電子郵件"));
});

test("linking policy prefers provider subject over email", () => {
  assert.deepEqual(
    decideOAuthLink({
      existingByProviderUserId: "user-a",
      existingByVerifiedEmail: { userId: "user-b", existingProviderSubject: null },
    }),
    { action: "login", userId: "user-a" },
  );
  assert.deepEqual(
    decideOAuthLink({
      existingByProviderUserId: null,
      existingByVerifiedEmail: { userId: "user-b", existingProviderSubject: "other" },
    }),
    { action: "conflict", reason: "email_has_other_provider" },
  );
  assert.deepEqual(
    decideOAuthLink({
      existingByProviderUserId: null,
      existingByVerifiedEmail: { userId: "user-b", existingProviderSubject: null },
    }),
    { action: "link", userId: "user-b" },
  );
  assert.deepEqual(
    decideOAuthLink({
      existingByProviderUserId: null,
      existingByVerifiedEmail: null,
    }),
    { action: "create" },
  );
});
