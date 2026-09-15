import { GoogleAnalytics } from "@/components/google-analytics";
import { OnboardingCard } from "@/components/onboarding-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { countUnreadNotifications } from "@/db/notifications";
import { countReviewsForUser } from "@/db/reviews";
import { ensureUserSettings } from "@/db/user-settings";
import { routing } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/auth";
import { isSoftPlusPlan } from "@/lib/plan";
import { assertLocale, htmlLang } from "@/lib/locale";
import { pageMetadata } from "@/lib/seo";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Fraunces, Nunito } from "next/font/google";
import type { ReactNode } from "react";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display-face",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({
    locale: assertLocale(locale),
    namespace: "Metadata",
  });

  return {
    ...pageMetadata({
      locale: assertLocale(locale),
      title: t("title"),
      description: t("description"),
      path: "/",
    }),
  };
}

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale: localeParam } = await params;
  const locale = assertLocale(localeParam);
  setRequestLocale(locale);
  const user = await getCurrentUser();
  const settings = user ? ensureUserSettings(user.id) : null;
  const unreadNotifications = user ? countUnreadNotifications(user.id) : 0;
  const reviewCount = user ? countReviewsForUser(user.id) : 0;

  return (
    <html
      lang={htmlLang(locale)}
      className={`${nunito.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <NextIntlClientProvider>
          <SiteHeader
            email={user?.email ?? null}
            softPlus={Boolean(user && isSoftPlusPlan(user.plan, user.planStatus))}
            unreadNotifications={unreadNotifications}
          />
          {user && settings ? (
            <OnboardingCard
              reviewCount={reviewCount}
              historySeen={settings.onboardingHistorySeen}
              wallSeen={settings.onboardingWallSeen}
              dismissed={settings.onboardingDismissed}
            />
          ) : null}
          <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-16">
            {children}
          </main>
          <SiteFooter />
        </NextIntlClientProvider>
        <GoogleAnalytics />
      </body>
    </html>
  );
}
