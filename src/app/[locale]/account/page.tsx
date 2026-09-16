import { AccountPanel } from "@/components/account-panel";
import { countReviewsForUser, monthlyDigestForUser } from "@/db/reviews";
import { ensureUserSettings } from "@/db/user-settings";
import { getCurrentUser } from "@/lib/auth";
import { isEmailConfigured } from "@/lib/email";
import { isSoftPlusPlan } from "@/lib/plan";
import { isStripeConfigured } from "@/lib/stripe";
import { assertLocale } from "@/lib/locale";
import { redirect } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ checkout?: string }>;
};

export default async function AccountPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const appLocale = assertLocale(locale);
  setRequestLocale(appLocale);

  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: "/login", locale: appLocale });
    return;
  }

  const t = await getTranslations("Account");
  const reviewCount = countReviewsForUser(user.id);
  const settings = ensureUserSettings(user.id);
  const { checkout } = await searchParams;
  const softPlus = isSoftPlusPlan(user.plan, user.planStatus);

  return (
    <div className="pt-6">
      <h1 className="font-display text-4xl tracking-tight">{t("title")}</h1>
      <p className="mt-4 max-w-lg text-lg leading-relaxed text-muted">{t("lead")}</p>
      <div className="mt-10 max-w-2xl lg:max-w-none">
        <AccountPanel
          email={user.email}
          createdAt={user.createdAt}
          reviewCount={reviewCount}
          softPlus={softPlus}
          stripeConfigured={isStripeConfigured()}
          hasStripeCustomer={Boolean(user.stripeCustomerId)}
          checkoutSuccess={checkout === "success"}
          reminderEnabled={settings.reminderEnabled}
          reminderWeekday={settings.reminderWeekday}
          emailConfigured={isEmailConfigured()}
          customQuestions={settings.customQuestions}
          digest={monthlyDigestForUser(user.id)}
        />
      </div>
    </div>
  );
}
