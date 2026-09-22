import { WallActivityStrip } from "@/components/wall-activity-strip";
import { getCurrentUser } from "@/lib/auth";
import { assertLocale } from "@/lib/locale";
import { isSoftPlusPlan } from "@/lib/plan";
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
    title: t("wallActivityTitle"),
    description: t("wallActivityDescription"),
    path: "/wall/activity",
    noIndex: true,
  });
}

export default async function WallActivityPage({ params }: Props) {
  const { locale } = await params;
  const appLocale = assertLocale(locale);
  setRequestLocale(appLocale);

  const t = await getTranslations("WallActivity");
  const user = await getCurrentUser();
  const softPlus = Boolean(user && isSoftPlusPlan(user.plan, user.planStatus));

  return (
    <div className="pt-6">
      <p className="font-display italic text-accent">{t("eyebrow")}</p>
      <h1 className="mt-2 font-display text-4xl tracking-tight">{t("pageTitle")}</h1>
      <p className="mt-4 max-w-lg text-lg leading-relaxed text-muted">{t("pageLead")}</p>
      <div className="mt-10 space-y-6">
        {softPlus ? (
          <WallActivityStrip softPlus />
        ) : (
          <section className="rounded-[2rem] bg-paper px-8 py-12 shadow-card">
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
                  href={{ pathname: "/login", query: { next: "/wall/activity" } }}
                  className="rounded-full border border-line px-5 py-2.5 text-sm text-muted"
                >
                  {t("loginCta")}
                </Link>
              ) : null}
            </div>
          </section>
        )}
        <Link
          href="/wall"
          className="inline-flex rounded-full border border-line px-5 py-2.5 text-sm text-muted"
        >
          {t("backToWall")}
        </Link>
      </div>
    </div>
  );
}
