import type Stripe from "stripe";
import { planFromStripeStatus } from "@/lib/plan";
import { fulfillStickerOrder } from "@/db/stickers";
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

export function applyCheckoutSession(session: Stripe.Checkout.Session) {
  if (session.mode === "payment") {
    applyStickerCheckout(session);
    return;
  }
  if (session.mode !== "subscription") return;

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
    return;
  }

  const mapped = planFromStripeStatus("active");
  updateUserBilling(user.id, {
    plan: mapped.plan,
    planStatus: mapped.planStatus,
    stripeCustomerId: customerId ?? user.stripeCustomerId,
    stripeSubscriptionId: subscriptionId ?? user.stripeSubscriptionId,
  });
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
