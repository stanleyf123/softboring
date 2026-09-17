import { HistoryDetail } from "@/components/history-detail";
import { assertLocale } from "@/lib/locale";
import { pageMetadata } from "@/lib/seo";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const appLocale = assertLocale(locale);
  const t = await getTranslations({ locale: appLocale, namespace: "Metadata" });
  return pageMetadata({
    locale: appLocale,
    title: t("historyDetailTitle"),
    description: t("historyDescription"),
    path: "/history",
    noIndex: true,
  });
}

export default async function HistoryDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(assertLocale(locale));

  return (
    <div className="pt-6">
      <HistoryDetail id={id} />
    </div>
  );
}
