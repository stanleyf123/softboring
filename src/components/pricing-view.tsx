import { getTranslations } from "next-intl/server";
import { CheckoutButtons, PaymentsNotice } from "./billing-buttons";
import { EnvelopeDoodle, TeacupDoodle } from "./soft-doodles";

type PriceView = {
  configured: boolean;
  monthly: { formatted: string } | null;
  yearly: { formatted: string } | null;
};

export async function PricingView({
  prices,
  loggedIn,
  softPlus,
}: {
  prices: PriceView;
  loggedIn: boolean;
  softPlus: boolean;
}) {
  const t = await getTranslations("Pricing");

  return (
    <div className="pt-4">
      <p className="font-display italic text-accent">{t("eyebrow")}</p>
      <h1
        id="pricing-title"
        className="mt-3 font-display text-4xl leading-tight tracking-tight md:text-5xl"
      >
        {t("title")}
      </h1>
      <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted">{t("lead")}</p>

      <div className="mt-12 grid gap-5 md:grid-cols-2">
        <article className="relative overflow-hidden rounded-[2rem] bg-paper px-6 py-8 shadow-card sm:px-8">
          <div className="absolute -right-2 top-4 w-24 opacity-90">
            <TeacupDoodle />
          </div>
          <p className="rounded-full bg-peach px-3 py-1 text-sm w-fit">{t("freeTag")}</p>
          <h2 className="mt-4 font-display text-3xl tracking-tight">{t("freeName")}</h2>
          <p className="mt-2 text-muted">{t("freePrice")}</p>
          <ul className="mt-6 space-y-3 text-sm leading-relaxed">
            <li>{t("featureWrite")}</li>
            <li>{t("featureHistoryFree")}</li>
            <li className="text-muted">{t("featureHistoryLocked")}</li>
            <li className="text-muted">{t("featureTrendsFree")}</li>
            <li className="text-muted">{t("featureSearchFree")}</li>
            <li className="text-muted">{t("featureCustomFree")}</li>
            <li className="text-muted">{t("featureWallFree")}</li>
            <li className="text-muted">{t("featureStickersFree")}</li>
            <li className="text-muted">{t("featureExportFree")}</li>
            <li className="text-muted">{t("featureDigestFree")}</li>
          </ul>
          <p className="mt-8 text-sm leading-relaxed text-muted">{t("freeToPlus")}</p>
        </article>

        <article className="relative overflow-hidden rounded-[2rem] bg-mint/70 px-6 py-8 shadow-card sm:px-8">
          <div className="absolute -right-1 top-3 w-24 opacity-90">
            <EnvelopeDoodle />
          </div>
          <p className="rounded-full bg-paper/80 px-3 py-1 text-sm w-fit">{t("plusTag")}</p>
          <h2 className="mt-4 font-display text-3xl tracking-tight">{t("plusName")}</h2>
          <p className="mt-2 text-muted">
            {prices.monthly
              ? t("plusPrice", { price: prices.monthly.formatted })
              : t("plusPriceFallback")}
            {prices.yearly
              ? ` · ${t("plusYearly", { price: prices.yearly.formatted })}`
              : ""}
          </p>
          <ul className="mt-6 space-y-3 text-sm leading-relaxed">
            <li>{t("featureWrite")}</li>
            <li>{t("featureHistoryPlus")}</li>
            <li>{t("featureTrendsPlus")}</li>
            <li>{t("featureSearchPlus")}</li>
            <li>{t("featureCustomPlus")}</li>
            <li>{t("featureWallPlus")}</li>
            <li>{t("featureStickersPlus")}</li>
            <li>{t("featureExportPlus")}</li>
            <li>{t("featureDigestPlus")}</li>
            <li>{t("featureBadgePlus")}</li>
            <li>{t("featurePortal")}</li>
          </ul>
          <p className="mt-6 text-sm leading-relaxed">{t("upgradeHint")}</p>
          <div className="mt-8">
            <CheckoutButtons
              configured={prices.configured}
              loggedIn={loggedIn}
              softPlus={softPlus}
              yearlyAvailable={Boolean(prices.yearly)}
              monthlyLabel={prices.monthly?.formatted ?? null}
              yearlyLabel={prices.yearly?.formatted ?? null}
            />
          </div>
        </article>
      </div>

      {!prices.configured && !loggedIn ? (
        <div className="mt-8">
          <PaymentsNotice />
        </div>
      ) : null}

      <p className="mt-10 max-w-lg text-sm leading-relaxed text-muted">{t("trustNote")}</p>
      {!loggedIn ? (
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted">
          {t("loggedOutHint")}
        </p>
      ) : null}
      {prices.configured && !prices.yearly ? (
        <p className="mt-4 text-sm text-muted">{t("yearlyOptional")}</p>
      ) : null}
    </div>
  );
}
