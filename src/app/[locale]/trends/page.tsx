import { TrendsPanel } from "@/components/trends-panel";
import { getCurrentUser } from "@/lib/auth";
import { userIsSoftPlus } from "@/lib/plan";
import { assertLocale } from "@/lib/locale";
import { pageMetadata } from "@/lib/seo";
import { Link } from "@/i18n/navigation";
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
    title: t("trendsTitle"),
    description: t("trendsDescription"),
    path: "/trends",
    noIndex: true,
  });
}

export default async function TrendsPage({ params }: Props) {
  const { locale } = await params;
  const appLocale = assertLocale(locale);
  setRequestLocale(appLocale);

  const t = await getTranslations("Trends");
  const user = await getCurrentUser();
  const softPlus = userIsSoftPlus(user);

  return (
    <div className="pt-6">
      <h1 className="font-display text-4xl tracking-tight">{t("title")}</h1>
      <p className="mt-4 max-w-lg text-lg leading-relaxed text-muted">{t("lead")}</p>
      <div className="mt-10">
        {user && softPlus ? (
          <TrendsPanel />
        ) : (
          <section className="rounded-[2rem] bg-paper px-8 py-12 shadow-card">
            <h2 className="font-display text-2xl tracking-tight">{t("lockedTitle")}</h2>
            <p className="mt-3 max-w-md text-muted leading-relaxed">
              {user ? t("lockedBody") : t("signedOutBody")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/pricing"
                className="rounded-full bg-accent px-5 py-2.5 text-sm text-paper shadow-card"
              >
                {t("lockedCta")}
              </Link>
              {!user ? (
                <Link
                  href={{ pathname: "/login", query: { next: "/trends" } }}
                  className="rounded-full border border-line px-5 py-2.5 text-sm text-muted"
                >
                  {t("loginCta")}
                </Link>
              ) : null}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
