import { getDb } from "./client";

export const PAYMENT_KINDS = ["subscription", "sticker", "other"] as const;
export const PAYMENT_STATUSES = [
  "succeeded",
  "pending",
  "failed",
  "refunded",
] as const;

export type PaymentKind = (typeof PAYMENT_KINDS)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

type PaymentRow = {
  id: string;
  user_id: string | null;
  email: string | null;
  kind: string;
  stripe_event_id: string | null;
  checkout_session_id: string | null;
  payment_intent_id: string | null;
  amount_cents: number | null;
  currency: string | null;
  status: string;
  description: string | null;
  created_at: string;
  metadata: string | null;
};

export type AdminPayment = {
  id: string;
  userId: string | null;
  email: string | null;
  kind: PaymentKind;
  stripeEventId: string | null;
  checkoutSessionId: string | null;
  paymentIntentId: string | null;
  amountCents: number | null;
  currency: string | null;
  status: PaymentStatus;
  description: string | null;
  createdAt: string;
};

export type PaymentInput = {
  userId?: string | null;
  email?: string | null;
  kind: PaymentKind;
  stripeEventId?: string | null;
  checkoutSessionId?: string | null;
  paymentIntentId?: string | null;
  invoiceId?: string | null;
  amountCents?: number | null;
  currency?: string | null;
  status: PaymentStatus;
  description?: string | null;
  createdAt?: string;
  metadata?: Record<string, unknown> | null;
};

export type PaymentListFilters = {
  kind?: string;
  status?: string;
  email?: string;
  userId?: string;
  limit?: number;
};

export type PaymentRevenueSummary = {
  succeededCount: number;
  byCurrency: Array<{ currency: string; count: number; amountCents: number }>;
};

const STATUS_RANK: Record<string, number> = {
  pending: 0,
  failed: 1,
  succeeded: 2,
  refunded: 3,
};

function emptyToNull(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function asKind(value: string): PaymentKind {
  return PAYMENT_KINDS.includes(value as PaymentKind)
    ? (value as PaymentKind)
    : "other";
}

function asStatus(value: string): PaymentStatus {
  return PAYMENT_STATUSES.includes(value as PaymentStatus)
    ? (value as PaymentStatus)
    : "pending";
}

function toAdmin(row: PaymentRow): AdminPayment {
  return {
    id: row.id,
    userId: row.user_id,
    email: row.email,
    kind: asKind(row.kind),
    stripeEventId: row.stripe_event_id,
    checkoutSessionId: row.checkout_session_id,
    paymentIntentId: row.payment_intent_id,
    amountCents: row.amount_cents,
    currency: row.currency,
    status: asStatus(row.status),
    description: row.description,
    createdAt: row.created_at,
  };
}

function mergedStatus(current: string, incoming: PaymentStatus): PaymentStatus {
  const currentRank = STATUS_RANK[current] ?? 0;
  const incomingRank = STATUS_RANK[incoming] ?? 0;
  return incomingRank >= currentRank ? incoming : asStatus(current);
}

function parseMetadata(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return { raw };
  }
  return {};
}

function mergeMetadata(
  existing: string | null,
  incoming: Record<string, unknown> | null | undefined,
  stripeEventId: string | null,
  invoiceId: string | null,
): string | null {
  const base = parseMetadata(existing);
  const next = { ...base, ...(incoming ?? {}) };
  if (invoiceId && typeof next.invoiceId !== "string") {
    next.invoiceId = invoiceId;
  }
  if (stripeEventId) {
    const ids = Array.isArray(next.eventIds)
      ? next.eventIds.filter((id): id is string => typeof id === "string")
      : [];
    if (!ids.includes(stripeEventId)) ids.push(stripeEventId);
    next.eventIds = ids;
  }
  return JSON.stringify(next);
}

function findExisting(input: {
  stripeEventId: string | null;
  paymentIntentId: string | null;
  checkoutSessionId: string | null;
  invoiceId: string | null;
}): PaymentRow | undefined {
  const db = getDb();
  if (input.stripeEventId) {
    const row = db
      .prepare(`SELECT * FROM payments WHERE stripe_event_id = ?`)
      .get(input.stripeEventId) as PaymentRow | undefined;
    if (row) return row;
  }
  if (input.paymentIntentId) {
    const row = db
      .prepare(`SELECT * FROM payments WHERE payment_intent_id = ?`)
      .get(input.paymentIntentId) as PaymentRow | undefined;
    if (row) return row;
  }
  if (input.checkoutSessionId) {
    const row = db
      .prepare(`SELECT * FROM payments WHERE checkout_session_id = ?`)
      .get(input.checkoutSessionId) as PaymentRow | undefined;
    if (row) return row;
  }
  if (input.invoiceId) {
    const row = db
      .prepare(
        `SELECT * FROM payments WHERE json_extract(metadata, '$.invoiceId') = ?`,
      )
      .get(input.invoiceId) as PaymentRow | undefined;
    if (row) return row;
  }
  return undefined;
}

export function isPaymentKind(value: string): value is PaymentKind {
  return PAYMENT_KINDS.includes(value as PaymentKind);
}

export function isPaymentStatus(value: string): value is PaymentStatus {
  return PAYMENT_STATUSES.includes(value as PaymentStatus);
}

export function upsertPayment(input: PaymentInput): AdminPayment {
  const db = getDb();
  const stripeEventId = emptyToNull(input.stripeEventId);
  const checkoutSessionId = emptyToNull(input.checkoutSessionId);
  const paymentIntentId = emptyToNull(input.paymentIntentId);
  const invoiceId = emptyToNull(input.invoiceId);
  const email = emptyToNull(input.email);
  const currency = emptyToNull(input.currency)?.toLowerCase() ?? null;
  const description = emptyToNull(input.description);
  const userId = emptyToNull(input.userId);

  if (stripeEventId) {
    const sameEvent = db
      .prepare(`SELECT * FROM payments WHERE stripe_event_id = ?`)
      .get(stripeEventId) as PaymentRow | undefined;
    if (sameEvent) return toAdmin(sameEvent);
  }

  const existing = findExisting({
    stripeEventId: null,
    paymentIntentId,
    checkoutSessionId,
    invoiceId,
  });

  if (existing) {
    const nextKind =
      existing.kind === "other" && input.kind !== "other"
        ? input.kind
        : existing.kind;
    const nextAmount =
      existing.amount_cents == null ? (input.amountCents ?? null) : existing.amount_cents;
    db.prepare(
      `UPDATE payments
       SET user_id = @user_id,
           email = @email,
           kind = @kind,
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
      user_id: existing.user_id ?? userId,
      email: existing.email ?? email,
      kind: nextKind,
      checkout_session_id: existing.checkout_session_id ?? checkoutSessionId,
      payment_intent_id: existing.payment_intent_id ?? paymentIntentId,
      amount_cents: nextAmount,
      currency: existing.currency ?? currency,
      status: mergedStatus(existing.status, input.status),
      description: existing.description ?? description,
      metadata: mergeMetadata(
        existing.metadata,
        input.metadata,
        stripeEventId,
        invoiceId,
      ),
    });
    const updated = db
      .prepare(`SELECT * FROM payments WHERE id = ?`)
      .get(existing.id) as PaymentRow;
    return toAdmin(updated);
  }

  const id = crypto.randomUUID();
  const createdAt = input.createdAt ?? new Date().toISOString();
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
    user_id: userId,
    email,
    kind: input.kind,
    stripe_event_id: stripeEventId,
    checkout_session_id: checkoutSessionId,
    payment_intent_id: paymentIntentId,
    amount_cents: input.amountCents ?? null,
    currency,
    status: input.status,
    description,
    created_at: createdAt,
    metadata: mergeMetadata(null, input.metadata, stripeEventId, invoiceId),
  });

  const created = db
    .prepare(`SELECT * FROM payments WHERE id = ?`)
    .get(id) as PaymentRow;
  return toAdmin(created);
}

export function listPayments(filters: PaymentListFilters = {}): AdminPayment[] {
  const clauses: string[] = [];
  const params: Array<string | number> = [];

  if (filters.kind && isPaymentKind(filters.kind)) {
    clauses.push("kind = ?");
    params.push(filters.kind);
  }
  if (filters.status && isPaymentStatus(filters.status)) {
    clauses.push("status = ?");
    params.push(filters.status);
  }
  const email = filters.email?.trim();
  if (email) {
    clauses.push("email LIKE ? COLLATE NOCASE");
    params.push(`%${email}%`);
  }
  if (filters.userId) {
    clauses.push("user_id = ?");
    params.push(filters.userId);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = Math.min(Math.max(filters.limit ?? 200, 1), 500);
  const rows = getDb()
    .prepare(
      `SELECT * FROM payments ${where}
       ORDER BY datetime(created_at) DESC
       LIMIT ?`,
    )
    .all(...params, limit) as PaymentRow[];
  return rows.map(toAdmin);
}

export function listPaymentsForUser(userId: string, limit = 100): AdminPayment[] {
  return listPayments({ userId, limit });
}

export function paymentRevenueSummary(): PaymentRevenueSummary {
  const db = getDb();
  const succeededCount = (
    db
      .prepare(`SELECT COUNT(*) AS n FROM payments WHERE status = 'succeeded'`)
      .get() as { n: number }
  ).n;
  const byCurrency = db
    .prepare(
      `SELECT LOWER(COALESCE(currency, '')) AS currency,
              COUNT(*) AS n,
              COALESCE(SUM(amount_cents), 0) AS amount_cents
       FROM payments
       WHERE status = 'succeeded'
       GROUP BY LOWER(COALESCE(currency, ''))
       ORDER BY amount_cents DESC`,
    )
    .all() as Array<{ currency: string; n: number; amount_cents: number }>;

  return {
    succeededCount,
    byCurrency: byCurrency
      .filter((row) => row.n > 0)
      .map((row) => ({
        currency: row.currency || "unknown",
        count: row.n,
        amountCents: row.amount_cents,
      })),
  };
}
