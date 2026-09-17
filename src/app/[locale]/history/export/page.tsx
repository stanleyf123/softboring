import { ExportPrintView } from "@/components/export-print-view";
import { listReviewsForOwner } from "@/db/reviews";
import { getCurrentUser } from "@/lib/auth";
import { assertLocale } from "@/lib/locale";
import { isSoftPlusPlan } from "@/lib/plan";
import { pageMetadata } from "@/lib/seo";
import { Link, redirect } from "@/i18n/navigation";
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
    title: t("exportTitle"),
    description: t("exportDescription"),
    path: "/history/export",
    noIndex: true,
  });
}

export default async function HistoryExportPage({ params }: Props) {
  const { locale } = await params;
  const appLocale = assertLocale(locale);
  setRequestLocale(appLocale);

  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: "/login", locale: appLocale });
    return;
  }
  if (!isSoftPlusPlan(user.plan, user.planStatus)) {
    redirect({ href: "/pricing", locale: appLocale });
    return;
  }

  const t = await getTranslations("Export");
  const reviews = listReviewsForOwner({
    kind: "user",
    userId: user.id,
    guestId: "",
  });

  return (
    <div className="pt-6 print:pt-0">
      <div className="print:hidden">
        <p className="text-sm">
          <Link href="/history" className="text-muted hover:text-foreground">
            {t("back")}
          </Link>
        </p>
        <h1 className="mt-4 font-display text-4xl tracking-tight">{t("title")}</h1>
        <p className="mt-4 max-w-lg text-lg leading-relaxed text-muted">{t("lead")}</p>
        <a
          href="/api/reviews/export"
          className="mt-6 inline-flex rounded-full bg-mint px-5 py-2.5 text-sm shadow-card"
        >
          {t("csv")}
        </a>
      </div>
      <div className="mt-8">
        <ExportPrintView reviews={reviews} />
      </div>
    </div>
  );
}
