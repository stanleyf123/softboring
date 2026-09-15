import { PricingView } from "@/components/pricing-view";
import { getCurrentUser } from "@/lib/auth";
import { isSoftPlusPlan } from "@/lib/plan";
import { getPublicStripePrices } from "@/lib/stripe";
import { assertLocale } from "@/lib/locale";
import { setRequestLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function PricingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(assertLocale(locale));

  const [user, prices] = await Promise.all([getCurrentUser(), getPublicStripePrices()]);
  const softPlus = Boolean(user && isSoftPlusPlan(user.plan, user.planStatus));

  return (
    <PricingView
      prices={prices}
      loggedIn={Boolean(user)}
      softPlus={softPlus}
    />
  );
}
