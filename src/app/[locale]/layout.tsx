import { GoogleAnalytics } from "@/components/google-analytics";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { OnboardingCard } from "@/components/onboarding-card";
import { PwaInstallTip } from "@/components/pwa-install-tip";
import { PwaRegister } from "@/components/pwa-register";
import { QuietWritingExit, QuietWritingSync } from "@/components/quiet-writing";
import { SoftShortcutsHelp } from "@/components/soft-shortcuts-help";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getInviteCodeForUser } from "@/db/invites";
import { countUnreadNotifications } from "@/db/notifications";
import { countReviewsForUser } from "@/db/reviews";
import { ensureUserSettings } from "@/db/user-settings";
import { routing } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/auth";
import { userIsSoftPlus } from "@/lib/plan";
import { assertLocale, htmlLang } from "@/lib/locale";
import { SiteJsonLd } from "@/components/json-ld";
import { DEFAULT_SITE_URL, localeOg, SITE_NAME, siteOrigin, verificationMetadata } from "@/lib/seo";
import { SITE_SHELL_CLASS } from "@/lib/site-shell";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Fraunces, Nunito } from "next/font/google";
import type { ReactNode } from "react";
import type { Viewport } from "next";

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
  const appLocale = assertLocale(locale);
  const t = await getTranslations({
    locale: appLocale,
    namespace: "Metadata",
  });
  const origin = siteOrigin();

  return {
    metadataBase: new URL(origin || DEFAULT_SITE_URL),
    title: t("title"),
    description: t("description"),
    ...verificationMetadata(),
    openGraph: {
      siteName: SITE_NAME,
      locale: localeOg(appLocale),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
    },
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    },
    appleWebApp: {
      capable: true,
      title: "Soft Boring",
      statusBarStyle: "default",
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#c47f6e",
};

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
  const softPlus = userIsSoftPlus(user);
  const hasInvite = softPlus && user ? Boolean(getInviteCodeForUser(user.id)) : false;
  const tNav = await getTranslations("Nav");

  return (
    <html
      lang={htmlLang(locale)}
      className={`${nunito.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <SiteJsonLd />
        <NextIntlClientProvider>
          <QuietWritingSync />
          <QuietWritingExit />
          <SoftShortcutsHelp />
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-paper focus:px-4 focus:py-2 focus:shadow-card"
          >
            {tNav("skipToContent")}
          </a>
          <SiteHeader
            email={user?.email ?? null}
            softPlus={softPlus}
            unreadNotifications={unreadNotifications}
          />
          <MobileBottomNav email={user?.email ?? null} />
          <PwaInstallTip />
          {user && settings ? (
            <OnboardingCard
              reviewCount={reviewCount}
              historySeen={settings.onboardingHistorySeen}
              wallSeen={settings.onboardingWallSeen}
              dismissed={settings.onboardingDismissed}
              softPlus={softPlus}
              hasNickname={Boolean(user.nickname?.trim())}
              hasInvite={hasInvite}
            />
          ) : null}
          <main
            id="main-content"
            className={`${SITE_SHELL_CLASS} flex-1 pb-28 md:pb-16`}
          >
            {children}
          </main>
          <SiteFooter />
        </NextIntlClientProvider>
        <PwaRegister />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
