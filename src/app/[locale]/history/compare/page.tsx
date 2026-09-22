import { CompareUpgradeTease, HistoryComparePanel } from "@/components/history-compare";
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
    title: t("historyCompareTitle"),
    description: t("historyCompareDescription"),
    path: "/history/compare",
    noIndex: true,
  });
}

export default async function HistoryComparePage({ params }: Props) {
  const { locale } = await params;
  const appLocale = assertLocale(locale);
  setRequestLocale(appLocale);

  const t = await getTranslations("HistoryCompare");
  const user = await getCurrentUser();
  const softPlus = userIsSoftPlus(user);

  return (
    <div className="pt-6">
      <p className="text-sm">
        <Link href="/history" className="text-muted hover:text-foreground">
          {t("back")}
        </Link>
      </p>
      <p className="mt-6 font-display italic text-accent">{t("eyebrow")}</p>
      <h1 className="mt-2 font-display text-4xl tracking-tight">{t("title")}</h1>
      <p className="mt-4 max-w-lg text-lg leading-relaxed text-muted">{t("lead")}</p>
      <div className="mt-10">
        {user && softPlus ? (
          <HistoryComparePanel />
        ) : (
          <CompareUpgradeTease signedIn={Boolean(user)} />
        )}
      </div>
    </div>
  );
}
