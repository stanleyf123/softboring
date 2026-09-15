import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import Database from "better-sqlite3";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function columnNames(db, table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map((col) => col.name);
}

function migrate(db) {
  db.exec(readFileSync(join(root, "scripts/schema.sql"), "utf8"));
}

function emptyToNull(value) {
  const trimmed = value?.trim?.() || value;
  return trimmed ? trimmed : null;
}

function upsertPayment(db, input) {
  const stripeEventId = emptyToNull(input.stripeEventId);
  const checkoutSessionId = emptyToNull(input.checkoutSessionId);
  const paymentIntentId = emptyToNull(input.paymentIntentId);
  const invoiceId = emptyToNull(input.invoiceId);

  if (stripeEventId) {
    const sameEvent = db
      .prepare(`SELECT * FROM payments WHERE stripe_event_id = ?`)
      .get(stripeEventId);
    if (sameEvent) return sameEvent;
  }

  let existing;
  if (paymentIntentId) {
    existing = db
      .prepare(`SELECT * FROM payments WHERE payment_intent_id = ?`)
      .get(paymentIntentId);
  }
  if (!existing && checkoutSessionId) {
    existing = db
      .prepare(`SELECT * FROM payments WHERE checkout_session_id = ?`)
      .get(checkoutSessionId);
  }
  if (!existing && invoiceId) {
    existing = db
      .prepare(
        `SELECT * FROM payments WHERE json_extract(metadata, '$.invoiceId') = ?`,
      )
      .get(invoiceId);
  }

  const metadata = JSON.stringify({
    ...(invoiceId ? { invoiceId } : {}),
    ...(input.metadata ?? {}),
  });

  if (existing) {
    db.prepare(
      `UPDATE payments
       SET user_id = @user_id,
           email = @email,
           checkout_session_id = @checkout_session_id,
           payment_intent_id = @payment_intent_id,
           amount_cents = @amount_cents,
           currency = @currency,
           status = @status,
           description = @description,
           metadata = @metadata
       WHERE id = @id`,
    ).run({
      id: existing.id,
      user_id: existing.user_id ?? input.userId ?? null,
      email: existing.email ?? input.email ?? null,
      checkout_session_id: existing.checkout_session_id ?? checkoutSessionId,
      payment_intent_id: existing.payment_intent_id ?? paymentIntentId,
      amount_cents: existing.amount_cents ?? input.amountCents ?? null,
      currency: existing.currency ?? input.currency ?? null,
      status: input.status === "refunded" ? "refunded" : existing.status,
      description: existing.description ?? input.description ?? null,
      metadata,
    });
    return db.prepare(`SELECT * FROM payments WHERE id = ?`).get(existing.id);
  }

  const id = input.id ?? `pay-${Math.random().toString(16).slice(2)}`;
  db.prepare(
    `INSERT INTO payments (
      id, user_id, email, kind, stripe_event_id, checkout_session_id,
      payment_intent_id, amount_cents, currency, status, description,
      created_at, metadata
    ) VALUES (
      @id, @user_id, @email, @kind, @stripe_event_id, @checkout_session_id,
      @payment_intent_id, @amount_cents, @currency, @status, @description,
      @created_at, @metadata
    )`,
  ).run({
    id,
    user_id: input.userId ?? null,
    email: input.email ?? null,
    kind: input.kind,
    stripe_event_id: stripeEventId,
    checkout_session_id: checkoutSessionId,
    payment_intent_id: paymentIntentId,
    amount_cents: input.amountCents ?? null,
    currency: input.currency ?? null,
    status: input.status,
    description: input.description ?? null,
    created_at: input.createdAt ?? "2026-03-01T00:00:00.000Z",
    metadata,
  });
  return db.prepare(`SELECT * FROM payments WHERE id = ?`).get(id);
}

test("payments table, unique ids, filters, revenue, and user delete", () => {
  const dir = mkdtempSync(join(tmpdir(), "softboring-pay-"));
  const sqlitePath = join(dir, "test.sqlite");
  mkdirSync(dirname(sqlitePath), { recursive: true });
  const db = new Database(sqlitePath);
  db.pragma("foreign_keys = ON");
  migrate(db);

  const cols = columnNames(db, "payments");
  for (const name of [
    "id",
    "user_id",
    "email",
    "kind",
    "stripe_event_id",
    "checkout_session_id",
    "payment_intent_id",
    "amount_cents",
    "currency",
    "status",
    "description",
    "created_at",
    "metadata",
  ]) {
    assert.ok(cols.includes(name), `missing payments.${name}`);
  }

  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at, plan)
     VALUES (?, ?, ?, ?, ?)`,
  ).run("user-a", "a@example.com", "hash", "2026-01-01T00:00:00.000Z", "soft_plus");

  upsertPayment(db, {
    id: "pay-1",
    userId: "user-a",
    email: "a@example.com",
    kind: "subscription",
    stripeEventId: "evt_checkout",
    checkoutSessionId: "cs_test_1",
    invoiceId: "in_1",
    amountCents: 900,
    currency: "usd",
    status: "succeeded",
    description: "Soft+ subscription",
  });

  const replay = upsertPayment(db, {
    userId: "user-a",
    email: "a@example.com",
    kind: "subscription",
    stripeEventId: "evt_checkout",
    checkoutSessionId: "cs_test_1",
    amountCents: 900,
    currency: "usd",
    status: "succeeded",
  });
  assert.equal(replay.id, "pay-1");

  const invoice = upsertPayment(db, {
    userId: "user-a",
    email: "a@example.com",
    kind: "subscription",
    stripeEventId: "evt_invoice",
    paymentIntentId: "pi_1",
    invoiceId: "in_1",
    amountCents: 900,
    currency: "usd",
    status: "succeeded",
    description: "Invoice 0001",
  });
  assert.equal(invoice.id, "pay-1");
  assert.equal(invoice.payment_intent_id, "pi_1");
  assert.equal(invoice.checkout_session_id, "cs_test_1");

  upsertPayment(db, {
    id: "pay-sticker",
    userId: "user-a",
    email: "a@example.com",
    kind: "sticker",
    stripeEventId: "evt_sticker",
    checkoutSessionId: "cs_sticker",
    paymentIntentId: "pi_sticker",
    amountCents: 99,
    currency: "usd",
    status: "succeeded",
    description: "Soft Wall sticker",
  });

  upsertPayment(db, {
    userId: "user-a",
    email: "a@example.com",
    kind: "sticker",
    stripeEventId: "evt_refund",
    paymentIntentId: "pi_sticker",
    status: "refunded",
    amountCents: 99,
    currency: "usd",
  });
  const sticker = db.prepare(`SELECT * FROM payments WHERE id = ?`).get("pay-sticker");
  assert.equal(sticker.status, "refunded");

  assert.throws(() => {
    db.prepare(
      `INSERT INTO payments (
        id, user_id, email, kind, stripe_event_id, checkout_session_id,
        payment_intent_id, amount_cents, currency, status, description, created_at
      ) VALUES (?, ?, ?, 'other', ?, ?, NULL, 1, 'usd', 'succeeded', 'dup', ?)`,
    ).run(
      "pay-dup",
      "user-a",
      "a@example.com",
      "evt_checkout",
      "cs_other",
      "2026-03-02T00:00:00.000Z",
    );
  });

  const succeeded = db
    .prepare(
      `SELECT COUNT(*) AS n, COALESCE(SUM(amount_cents), 0) AS amount
       FROM payments WHERE status = 'succeeded'`,
    )
    .get();
  assert.equal(succeeded.n, 1);
  assert.equal(succeeded.amount, 900);

  const stickers = db
    .prepare(`SELECT id FROM payments WHERE kind = 'sticker'`)
    .all();
  assert.equal(stickers.length, 1);

  const byEmail = db
    .prepare(`SELECT id FROM payments WHERE email LIKE ? COLLATE NOCASE`)
    .all("%A@EXAMPLE.COM%");
  assert.equal(byEmail.length, 2);

  db.prepare(`DELETE FROM users WHERE id = ?`).run("user-a");
  const afterDelete = db.prepare(`SELECT user_id, email FROM payments`).all();
  assert.equal(afterDelete.length, 2);
  assert.ok(afterDelete.every((row) => row.user_id == null));
  assert.ok(afterDelete.every((row) => row.email === "a@example.com"));

  db.close();
  rmSync(dir, { recursive: true, force: true });
});

test("existing database gains payments table via schema.sql", () => {
  const dir = mkdtempSync(join(tmpdir(), "softboring-pay-alter-"));
  const sqlitePath = join(dir, "test.sqlite");
  const db = new Database(sqlitePath);
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  migrate(db);
  const tables = db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`)
    .all()
    .map((row) => row.name);
  assert.ok(tables.includes("payments"));
  const cols = columnNames(db, "payments");
  assert.ok(cols.includes("stripe_event_id"));
  assert.ok(cols.includes("checkout_session_id"));
  db.close();
  rmSync(dir, { recursive: true, force: true });
});
