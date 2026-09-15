import { NextResponse } from "next/server";
import { applyCheckoutSession, applySubscription } from "@/lib/billing";
import { getStripe, getStripeConfig } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const config = getStripeConfig();
  if (!config) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  const payload = await request.text();
  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      payload,
      signature,
      config.webhookSecret,
    );
  } catch (error) {
    console.error("Stripe webhook signature failed", error);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        applyCheckoutSession(event.data.object);
        break;
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        applySubscription(event.data.object);
        break;
      default:
        break;
    }
  } catch (error) {
    console.error("Stripe webhook handler failed", error);
    return NextResponse.json({ error: "handler_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
