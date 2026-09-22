import { PricingView } from "@/components/pricing-view";
import { getCurrentUser } from "@/lib/auth";
import { userIsSoftPlus } from "@/lib/plan";
import { getPublicStripePrices } from "@/lib/stripe";
import { assertLocale } from "@/lib/locale";
import { pageMetadata } from "@/lib/seo";
import { getTranslations, setRequestLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const appLocale = assertLocale(locale);
  const t = await getTranslations({ locale: appLocale, namespace: "Metadata" });
  return pageMetadata({
    locale: appLocale,
    title: t("pricingTitle"),
    description: t("pricingDescription"),
    path: "/pricing",
  });
}

export default async function PricingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(assertLocale(locale));

  const [user, prices] = await Promise.all([getCurrentUser(), getPublicStripePrices()]);
  const softPlus = userIsSoftPlus(user);

  return (
    <PricingView
      prices={prices}
      loggedIn={Boolean(user)}
      softPlus={softPlus}
    />
  );
}
