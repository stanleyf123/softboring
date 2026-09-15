import Stripe from "stripe";

export type StripeConfig = {
  secretKey: string;
  webhookSecret: string;
  monthlyPriceId: string;
  yearlyPriceId: string | null;
  publishableKey: string | null;
};

function readEnv(name: string) {
  return process.env[name]?.trim() || "";
}

export function getStripeConfig(): StripeConfig | null {
  const secretKey = readEnv("STRIPE_SECRET_KEY");
  const webhookSecret = readEnv("STRIPE_WEBHOOK_SECRET");
  const monthlyPriceId = readEnv("STRIPE_PRICE_MONTHLY");
  const yearlyRaw = readEnv("STRIPE_PRICE_YEARLY");
  const publishableRaw = readEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");

  if (!secretKey || !webhookSecret || !monthlyPriceId) {
    return null;
  }

  return {
    secretKey,
    webhookSecret,
    monthlyPriceId,
    yearlyPriceId: yearlyRaw || null,
    publishableKey: publishableRaw || null,
  };
}

export function isStripeConfigured() {
  return getStripeConfig() !== null;
}

export function formatOneTimeCents(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  const config = getStripeConfig();
  if (!config) {
    throw new Error("Stripe is not configured");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(config.secretKey);
  }
  return stripeClient;
}

export type PublicPrice = {
  id: string;
  interval: "month" | "year";
  formatted: string;
};

function formatStripePrice(price: Stripe.Price): PublicPrice | null {
  if (price.unit_amount == null || !price.currency) return null;
  const interval = price.recurring?.interval;
  if (interval !== "month" && interval !== "year") return null;

  const formatted = new Intl.NumberFormat("en", {
    style: "currency",
    currency: price.currency.toUpperCase(),
    maximumFractionDigits: price.unit_amount % 100 === 0 ? 0 : 2,
  }).format(price.unit_amount / 100);

  return {
    id: price.id,
    interval: interval === "year" ? "year" : "month",
    formatted,
  };
}

export async function getPublicStripePrices(): Promise<{
  configured: boolean;
  monthly: PublicPrice | null;
  yearly: PublicPrice | null;
}> {
  const config = getStripeConfig();
  if (!config) {
    return { configured: false, monthly: null, yearly: null };
  }

  try {
    const stripe = getStripe();
    const monthlyPrice = await stripe.prices.retrieve(config.monthlyPriceId);
    const yearlyPrice = config.yearlyPriceId
      ? await stripe.prices.retrieve(config.yearlyPriceId)
      : null;

    return {
      configured: true,
      monthly: formatStripePrice(monthlyPrice),
      yearly: yearlyPrice ? formatStripePrice(yearlyPrice) : null,
    };
  } catch (error) {
    console.error("Stripe price lookup failed", error);
    return { configured: false, monthly: null, yearly: null };
  }
}
