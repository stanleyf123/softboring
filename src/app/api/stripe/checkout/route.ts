import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { routing, type AppLocale } from "@/i18n/routing";
import { publicOrigin } from "@/lib/public-origin";
import { getStripe, getStripeConfig, isStripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asLocale(value: unknown): AppLocale {
  if (typeof value === "string" && routing.locales.includes(value as AppLocale)) {
    return value as AppLocale;
  }
  return routing.defaultLocale;
}

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  let interval: "month" | "year" = "month";
  let locale: AppLocale = routing.defaultLocale;
  try {
    const body = (await request.json()) as { interval?: unknown; locale?: unknown };
    if (body.interval === "year") interval = "year";
    locale = asLocale(body.locale);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
  }

  const config = getStripeConfig();
  if (!config) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const priceId = interval === "year" ? config.yearlyPriceId : config.monthlyPriceId;
  if (!priceId) {
    return NextResponse.json({ error: "price_unavailable" }, { status: 400 });
  }

  const origin = publicOrigin(request.url);
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/${locale}/account?checkout=success`,
    cancel_url: `${origin}/${locale}/pricing`,
    client_reference_id: user.id,
    customer: user.stripeCustomerId ?? undefined,
    customer_email: user.stripeCustomerId ? undefined : user.email,
    metadata: { userId: user.id },
    subscription_data: { metadata: { userId: user.id } },
    locale: (locale === "zh-tw" ? "zh-TW" : "en") as "en" | "zh-TW",
    allow_promotion_codes: true,
  });

  if (!session.url) {
    return NextResponse.json({ error: "checkout_failed" }, { status: 502 });
  }

  return NextResponse.json({ url: session.url });
}
