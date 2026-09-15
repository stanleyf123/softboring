import type Stripe from "stripe";
import { planFromStripeStatus } from "@/lib/plan";
import { fulfillStickerOrder } from "@/db/stickers";
import { upsertPayment, type PaymentKind, type PaymentStatus } from "@/db/payments";
import {
  getUserById,
  getUserByStripeCustomerId,
  getUserByStripeSubscriptionId,
  updateUserBilling,
  type PublicUser,
} from "@/db/users";

function asId(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id;
    if (typeof id === "string" && id.length > 0) return id;
  }
  return null;
}

function unixToIso(seconds: number | null | undefined) {
  if (seconds == null || !Number.isFinite(seconds)) {
    return new Date().toISOString();
  }
  return new Date(seconds * 1000).toISOString();
}

function findUserForStripe(input: {
  userId?: string | null;
  customerId?: string | null;
  subscriptionId?: string | null;
}): PublicUser | undefined {
  if (input.userId) {
    const user = getUserById(input.userId);
    if (user) return user;
  }
  if (input.subscriptionId) {
    const user = getUserByStripeSubscriptionId(input.subscriptionId);
    if (user) return user;
  }
  if (input.customerId) {
    const user = getUserByStripeCustomerId(input.customerId);
    if (user) return user;
  }
  return undefined;
}

function metadataUserId(metadata: Stripe.Metadata | null | undefined) {
  const value = metadata?.userId?.trim();
  return value ? value : null;
}

function checkoutKind(session: Stripe.Checkout.Session): PaymentKind {
  if (session.mode === "subscription") return "subscription";
  const kind = session.metadata?.kind;
  if (kind === "sticker" || kind === "sticker_pack") return "sticker";
  return "other";
}

function checkoutDescription(session: Stripe.Checkout.Session) {
  if (session.mode === "subscription") return "Soft+ subscription";
  const kind = session.metadata?.kind;
  if (kind === "sticker_pack") return "Soft Wall sticker pack";
  if (kind === "sticker") {
    const stickerId = session.metadata?.stickerId?.trim();
    return stickerId ? `Soft Wall sticker · ${stickerId}` : "Soft Wall sticker";
  }
  return "Checkout payment";
}

function checkoutStatus(session: Stripe.Checkout.Session): PaymentStatus {
  if (session.payment_status === "paid") return "succeeded";
  if (session.payment_status === "no_payment_required") return "succeeded";
  if (session.payment_status === "unpaid") return "pending";
  return "pending";
}

function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const fromParent = asId(invoice.parent?.subscription_details?.subscription);
  if (fromParent) return fromParent;
  const legacy = invoice as Stripe.Invoice & { subscription?: unknown };
  return asId(legacy.subscription);
}

function invoicePaymentIntentId(invoice: Stripe.Invoice): string | null {
  const payments = invoice.payments?.data;
  if (Array.isArray(payments)) {
    for (const item of payments) {
      const payment = item as {
        payment?: { payment_intent?: unknown; type?: string };
        payment_intent?: unknown;
      };
      const nested = asId(payment.payment?.payment_intent) ?? asId(payment.payment_intent);
      if (nested) return nested;
    }
  }
  const legacy = invoice as Stripe.Invoice & { payment_intent?: unknown };
  return asId(legacy.payment_intent);
}

function invoiceKind(invoice: Stripe.Invoice): PaymentKind {
  const reason = invoice.billing_reason ?? "";
  if (reason.startsWith("subscription") || invoice.parent?.type === "subscription_details") {
    return "subscription";
  }
  return "other";
}

export function recordCheckoutPayment(
  session: Stripe.Checkout.Session,
  eventId?: string | null,
) {
  const userId =
    metadataUserId(session.metadata) ||
    (typeof session.client_reference_id === "string"
      ? session.client_reference_id
      : null);
  const customerId = asId(session.customer);
  const subscriptionId = asId(session.subscription);
  const user = findUserForStripe({ userId, customerId, subscriptionId });
  const email =
    session.customer_details?.email?.trim() ||
    session.customer_email?.trim() ||
    user?.email ||
    null;

  upsertPayment({
    userId: user?.id ?? userId,
    email,
    kind: checkoutKind(session),
    stripeEventId: eventId,
    checkoutSessionId: session.id,
    paymentIntentId: asId(session.payment_intent),
    invoiceId: asId(session.invoice),
    amountCents: session.amount_total,
    currency: session.currency,
    status: checkoutStatus(session),
    description: checkoutDescription(session),
    createdAt: unixToIso(session.created),
    metadata: {
      mode: session.mode,
      paymentStatus: session.payment_status,
      subscriptionId,
      customerId,
      stickerId: session.metadata?.stickerId ?? null,
      stickerKind: session.metadata?.kind ?? null,
    },
  });
}

export function recordInvoicePayment(
  invoice: Stripe.Invoice,
  eventId: string | null | undefined,
  status: Extract<PaymentStatus, "succeeded" | "failed">,
) {
  const customerId = asId(invoice.customer);
  const subscriptionId = invoiceSubscriptionId(invoice);
  const userId = metadataUserId(invoice.metadata);
  const user = findUserForStripe({ userId, customerId, subscriptionId });
  const amountCents =
    status === "succeeded" ? invoice.amount_paid : invoice.amount_due;
  const description =
    status === "failed"
      ? invoice.number
        ? `Invoice ${invoice.number} failed`
        : "Soft+ invoice failed"
      : invoice.number
        ? `Invoice ${invoice.number}`
        : invoice.billing_reason === "subscription_cycle"
          ? "Soft+ renewal"
          : "Soft+ invoice";

  upsertPayment({
    userId: user?.id ?? userId,
    email: invoice.customer_email?.trim() || user?.email || null,
    kind: invoiceKind(invoice),
    stripeEventId: eventId,
    paymentIntentId: invoicePaymentIntentId(invoice),
    invoiceId: invoice.id,
    amountCents,
    currency: invoice.currency,
    status,
    description,
    createdAt: unixToIso(invoice.created),
    metadata: {
      invoiceId: invoice.id,
      billingReason: invoice.billing_reason,
      invoiceStatus: invoice.status,
      subscriptionId,
      customerId,
    },
  });
}

export function recordChargeRefunded(
  charge: Stripe.Charge,
  eventId?: string | null,
) {
  const customerId = asId(charge.customer);
  const user = findUserForStripe({ customerId });
  const fullyRefunded = charge.refunded === true;
  upsertPayment({
    userId: user?.id ?? null,
    email: charge.billing_details?.email?.trim() || user?.email || null,
    kind: "other",
    stripeEventId: eventId,
    paymentIntentId: asId(charge.payment_intent),
    amountCents: charge.amount,
    currency: charge.currency,
    status: fullyRefunded ? "refunded" : "succeeded",
    description: fullyRefunded ? "Refund" : "Partial refund",
    createdAt: unixToIso(charge.created),
    metadata: {
      chargeId: charge.id,
      amountRefunded: charge.amount_refunded,
      fullyRefunded,
    },
  });
}

export function applyStickerCheckout(session: Stripe.Checkout.Session) {
  if (session.mode !== "payment") return;
  const kind = session.metadata?.kind;
  if (kind !== "sticker" && kind !== "sticker_pack") return;
  if (session.payment_status && session.payment_status !== "paid") return;

  const userId =
    metadataUserId(session.metadata) ||
    (typeof session.client_reference_id === "string"
      ? session.client_reference_id
      : null);
  const customerId = asId(session.customer);
  const user = findUserForStripe({ userId, customerId });
  if (!user) {
    console.error("Stripe sticker checkout: no matching user", {
      userId,
      customerId,
      sessionId: session.id,
    });
    return;
  }

  fulfillStickerOrder({
    sessionId: session.id,
    userId: user.id,
    kind,
    stickerId: session.metadata?.stickerId?.trim() || null,
  });
}

export function applyCheckoutSession(
  session: Stripe.Checkout.Session,
  eventId?: string | null,
) {
  if (session.mode === "payment") {
    applyStickerCheckout(session);
    recordCheckoutPayment(session, eventId);
    return;
  }
  if (session.mode !== "subscription") {
    recordCheckoutPayment(session, eventId);
    return;
  }

  const userId =
    metadataUserId(session.metadata) ||
    (typeof session.client_reference_id === "string"
      ? session.client_reference_id
      : null);
  const customerId = asId(session.customer);
  const subscriptionId = asId(session.subscription);
  const user = findUserForStripe({ userId, customerId, subscriptionId });
  if (!user) {
    console.error("Stripe checkout.session.completed: no matching user", {
      userId,
      customerId,
      subscriptionId,
    });
    recordCheckoutPayment(session, eventId);
    return;
  }

  const mapped = planFromStripeStatus("active");
  updateUserBilling(user.id, {
    plan: mapped.plan,
    planStatus: mapped.planStatus,
    stripeCustomerId: customerId ?? user.stripeCustomerId,
    stripeSubscriptionId: subscriptionId ?? user.stripeSubscriptionId,
  });
  recordCheckoutPayment(session, eventId);
}

export function applySubscription(subscription: Stripe.Subscription) {
  const customerId = asId(subscription.customer);
  const userId = metadataUserId(subscription.metadata);
  const user = findUserForStripe({
    userId,
    customerId,
    subscriptionId: subscription.id,
  });
  if (!user) {
    console.error("Stripe subscription event: no matching user", {
      userId,
      customerId,
      subscriptionId: subscription.id,
    });
    return;
  }

  const mapped = planFromStripeStatus(subscription.status);
  const priceId = subscription.items.data[0]?.price?.id ?? null;
  updateUserBilling(user.id, {
    plan: mapped.plan,
    planStatus: mapped.planStatus,
    stripeCustomerId: customerId ?? user.stripeCustomerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
  });
}

export function applyInvoicePaid(invoice: Stripe.Invoice, eventId?: string | null) {
  if (invoice.status && invoice.status !== "paid") return;
  recordInvoicePayment(invoice, eventId, "succeeded");
}

export function applyInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  eventId?: string | null,
) {
  recordInvoicePayment(invoice, eventId, "failed");
}

export function applyChargeRefunded(charge: Stripe.Charge, eventId?: string | null) {
  recordChargeRefunded(charge, eventId);
}
