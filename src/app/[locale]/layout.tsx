import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { routing } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/auth";
import { isSoftPlusPlan } from "@/lib/plan";
import { assertLocale, htmlLang } from "@/lib/locale";
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
    title: t("title"),
    description: t("description"),
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
          />
          <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-16">
            {children}
          </main>
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
