import { AccountPanel } from "@/components/account-panel";
import { countReviewsForUser, listReviewsForOwner, monthlyDigestForUser } from "@/db/reviews";
import { ensureUserSettings } from "@/db/user-settings";
import { getCurrentUser } from "@/lib/auth";
import { isEmailConfigured } from "@/lib/email";
import { userIsSoftPlus } from "@/lib/plan";
import { pickSoftMemory } from "@/lib/soft-memory";
import { isStripeConfigured } from "@/lib/stripe";
import { assertLocale } from "@/lib/locale";
import { pageMetadata } from "@/lib/seo";
import { redirect } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ checkout?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const appLocale = assertLocale(locale);
  const t = await getTranslations({ locale: appLocale, namespace: "Metadata" });
  return pageMetadata({
    locale: appLocale,
    title: t("accountTitle"),
    description: t("accountDescription"),
    path: "/account",
    noIndex: true,
  });
}

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
  const softPlus = userIsSoftPlus(user);
  const softMemory = pickSoftMemory(
    listReviewsForOwner({ kind: "user", userId: user.id, guestId: "" }),
    softPlus,
  );

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
          planExpiresAt={user.planExpiresAt}
          softMemory={softMemory}
          stripeConfigured={isStripeConfigured()}
          hasStripeCustomer={Boolean(user.stripeCustomerId)}
          checkoutSuccess={checkout === "success"}
          reminderEnabled={settings.reminderEnabled}
          reminderWeekday={settings.reminderWeekday}
          emailConfigured={isEmailConfigured()}
          customQuestions={settings.customQuestions}
          digest={monthlyDigestForUser(user.id)}
          nickname={user.nickname}
        />
      </div>
    </div>
  );
}
