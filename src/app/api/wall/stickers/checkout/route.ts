import { NextResponse } from "next/server";
import { getStickerById, getPackStripePriceId, getStickerStripePriceId } from "@/db/stickers";
import { routing, type AppLocale } from "@/i18n/routing";
import { publicOrigin } from "@/lib/public-origin";
import { getStripe, getStripeConfig, isStripeConfigured } from "@/lib/stripe";
import { getWallViewer, requireSoftPlus } from "@/lib/wall-access";
import { STICKER_PACK_PRICE_CENTS } from "@/lib/wall-canvas";

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

  const viewer = await getWallViewer();
  const plus = requireSoftPlus(viewer.user, viewer.softPlus);
  if (plus) return plus;

  let pack = false;
  let stickerId = "";
  let locale: AppLocale = routing.defaultLocale;
  try {
    const body = (await request.json()) as {
      pack?: unknown;
      stickerId?: unknown;
      locale?: unknown;
    };
    pack = body.pack === true;
    if (typeof body.stickerId === "string") stickerId = body.stickerId.trim();
    locale = asLocale(body.locale);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
  }

  const config = getStripeConfig();
  if (!config) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const origin = publicOrigin(request.url);
  const stripe = getStripe();
  const user = viewer.user!;

  let lineItem: { price: string; quantity: number } | { price_data: object; quantity: number };
  let metadata: Record<string, string>;

  if (pack) {
    const priceId = getPackStripePriceId();
    lineItem = priceId
      ? { price: priceId, quantity: 1 }
      : {
          price_data: {
            currency: "usd",
            unit_amount: STICKER_PACK_PRICE_CENTS,
            product_data: { name: "Soft Wall sticker pack" },
          },
          quantity: 1,
        };
    metadata = { userId: user.id, kind: "sticker_pack" };
  } else {
    const sticker = stickerId ? getStickerById(stickerId) : undefined;
    if (!sticker) {
      return NextResponse.json({ error: "sticker_required" }, { status: 400 });
    }
    const priceId = getStickerStripePriceId(sticker);
    lineItem = priceId
      ? { price: priceId, quantity: 1 }
      : {
          price_data: {
            currency: "usd",
            unit_amount: sticker.price_cents,
            product_data: { name: `Soft Wall sticker · ${sticker.name}` },
          },
          quantity: 1,
        };
    metadata = { userId: user.id, kind: "sticker", stickerId: sticker.id };
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [lineItem as never],
    success_url: `${origin}/${locale}/wall?sticker=success`,
    cancel_url: `${origin}/${locale}/wall`,
    client_reference_id: user.id,
    customer: user.stripeCustomerId ?? undefined,
    customer_email: user.stripeCustomerId ? undefined : user.email,
    metadata,
    locale: (locale === "zh-tw" ? "zh-TW" : "en") as "en" | "zh-TW",
  });

  if (!session.url) {
    return NextResponse.json({ error: "checkout_failed" }, { status: 502 });
  }

  return NextResponse.json({ url: session.url });
}
