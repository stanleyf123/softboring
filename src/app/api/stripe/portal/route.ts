import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { publicOrigin } from "@/lib/public-origin";
import { routing, type AppLocale } from "@/i18n/routing";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

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
  if (!user.stripeCustomerId) {
    return NextResponse.json({ error: "no_customer" }, { status: 400 });
  }

  let locale: AppLocale = routing.defaultLocale;
  try {
    const body = (await request.json()) as { locale?: unknown };
    locale = asLocale(body.locale);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
  }

  const origin = publicOrigin(request.url);
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${origin}/${locale}/account`,
  });

  return NextResponse.json({ url: session.url });
}
