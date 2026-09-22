import { DigestPanel } from "@/components/digest-panel";
import { SoftReportTease } from "@/components/soft-report-section";
import { monthlyDigestForUser } from "@/db/reviews";
import { getDb } from "@/db/client";
import { readMonthlySoftReport } from "@/db/soft-report";
import { ensureUserSettings } from "@/db/user-settings";
import { getCurrentUser } from "@/lib/auth";
import { assertLocale } from "@/lib/locale";
import { userIsSoftPlus } from "@/lib/plan";
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
    title: t("digestTitle"),
    description: t("digestDescription"),
    path: "/digest",
    noIndex: true,
  });
}

export default async function DigestPage({ params }: Props) {
  const { locale } = await params;
  const appLocale = assertLocale(locale);
  setRequestLocale(appLocale);

  const t = await getTranslations("Digest");
  const user = await getCurrentUser();
  const softPlus = userIsSoftPlus(user);
  const settings = user && softPlus ? ensureUserSettings(user.id) : null;
  const now = new Date();

  return (
    <div className="pt-6">
      <p className="font-display italic text-accent">{t("eyebrow")}</p>
      <h1 className="mt-2 font-display text-4xl tracking-tight">{t("title")}</h1>
      <p className="mt-4 max-w-lg text-lg leading-relaxed text-muted">{t("lead")}</p>
      <div className="mt-10">
        {user && softPlus ? (
          <DigestPanel
            digest={monthlyDigestForUser(user.id, now, settings?.timezone)}
            report={readMonthlySoftReport(getDb(), user.id, now, settings?.timezone)}
          />
        ) : (
          <>
            <section className="rounded-[2rem] bg-paper px-8 py-12 shadow-card" data-soft-report="locked">
              <h2 className="font-display text-2xl tracking-tight">{t("lockedTitle")}</h2>
              <p className="mt-3 max-w-md leading-relaxed text-muted">
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
                    href={{ pathname: "/login", query: { next: "/digest" } }}
                    className="rounded-full border border-line px-5 py-2.5 text-sm text-muted"
                  >
                    {t("loginCta")}
                  </Link>
                ) : null}
              </div>
            </section>
            <SoftReportTease signedIn={Boolean(user)} />
          </>
        )}
      </div>
    </div>
  );
}
